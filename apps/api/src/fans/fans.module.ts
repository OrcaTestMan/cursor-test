import { Module } from '@nestjs/common';
import {
  FansController,
  LeagueStandingsController,
  MyPredictionsController,
  RankingsController,
} from './fans.controller.js';
import { FansService } from './fans.service.js';

@Module({
  controllers: [
    FansController,
    MyPredictionsController,
    LeagueStandingsController,
    RankingsController,
  ],
  providers: [FansService],
  exports: [FansService],
})
export class FansModule {}
