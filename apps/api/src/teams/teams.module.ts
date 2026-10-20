import { Module } from '@nestjs/common';
import { AdminTeamsController, TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';

@Module({
  controllers: [TeamsController, AdminTeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
