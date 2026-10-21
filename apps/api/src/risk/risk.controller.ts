import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Sse,
} from '@nestjs/common'
import { interval, map, type Observable } from 'rxjs'
import { OPS_ROLES } from '../auth/admin-roles.js'
import { Roles } from '../auth/auth.decorators.js'
import { ParseIdPipe } from '../common/parse-id.pipe.js'
import { RiskService } from './risk.service.js'

@Controller('risk')
export class RiskController {
  constructor(private readonly risk: RiskService) {}

  @Get('summary')
  summary() {
    return this.risk.summary()
  }

  @Get('matches')
  matches(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('sport') sport?: string,
    @Query('status') status?: string,
  ) {
    return this.risk.listMatches({
      cursor,
      limit: limit ? Number(limit) : undefined,
      sport,
      status,
    })
  }

  @Get('matches/:id')
  match(@Param('id', ParseIdPipe) id: number) {
    return this.risk.getMatch(id)
  }

  @Get('members')
  members(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.risk.listMembers({
      cursor,
      limit: limit ? Number(limit) : 20,
    })
  }

  @Get('alerts')
  alerts() {
    return this.risk.listAlerts()
  }

  @Patch('alerts/:id/ack')
  ack(
    @Param('id', ParseIdPipe) id: number,
    @Body() body: { reason: string },
  ) {
    return this.risk.ackAlert(id, body.reason)
  }

  @Post('actions')
  action(
    @Body()
    body: {
      action: string
      targetType: string
      targetId: number
      reason: string
      value?: number
      grade?: string
    },
  ) {
    if (body.action === 'set_user_grade' && body.grade) {
      return this.risk.setUserGrade(body.targetId, body.grade, body.reason)
    }
    return this.risk.action(body)
  }

  @Get('settings')
  getSettings() {
    return this.risk.getSettings()
  }

  @Put('settings')
  @Roles(...OPS_ROLES)
  putSettings(
    @Body()
    body: {
      lossLimit?: number
      weights?: string
      alertThresholds?: string
      reason: string
    },
  ) {
    return this.risk.putSettings(body)
  }

  /** 변경분 폴링성 SSE (3초) — 클라이언트 실시간 반영용 */
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return interval(3000).pipe(
      map(() => ({
        data: { ts: Date.now(), hint: 'refresh summary/matches' },
      })),
    )
  }
}
