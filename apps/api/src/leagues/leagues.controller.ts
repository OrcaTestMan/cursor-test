import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AdminOnly } from '../auth/auth.decorators.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto.js';
import { LeaguesService } from './leagues.service.js';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  list() {
    return this.leaguesService.list();
  }
}

@Controller('admin/leagues')
@AdminOnly()
export class AdminLeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Post()
  create(@Body() dto: CreateLeagueDto) {
    return this.leaguesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateLeagueDto) {
    return this.leaguesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIdPipe) id: number) {
    await this.leaguesService.remove(id);
  }
}
