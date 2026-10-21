import { type INestApplication, ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import type { NextFunction, Request, Response } from 'express'
import { cookieSecure } from './auth/auth.constants.js'
import { AuthService } from './auth/auth.service.js'
import { KoreanErrorsFilter } from './common/korean-errors.filter.js'

export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api')
  app.use(
    helmet({
      strictTransportSecurity: cookieSecure()
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  )
  app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: true })
  app.use(cookieParser())
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    const path = req.path || ''
    if (!path.startsWith('/nex/') || !path.endsWith('.html') || path.endsWith('/login.html')) {
      next()
      return
    }
    try {
      const admin = await app.get(AuthService).readSession(req)
      if (!admin) {
        res.redirect(302, '/nex/login.html')
        return
      }
    } catch {
      res.redirect(302, '/nex/login.html')
      return
    }
    next()
  })
  app.useGlobalFilters(new KoreanErrorsFilter())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  )
}
