import { Controller, Get, Param, Query } from '@nestjs/common'
import { ParseIdPipe } from '../common/parse-id.pipe.js'
import { MoneyMoveListQueryDto } from './dto/money.dto.js'
import { MoneyService } from './money.service.js'

@Controller('money-moves')
export class MoneyController {
  constructor(private readonly moneyService: MoneyService) {}

  @Get()
  list(@Query() query: MoneyMoveListQueryDto) {
    return this.moneyService.listMoves(query)
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.moneyService.getMove(id)
  }
}
