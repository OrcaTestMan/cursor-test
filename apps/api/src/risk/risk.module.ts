import { Module } from '@nestjs/common'
import { MoneyModule } from '../money/money.module.js'
import { RiskController } from './risk.controller.js'
import { RiskService } from './risk.service.js'

@Module({
  imports: [MoneyModule],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
