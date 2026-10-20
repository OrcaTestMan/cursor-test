import { Module, forwardRef } from '@nestjs/common'
import { MoneyModule } from '../money/money.module.js'
import { RiskModule } from '../risk/risk.module.js'
import { BetsController, CasinoBetsController } from './bets.controller.js'
import { BetsService } from './bets.service.js'

@Module({
  imports: [MoneyModule, forwardRef(() => RiskModule)],
  controllers: [BetsController, CasinoBetsController],
  providers: [BetsService],
  exports: [BetsService],
})
export class BetsModule {}
