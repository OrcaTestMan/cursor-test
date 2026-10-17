import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, ne } from 'drizzle-orm';
import { userColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { sessions, users } from '../db/schema.js';
import { SettingsService } from '../settings/settings.service.js';
import type { AuthUser } from './auth.types.js';
import { ChangePasswordDto, LoginDto, SignupDto } from './dto/auth.dto.js';
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './password.js';
import { SESSION_TTL_MS } from './session-cookie.js';

export type AuthResult = { user: AuthUser; token: string };

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureAdmin();
  }

  private async ensureAdmin() {
    const db = this.dbService.db;
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);
    if (admin) {
      return;
    }
    const username = this.configService.get<string>('ADMIN_USERNAME');
    const password = this.configService.get<string>('ADMIN_PASSWORD');
    if (!username || !password) {
      return;
    }
    const [created] = await db
      .insert(users)
      .values({
        username,
        nickname: '관리자',
        passwordHash: await hashPassword(password),
        role: 'admin',
      })
      .onConflictDoNothing()
      .returning({ id: users.id });
    if (created) {
      this.logger.log(`첫 관리자 계정(${username})을 만들었습니다.`);
    }
  }

  async signup(dto: SignupDto): Promise<AuthResult> {
    const db = this.dbService.db;
    const settings = await this.settingsService.get();
    if (!settings.signupEnabled) {
      throw new ForbiddenException('현재 회원가입을 받지 않습니다.');
    }
    await this.assertAvailable(dto.username, dto.nickname);

    const [user] = await db
      .insert(users)
      .values({
        username: dto.username,
        nickname: dto.nickname,
        passwordHash: await hashPassword(dto.password),
        lastLoginAt: new Date(),
      })
      .onConflictDoNothing()
      .returning(userColumns);
    if (!user) {
      await this.assertAvailable(dto.username, dto.nickname);
      throw new ConflictException('이미 사용 중인 아이디 또는 닉네임입니다.');
    }
    const token = await this.createSession(user.id);
    return { user, token };
  }

  private async assertAvailable(username: string, nickname: string) {
    const db = this.dbService.db;
    const [byUsername] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username));
    if (byUsername) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }
    const [byNickname] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.nickname, nickname));
    if (byNickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const db = this.dbService.db;
    const [row] = await db
      .select({
        user: userColumns,
        passwordHash: users.passwordHash,
        blockedReason: users.blockedReason,
      })
      .from(users)
      .where(eq(users.username, dto.username));
    if (!row || !(await verifyPassword(dto.password, row.passwordHash))) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 맞지 않습니다.');
    }
    if (row.user.status === 'blocked') {
      const reason = row.blockedReason?.trim();
      throw new ForbiddenException(
        reason
          ? `이용이 제한된 계정입니다. 사유: ${reason}`
          : '이용이 제한된 계정입니다.',
      );
    }
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, row.user.id));
    const token = await this.createSession(row.user.id);
    return { user: row.user, token };
  }

  async logout(token: string | undefined) {
    if (!token) {
      return;
    }
    await this.dbService.db
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashSessionToken(token)));
  }

  async resolveSession(token: string): Promise<AuthUser | null> {
    const db = this.dbService.db;
    const tokenHash = hashSessionToken(token);
    const [row] = await db
      .select({ user: userColumns, expiresAt: sessions.expiresAt })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.tokenHash, tokenHash));
    if (!row) {
      return null;
    }
    if (row.expiresAt.getTime() <= Date.now() || row.user.status !== 'active') {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
      return null;
    }
    return row.user;
  }

  async changePassword(
    user: AuthUser,
    currentToken: string | undefined,
    dto: ChangePasswordDto,
  ) {
    const db = this.dbService.db;
    const [row] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id));
    if (!row || !(await verifyPassword(dto.currentPassword, row.passwordHash))) {
      throw new BadRequestException('현재 비밀번호가 맞지 않습니다.');
    }
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(dto.newPassword) })
      .where(eq(users.id, user.id));
    const keep = currentToken ? hashSessionToken(currentToken) : '';
    await db
      .delete(sessions)
      .where(and(eq(sessions.userId, user.id), ne(sessions.tokenHash, keep)));
  }

  private async createSession(userId: number): Promise<string> {
    const token = createSessionToken();
    await this.dbService.db.insert(sessions).values({
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return token;
  }
}
