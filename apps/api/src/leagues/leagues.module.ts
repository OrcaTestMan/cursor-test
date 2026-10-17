import { Module } from '@nestjs/common';
import {
  AdminLeaguesController,
  LeaguesController,
} from './leagues.controller.js';
import { LeaguesService } from './leagues.service.js';

@Module({
  controllers: [LeaguesController, AdminLeaguesController],
  providers: [LeaguesService],
})
export class LeaguesModule {}
