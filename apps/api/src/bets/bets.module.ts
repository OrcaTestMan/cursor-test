import { Module, forwardRef } from '@nestjs/common'
import { MoneyModule } from '../money/money.module.js'
import { RiskModule } from '../risk/risk.module.js'
import { BetHistoryController } from './bet-history.controller.js'
import { BetHistoryService } from './bet-history.service.js'
import { BetsController, CasinoBetsController } from './bets.controller.js'
import { BetsService } from './bets.service.js'

@Module({
  imports: [MoneyModule, forwardRef(() => RiskModule)],
  controllers: [BetsController, CasinoBetsController, BetHistoryController],
  providers: [BetsService, BetHistoryService],
  exports: [BetsService, BetHistoryService],
})
export class BetsModule {}
