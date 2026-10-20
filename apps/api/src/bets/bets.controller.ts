import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ParseIdPipe } from '../common/parse-id.pipe.js'
import { BetsService } from './bets.service.js'
import {
  BetListQueryDto,
  CasinoBetListQueryDto,
  PlaceBetDto,
  PlaceCasinoBetDto,
  UpdateBetStatusDto,
} from './dto/bet.dto.js'

@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Get()
  list(@Query() query: BetListQueryDto) {
    return this.betsService.listSports(query)
  }

  @Post()
  place(@Body() body: PlaceBetDto) {
    return this.betsService.placeSport(body)
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

  @Post()
  place(@Body() body: PlaceCasinoBetDto) {
    return this.betsService.placeCasino(body)
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
