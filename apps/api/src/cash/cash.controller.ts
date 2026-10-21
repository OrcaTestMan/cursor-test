import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { OPS_ROLES } from '../auth/admin-roles.js'
import { Roles } from '../auth/auth.decorators.js'
import { refuseMemberWriteInProduction } from '../common/production-block.js'
import { ParseIdPipe } from '../common/parse-id.pipe.js'
import { CashService } from './cash.service.js'
import {
  CashListQueryDto,
  CreateCashDto,
  UpdateCashStatusDto,
} from './dto/cash.dto.js'

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get()
  list(@Query() query: CashListQueryDto) {
    return this.cashService.list(query)
  }

  @Post()
  create(@Body() body: CreateCashDto) {
    refuseMemberWriteInProduction()
    return this.cashService.create(body)
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.cashService.get(id)
  }

  @Patch(':id/status')
  @Roles(...OPS_ROLES)
  updateStatus(
    @Param('id', ParseIdPipe) id: number,
    @Body() body: UpdateCashStatusDto,
  ) {
    return this.cashService.updateStatus(id, body)
  }
}
