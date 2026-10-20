import { Module } from '@nestjs/common'
import { MoneyModule } from '../money/money.module.js'
import { CashController } from './cash.controller.js'
import { CashService } from './cash.service.js'

@Module({
  imports: [MoneyModule],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
