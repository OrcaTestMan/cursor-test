import { Module } from '@nestjs/common';
import { FansModule } from '../fans/fans.module.js';
import {
  AdminMatchesController,
  MatchesController,
} from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({
  imports: [FansModule],
  controllers: [MatchesController, AdminMatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
