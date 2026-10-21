import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { OPS_ROLES } from '../auth/admin-roles.js'
import { Roles } from '../auth/auth.decorators.js'
import { refuseBackfillInProduction } from '../common/production-block.js'
import { ParseIdPipe } from '../common/parse-id.pipe.js'
import {
  AdminAdjustDto,
  MoneyMoveListQueryDto,
  PointConvertDto,
} from './dto/money.dto.js'
import { MoneyService } from './money.service.js'
import { WalletService } from './wallet.service.js'

@Controller('money-moves')
export class MoneyController {
  constructor(
    private readonly moneyService: MoneyService,
    private readonly wallet: WalletService,
  ) {}

  @Get()
  list(@Query() query: MoneyMoveListQueryDto) {
    return this.moneyService.listMoves(query)
  }

  @Get('verify')
  verify() {
    return this.wallet.verifyBalances()
  }

  @Post('backfill')
  backfill() {
    refuseBackfillInProduction()
    return this.wallet.backfillLedgers()
  }

  @Post('adjust')
  @Roles(...OPS_ROLES)
  adjust(@Body() body: AdminAdjustDto) {
    return this.moneyService.adminAdjust(body)
  }

  @Post('point-convert')
  pointConvert(@Body() body: PointConvertDto) {
    return this.moneyService.pointConvert(body)
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.moneyService.getMove(id)
  }
}
