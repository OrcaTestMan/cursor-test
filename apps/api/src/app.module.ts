import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { BetsModule } from './bets/bets.module.js'
import { CashModule } from './cash/cash.module.js'
import { validateEnv } from './config/env.validation.js'
import { DbModule } from './db/db.module.js'
import { MoneyModule } from './money/money.module.js'
import { NotifyModule } from './notify/notify.module.js'
import { RiskModule } from './risk/risk.module.js'
import { SecurityModule } from './security/security.module.js'
import { UsersModule } from './users/users.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    SecurityModule,
    DbModule,
    UsersModule,
    CashModule,
    BetsModule,
    MoneyModule,
    NotifyModule,
    RiskModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
