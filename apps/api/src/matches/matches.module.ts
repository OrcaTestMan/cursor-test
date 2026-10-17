import { Module } from '@nestjs/common';
import {
  AdminMatchesController,
  MatchesController,
} from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({
  controllers: [MatchesController, AdminMatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
