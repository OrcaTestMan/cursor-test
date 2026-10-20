import { Module } from '@nestjs/common'
import { BetsController, CasinoBetsController } from './bets.controller.js'
import { BetsService } from './bets.service.js'

@Module({
  controllers: [BetsController, CasinoBetsController],
  providers: [BetsService],
  exports: [BetsService],
})
export class BetsModule {}
