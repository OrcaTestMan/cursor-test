import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser, LoginRequired } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { PaginationQueryDto } from '../common/pagination.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { CheerDto, PredictionDto, RankingQueryDto, StandingsQueryDto } from './dto/fan.dto.js';
import { FansService } from './fans.service.js';

@Controller('matches')
export class FansController {
  constructor(private readonly fansService: FansService) {}

  @Put(':id/cheer')
  @LoginRequired()
  @HttpCode(200)
  setCheer(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: CheerDto,
  ) {
    return this.fansService.setCheer(id, user, dto);
  }

  @Delete(':id/cheer')
  @LoginRequired()
  @HttpCode(200)
  removeCheer(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.fansService.removeCheer(id, user);
  }

  @Put(':id/prediction')
  @LoginRequired()
  @HttpCode(200)
  setPrediction(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: PredictionDto,
  ) {
    return this.fansService.setPrediction(id, user, dto);
  }
}

@Controller('me')
@LoginRequired()
export class MyPredictionsController {
  constructor(private readonly fansService: FansService) {}

  @Get('predictions')
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.fansService.listMyPredictions(user, query);
  }
}

@Controller('leagues')
export class LeagueStandingsController {
  constructor(private readonly fansService: FansService) {}

  @Get(':id/standings')
  standings(
    @Param('id', ParseIdPipe) id: number,
    @Query() query: StandingsQueryDto,
  ) {
    return this.fansService.standings(id, query);
  }
}

@Controller('rankings')
export class RankingsController {
  constructor(private readonly fansService: FansService) {}

  @Get('predictions')
  list(@Query() query: RankingQueryDto) {
    return this.fansService.ranking(query);
  }
}
