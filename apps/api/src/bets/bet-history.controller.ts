import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ParseIdPipe } from '../common/parse-id.pipe.js'
import { BetHistoryService } from './bet-history.service.js'
import { BetHistoryQueryDto } from './dto/bet-history.dto.js'

@Controller('bet-history')
export class BetHistoryController {
  constructor(private readonly history: BetHistoryService) {}

  @Get()
  list(@Query() query: BetHistoryQueryDto) {
    return this.history.list(query)
  }

  @Get('summary')
  summary(@Query() query: BetHistoryQueryDto) {
    return this.history.summary(query)
  }

  @Get('export.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  async csv(@Query() query: BetHistoryQueryDto, @Res() res: Response) {
    const body = await this.history.csv(query)
    res.setHeader('content-disposition', 'attachment; filename="sport-bets.csv"')
    res.send(body)
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.history.get(id)
  }
}
