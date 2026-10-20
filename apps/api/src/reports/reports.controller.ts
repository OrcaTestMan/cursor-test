import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AdminOnly, CurrentUser, LoginRequired } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import {
  AdminListReportsDto,
  CreateReportDto,
  ResolveReportDto,
} from './dto/report.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@LoginRequired()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user, dto);
  }
}

@Controller('admin/reports')
@AdminOnly()
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  list(@Query() query: AdminListReportsDto) {
    return this.reportsService.listAdmin(query);
  }

  @Post('resolve')
  resolve(@CurrentUser() user: AuthUser, @Body() dto: ResolveReportDto) {
    return this.reportsService.resolve(user, dto);
  }
}
