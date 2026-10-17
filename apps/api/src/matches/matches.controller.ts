import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminOnly } from '../auth/auth.decorators.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import {
  AdminListMatchesDto,
  CreateMatchDto,
  ListMatchesDto,
  UpdateMatchDto,
} from './dto/match.dto.js';
import { MatchesService } from './matches.service.js';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  list(@Query() query: ListMatchesDto) {
    return this.matchesService.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.matchesService.get(id);
  }
}

@Controller('admin/matches')
@AdminOnly()
export class AdminMatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  list(@Query() query: AdminListMatchesDto) {
    return this.matchesService.listAdmin(query);
  }

  @Post()
  create(@Body() dto: CreateMatchDto) {
    return this.matchesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateMatchDto) {
    return this.matchesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIdPipe) id: number) {
    await this.matchesService.remove(id);
  }
}
