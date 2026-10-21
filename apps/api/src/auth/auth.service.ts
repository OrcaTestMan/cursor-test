import { createHash, randomBytes } from 'node:crypto'
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import * as argon2 from 'argon2'
import { eq, lt } from 'drizzle-orm'
import { generateSync, generateURI, verifySync } from 'otplib'
import type { Request, Response } from 'express'
import { DbService } from '../db/db.service.js'
import {
  adminAuditLogs,
  adminSessions,
  admins,
  auditLogs,
  settings,
} from '../db/schema.js'
import { ADMIN_ROLE_LABEL, type AdminRole } from './admin-roles.js'
import {
  FAIL_LIMIT,
  IDLE_MS,
  LOCK_MS,
  MAX_LIFE_MS,
  OTP_SETTING_KEY,
  SESSION_COOKIE,
  cookieSecure,
  loginLockoutEnabled,
} from './auth.constants.js'

export type AdminActor = {
  id: number
  login: string
  nick: string
  role: AdminRole
}

@Injectable()
export class AuthService {
  now = () => Date.now()

  constructor(private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db
  }

  hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex')
  }

  rawCookie(req: Request) {
    const header = String(req.headers.cookie || '')
    for (const part of header.split(';')) {
      const idx = part.indexOf('=')
      if (idx < 0) continue
      if (part.slice(0, idx).trim() !== SESSION_COOKIE) continue
      return decodeURIComponent(part.slice(idx + 1).trim())
    }
    return String(req.cookies?.[SESSION_COOKIE] || '')
  }

  writeCookie(res: Response, raw: string) {
    const parts = [
      `${SESSION_COOKIE}=${raw}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Strict',
      `Max-Age=${Math.floor(MAX_LIFE_MS / 1000)}`,
    ]
    if (cookieSecure()) parts.push('Secure')
    res.append('Set-Cookie', parts.join('; '))
  }

  clearCookie(res: Response) {
    const parts = [
      `${SESSION_COOKIE}=`,
      'HttpOnly',
      'Path=/',
      'SameSite=Strict',
      'Max-Age=0',
    ]
    if (cookieSecure()) parts.push('Secure')
    res.append('Set-Cookie', parts.join('; '))
  }

  publicAdmin(admin: { id: number; login: string; nick: string; role: AdminRole }) {
    return {
      id: admin.id,
      login: admin.login,
      nick: admin.nick,
      role: admin.role,
      roleLabel: ADMIN_ROLE_LABEL[admin.role],
    }
  }

  clientIp(req: Request) {
    const raw = req.socket?.remoteAddress || ''
    if (raw === '::1' || raw === '::ffff:127.0.0.1') return '127.0.0.1'
    return raw
  }

  async audit(
    action: 'login_success' | 'login_fail' | 'logout',
    input: { adminId?: number | null; login: string; ip: string; userAgent: string },
  ) {
    await this.db.insert(adminAuditLogs).values({
      adminId: input.adminId ?? null,
      login: input.login.slice(0, 40),
      action,
      ip: input.ip.slice(0, 64),
      userAgent: input.userAgent.slice(0, 240),
    })
  }

  async login(
    body: { login?: string; password?: string; totp?: string },
    req: Request,
    res: Response,
  ) {
    const login = String(body.login || '').trim()
    const password = String(body.password || '')
    const totp = String(body.totp || '').trim()
    const ip = this.clientIp(req)
    const userAgent = String(req.headers['user-agent'] || '')
    const fail = async (adminId?: number) => {
      await this.audit('login_fail', { adminId, login, ip, userAgent })
      throw new UnauthorizedException('로그인에 실패했습니다.')
    }

    const [admin] = await this.db
      .select()
      .from(admins)
      .where(eq(admins.login, login))
      .limit(1)
    if (!admin) {
      await argon2.hash('dummy-password-to-equalize-time')
      await fail()
    }

    const now = this.now()
    if (
      loginLockoutEnabled() &&
      admin.lockedUntil &&
      admin.lockedUntil.getTime() > now
    ) {
      await this.audit('login_fail', { adminId: admin.id, login, ip, userAgent })
      throw new UnauthorizedException(
        '로그인이 잠겼습니다. 잠시 뒤 다시 시도해 주세요.',
      )
    }

    const passOk = await argon2.verify(admin.passwordHash, password)
    const otpRequired = await this.otpRequired()
    let totpOk = !otpRequired
    if (otpRequired) {
      try {
        totpOk = verifySync({ secret: admin.totpSecret, token: totp }).valid
      } catch {
        totpOk = false
      }
    }
    if (!passOk || !totpOk) {
      const attempts = admin.failedAttempts + 1
      const lockedUntil =
        loginLockoutEnabled() && attempts >= FAIL_LIMIT
          ? new Date(now + LOCK_MS)
          : null
      await this.db
        .update(admins)
        .set({
          failedAttempts: attempts,
          lockedUntil,
          updatedAt: new Date(now),
        })
        .where(eq(admins.id, admin.id))
      await fail(admin.id)
    }

    await this.db
      .update(admins)
      .set({
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(now),
      })
      .where(eq(admins.id, admin.id))

    const raw = randomBytes(32).toString('hex')
    await this.db.insert(adminSessions).values({
      adminId: admin.id,
      tokenHash: this.hashToken(raw),
      createdAt: new Date(now),
      lastSeenAt: new Date(now),
    })
    this.writeCookie(res, raw)
    await this.audit('login_success', {
      adminId: admin.id,
      login: admin.login,
      ip,
      userAgent,
    })
    return this.publicAdmin(admin)
  }

  async logout(req: Request, res: Response) {
    const raw = this.rawCookie(req)
    const ip = this.clientIp(req)
    const userAgent = String(req.headers['user-agent'] || '')
    if (raw) {
      const [session] = await this.db
        .select()
        .from(adminSessions)
        .where(eq(adminSessions.tokenHash, this.hashToken(raw)))
        .limit(1)
      if (session) {
        const [admin] = await this.db
          .select()
          .from(admins)
          .where(eq(admins.id, session.adminId))
          .limit(1)
        await this.db
          .delete(adminSessions)
          .where(eq(adminSessions.id, session.id))
        await this.audit('logout', {
          adminId: admin?.id,
          login: admin?.login || '',
          ip,
          userAgent,
        })
      }
    }
    this.clearCookie(res)
    return { ok: true }
  }

  async readSession(req: Request): Promise<AdminActor | null> {
    const raw = this.rawCookie(req)
    if (!raw) return null
    const now = this.now()
    const [row] = await this.db
      .select({
        sessionId: adminSessions.id,
        createdAt: adminSessions.createdAt,
        lastSeenAt: adminSessions.lastSeenAt,
        adminId: admins.id,
        login: admins.login,
        nick: admins.nick,
        role: admins.role,
      })
      .from(adminSessions)
      .innerJoin(admins, eq(admins.id, adminSessions.adminId))
      .where(eq(adminSessions.tokenHash, this.hashToken(raw)))
      .limit(1)
    if (!row) return null
    if (now - row.createdAt.getTime() > MAX_LIFE_MS) {
      await this.db.delete(adminSessions).where(eq(adminSessions.id, row.sessionId))
      return null
    }
    if (now - row.lastSeenAt.getTime() > IDLE_MS) {
      await this.db.delete(adminSessions).where(eq(adminSessions.id, row.sessionId))
      return null
    }
    await this.db
      .update(adminSessions)
      .set({ lastSeenAt: new Date(now) })
      .where(eq(adminSessions.id, row.sessionId))
    return {
      id: row.adminId,
      login: row.login,
      nick: row.nick,
      role: row.role,
    }
  }

  async requireAdmin(req: Request): Promise<AdminActor> {
    const admin = await this.readSession(req)
    if (!admin) throw new UnauthorizedException('로그인이 필요합니다.')
    return admin
  }

  assertOrigin(req: Request) {
    const method = (req.method || 'GET').toUpperCase()
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return
    const origin = String(req.headers.origin || '').replace(/\/$/, '')
    if (!origin) {
      throw new ForbiddenException('요청 출처를 확인할 수 없습니다.')
    }
    const host = String(req.headers.host || '')
    const allowed = new Set<string>()
    const web = (process.env.WEB_ORIGIN || '').trim().replace(/\/$/, '')
    if (web) allowed.add(web)
    if (host) {
      allowed.add(`http://${host}`)
      allowed.add(`https://${host}`)
    }
    if (!allowed.has(origin)) {
      throw new ForbiddenException('허용되지 않은 요청 출처입니다.')
    }
  }

  async expireOldSessions() {
    const now = this.now()
    await this.db
      .delete(adminSessions)
      .where(lt(adminSessions.createdAt, new Date(now - MAX_LIFE_MS)))
  }

  async otpRequired() {
    try {
      const [row] = await this.db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, OTP_SETTING_KEY))
        .limit(1)
      if (!row) return true
      return row.value !== '0'
    } catch {
      return true
    }
  }

  async setOtpRequired(actor: AdminActor, required: boolean, totp?: string) {
    const current = await this.otpRequired()
    if (current === required) {
      return { required }
    }
    if (!required) {
      const token = String(totp || '').trim()
      if (!/^\d{6}$/.test(token)) {
        throw new BadRequestException('OTP 코드 6자리가 필요합니다.')
      }
      const [admin] = await this.db
        .select({ totpSecret: admins.totpSecret })
        .from(admins)
        .where(eq(admins.id, actor.id))
        .limit(1)
      if (!admin) throw new UnauthorizedException('로그인이 필요합니다.')
      let totpOk = false
      try {
        totpOk = verifySync({ secret: admin.totpSecret, token }).valid
      } catch {
        totpOk = false
      }
      if (!totpOk) {
        throw new UnauthorizedException('OTP 코드가 올바르지 않습니다.')
      }
    }
    const value = required ? '1' : '0'
    const [row] = await this.db
      .select({ key: settings.key })
      .from(settings)
      .where(eq(settings.key, OTP_SETTING_KEY))
      .limit(1)
    if (row) {
      await this.db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, OTP_SETTING_KEY))
    } else {
      await this.db.insert(settings).values({ key: OTP_SETTING_KEY, value })
    }
    await this.db.insert(auditLogs).values({
      actor: actor.login.slice(0, 80),
      targetType: 'setting',
      targetId: OTP_SETTING_KEY.slice(0, 40),
      action: required ? 'otp_on' : 'otp_off',
      reason: required ? '관리자 로그인 OTP 사용' : '관리자 로그인 OTP 해제',
    })
    return { required }
  }

  generateTotp(secret: string) {
    return generateSync({ secret })
  }

  otpauthUri(login: string, secret: string) {
    return generateURI({
      secret,
      label: `Nex:${login}`,
      issuer: 'Nex',
    })
  }
}
