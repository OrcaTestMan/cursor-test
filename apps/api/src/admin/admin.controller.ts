import { Controller, Get } from '@nestjs/common';
import { AdminOnly } from '../auth/auth.decorators.js';
import { DashboardService } from './dashboard.service.js';

@Controller('admin')
@AdminOnly()
export class AdminController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  dashboard() {
    return this.dashboardService.get();
  }
}
