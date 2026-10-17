import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateLeagueDto } from './dto/create-league.dto.js';
import { LeaguesService } from './leagues.service.js';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  list() {
    return this.leaguesService.list();
  }

  @Post()
  create(@Body() dto: CreateLeagueDto) {
    return this.leaguesService.create(dto);
  }
}
