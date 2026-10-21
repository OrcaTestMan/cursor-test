import type { NextFunction, Request, Response } from 'express'
import {
  TEMP_BASIC_AUTH_MESSAGE,
  TEMP_BASIC_AUTH_REALM,
  credentialsMatch,
  isLocalHealthBypass,
  parseBasicAuthHeader,
  readTempBasicAuthCredentials,
} from './basic-auth.js'
import {
  BasicAuthFailLimiter,
  TEMP_BASIC_AUTH_LOCKED_MESSAGE,
  normalizeClientIp,
} from './basic-auth-limit.js'

export const basicAuthFailLimiter = new BasicAuthFailLimiter()

export function rejectBasicAuth(res: Response) {
  res.setHeader(
    'WWW-Authenticate',
    `Basic realm="${TEMP_BASIC_AUTH_REALM}"`,
  )
  res.status(401).json({
    statusCode: 401,
    message: TEMP_BASIC_AUTH_MESSAGE,
    error: 'Unauthorized',
  })
}

export function rejectBasicAuthLocked(res: Response) {
  res.status(429).json({
    statusCode: 429,
    message: TEMP_BASIC_AUTH_LOCKED_MESSAGE,
    error: 'Too Many Requests',
  })
}

export function createTempBasicAuthMiddleware(
  limiter: BasicAuthFailLimiter = basicAuthFailLimiter,
) {
  return function tempBasicAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const expected = readTempBasicAuthCredentials()
    if (!expected) {
      next()
      return
    }
    if (req.method === 'OPTIONS') {
      next()
      return
    }
    if (isLocalHealthBypass(req)) {
      next()
      return
    }
    const ip = normalizeClientIp(req.socket?.remoteAddress)
    if (limiter.isLocked(ip)) {
      rejectBasicAuthLocked(res)
      return
    }
    const provided = parseBasicAuthHeader(
      typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : undefined,
    )
    if (credentialsMatch(provided, expected)) {
      next()
      return
    }
    const { locked } = limiter.recordFailure(ip)
    if (locked) {
      rejectBasicAuthLocked(res)
      return
    }
    rejectBasicAuth(res)
  }
}

/** 관리자 화면과 /api 전체에 임시 HTTP Basic 인증을 건다. */
export const tempBasicAuthMiddleware = createTempBasicAuthMiddleware()
