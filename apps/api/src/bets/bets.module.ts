import { Module } from '@nestjs/common'
import { MoneyModule } from '../money/money.module.js'
import { BetsController, CasinoBetsController } from './bets.controller.js'
import { BetsService } from './bets.service.js'

@Module({
  imports: [MoneyModule],
  controllers: [BetsController, CasinoBetsController],
  providers: [BetsService],
  exports: [BetsService],
})
export class BetsModule {}
