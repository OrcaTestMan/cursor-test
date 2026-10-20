import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { ParseIdPipe } from '../common/parse-id.pipe.js'
import { CashService } from './cash.service.js'
import { CashListQueryDto, UpdateCashStatusDto } from './dto/cash.dto.js'

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get()
  list(@Query() query: CashListQueryDto) {
    return this.cashService.list(query)
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.cashService.get(id)
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIdPipe) id: number,
    @Body() body: UpdateCashStatusDto,
  ) {
    return this.cashService.updateStatus(id, body)
  }
}
