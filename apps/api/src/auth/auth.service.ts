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
import { formatKst } from '../common/kst.js';
import { DbService } from '../db/db.service.js';
import { sessions, users } from '../db/schema.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { AuthUser } from './auth.types.js';
import {
  ChangeNicknameDto,
  ChangePasswordDto,
  LoginDto,
  SignupDto,
  WithdrawDto,
} from './dto/auth.dto.js';
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './password.js';
import { SESSION_TTL_MS } from './session-cookie.js';
import {
  DELETED_NICKNAME_PREFIX,
  DELETED_USERNAME_PREFIX,
  publicUserColumns,
} from './user-columns.js';

export type AuthResult = { user: AuthUser; token: string };

const LOGIN_FAILED = '아이디 또는 비밀번호가 맞지 않습니다.';
const NICKNAME_TAKEN = '이미 사용 중인 닉네임입니다.';
const DAY_MS = 24 * 60 * 60 * 1000;
const NICKNAME_CHANGE_DAYS = 30;

type BlockInfo = {
  status: AuthUser['status'];
  blockedReason: string | null;
  blockedUntil: Date | null;
};

export function isBlockExpired(user: BlockInfo, now = new Date()) {
  return (
    user.status === 'blocked' &&
    user.blockedUntil !== null &&
    user.blockedUntil.getTime() <= now.getTime()
  );
}

export function blockedMessage(user: BlockInfo) {
  const reason = user.blockedReason?.trim();
  const until = user.blockedUntil
    ? ` (${formatKst(user.blockedUntil)}까지)`
    : '';
  return reason
    ? `이용이 제한된 계정입니다. 사유: ${reason}${until}`
    : `이용이 제한된 계정입니다.${until}`;
}

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
    private readonly moderationService: ModerationService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureAdmin();
    await this.ensureTestUser();
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

  private async ensureTestUser() {
    const db = this.dbService.db;
    const username = 'test';
    const passwordHash = await hashPassword('test');
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (existing) {
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, existing.id));
      return;
    }
    for (const nickname of ['테스트', 'test', '테스트계정'] as const) {
      const [created] = await db
        .insert(users)
        .values({ username, nickname, passwordHash })
        .onConflictDoNothing()
        .returning({ id: users.id });
      if (created) {
        this.logger.log('테스트 계정(test)을 만들었습니다.');
        return;
      }
    }
    this.logger.warn('테스트 계정(test)을 만들지 못했습니다.');
  }

  private async assertNicknameAllowed(nickname: string) {
    if (nickname.startsWith(DELETED_NICKNAME_PREFIX)) {
      throw new BadRequestException('사용할 수 없는 닉네임입니다.');
    }
    await this.moderationService.assertClean(nickname);
  }

  async signup(dto: SignupDto): Promise<AuthResult> {
    const db = this.dbService.db;
    const settings = await this.settingsService.get();
    if (!settings.signupEnabled) {
      throw new ForbiddenException('현재 회원가입을 받지 않습니다.');
    }
    if (dto.username.startsWith(DELETED_USERNAME_PREFIX)) {
      throw new BadRequestException('사용할 수 없는 아이디입니다.');
    }
    await this.moderationService.assertClean(dto.username);
    await this.assertNicknameAllowed(dto.nickname);
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
      .returning(publicUserColumns);
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
    await this.assertNicknameFree(nickname);
  }

  private async assertNicknameFree(nickname: string, exceptId?: number) {
    const [byNickname] = await this.dbService.db
      .select({ id: users.id })
      .from(users)
      .where(
        exceptId
          ? and(eq(users.nickname, nickname), ne(users.id, exceptId))
          : eq(users.nickname, nickname),
      );
    if (byNickname) {
      throw new ConflictException(NICKNAME_TAKEN);
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const db = this.dbService.db;
    const [row] = await db
      .select({
        user: publicUserColumns,
        passwordHash: users.passwordHash,
        blockedReason: users.blockedReason,
        blockedUntil: users.blockedUntil,
      })
      .from(users)
      .where(eq(users.username, dto.username));
    if (
      !row ||
      row.user.status === 'deleted' ||
      !(await verifyPassword(dto.password, row.passwordHash))
    ) {
      throw new UnauthorizedException(LOGIN_FAILED);
    }
    const block: BlockInfo = {
      status: row.user.status,
      blockedReason: row.blockedReason,
      blockedUntil: row.blockedUntil,
    };
    let user = row.user;
    if (isBlockExpired(block)) {
      user = await this.releaseBlock(user.id);
    } else if (user.status === 'blocked') {
      throw new ForbiddenException(blockedMessage(block));
    }
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));
    const token = await this.createSession(user.id);
    return { user, token };
  }

  private async releaseBlock(userId: number): Promise<AuthUser> {
    const [user] = await this.dbService.db
      .update(users)
      .set({ status: 'active', blockedReason: null, blockedUntil: null })
      .where(eq(users.id, userId))
      .returning(publicUserColumns);
    return user;
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
      .select({
        user: publicUserColumns,
        blockedReason: users.blockedReason,
        blockedUntil: users.blockedUntil,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.tokenHash, tokenHash));
    if (!row) {
      return null;
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
      return null;
    }
    if (isBlockExpired({ ...row, status: row.user.status })) {
      return this.releaseBlock(row.user.id);
    }
    if (row.user.status !== 'active') {
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

  async changeNickname(user: AuthUser, dto: ChangeNicknameDto) {
    if (dto.nickname === user.nickname) {
      return user;
    }
    if (user.nicknameChangedAt) {
      const remainingMs =
        user.nicknameChangedAt.getTime() +
        NICKNAME_CHANGE_DAYS * DAY_MS -
        Date.now();
      if (remainingMs > 0) {
        throw new BadRequestException(
          `닉네임은 ${Math.ceil(remainingMs / DAY_MS)}일 뒤에 바꿀 수 있습니다.`,
        );
      }
    }
    await this.assertNicknameAllowed(dto.nickname);
    await this.assertNicknameFree(dto.nickname, user.id);
    const [updated] = await this.dbService.db
      .update(users)
      .set({ nickname: dto.nickname, nicknameChangedAt: new Date() })
      .where(and(eq(users.id, user.id), ne(users.nickname, dto.nickname)))
      .returning(publicUserColumns)
      .catch((error: unknown) => {
        throw isUniqueViolation(error)
          ? new ConflictException(NICKNAME_TAKEN)
          : error;
      });
    return updated ?? user;
  }

  async withdraw(user: AuthUser, dto: WithdrawDto) {
    if (user.role === 'admin') {
      throw new BadRequestException('관리자 계정은 탈퇴할 수 없습니다.');
    }
    const db = this.dbService.db;
    const [row] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id));
    if (!row || !(await verifyPassword(dto.password, row.passwordHash))) {
      throw new BadRequestException('비밀번호가 맞지 않습니다.');
    }
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          status: 'deleted',
          username: `${DELETED_USERNAME_PREFIX}${user.id}`,
          nickname: `${DELETED_NICKNAME_PREFIX}${user.id}`,
          blockedReason: null,
          blockedUntil: null,
          deletedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      await tx.delete(sessions).where(eq(sessions.userId, user.id));
    });
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

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code = 'code' in error ? error.code : undefined;
  const cause = 'cause' in error ? error.cause : undefined;
  return code === '23505' || (cause !== error && isUniqueViolation(cause));
}
