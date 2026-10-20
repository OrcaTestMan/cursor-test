import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { AdminReportsController, ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
