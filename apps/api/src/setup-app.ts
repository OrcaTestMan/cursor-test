import { type INestApplication, ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { KoreanErrorsFilter } from './common/korean-errors.filter.js'
import { tempBasicAuthMiddleware } from './security/basic-auth.middleware.js'

export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api')
  app.use(
    helmet({
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
  app.use(tempBasicAuthMiddleware)
  app.use(cookieParser())
  app.useGlobalFilters(new KoreanErrorsFilter())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  )
}
