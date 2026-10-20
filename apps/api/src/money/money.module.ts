import { Module } from '@nestjs/common'
import { MoneyController } from './money.controller.js'
import { MoneyService } from './money.service.js'
import { WalletService } from './wallet.service.js'

@Module({
  controllers: [MoneyController],
  providers: [MoneyService, WalletService],
  exports: [MoneyService, WalletService],
})
export class MoneyModule {}
