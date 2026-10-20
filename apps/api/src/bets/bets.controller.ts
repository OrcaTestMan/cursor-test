import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { ParseIdPipe } from '../common/parse-id.pipe.js'
import { BetsService } from './bets.service.js'
import {
  BetListQueryDto,
  CasinoBetListQueryDto,
  UpdateBetStatusDto,
} from './dto/bet.dto.js'

@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Get()
  list(@Query() query: BetListQueryDto) {
    return this.betsService.listSports(query)
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.betsService.getSport(id)
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIdPipe) id: number,
    @Body() body: UpdateBetStatusDto,
  ) {
    return this.betsService.updateSportStatus(id, body)
  }
}

@Controller('casino-bets')
export class CasinoBetsController {
  constructor(private readonly betsService: BetsService) {}

  @Get()
  list(@Query() query: CasinoBetListQueryDto) {
    return this.betsService.listCasino(query)
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.betsService.getCasino(id)
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIdPipe) id: number,
    @Body() body: UpdateBetStatusDto,
  ) {
    return this.betsService.updateCasinoStatus(id, body)
  }
}
