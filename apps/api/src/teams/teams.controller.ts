import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminOnly } from '../auth/auth.decorators.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { AdminListTeamsDto, CreateTeamDto, UpdateTeamDto } from './dto/team.dto.js';
import { TeamsService } from './teams.service.js';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  list() {
    return this.teamsService.list();
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.teamsService.get(id);
  }
}

@Controller('admin/teams')
@AdminOnly()
export class AdminTeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  list(@Query() query: AdminListTeamsDto) {
    return this.teamsService.listAdmin(query);
  }

  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }
}
