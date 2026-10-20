import { Module } from '@nestjs/common'
import { MoneyController } from './money.controller.js'
import { MoneyService } from './money.service.js'

@Module({
  controllers: [MoneyController],
  providers: [MoneyService],
  exports: [MoneyService],
})
export class MoneyModule {}
