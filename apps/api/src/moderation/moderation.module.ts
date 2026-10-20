import { Global, Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { AuditService } from './audit.service.js';
import {
  AdminForbiddenWordsController,
  AdminLogsController,
} from './moderation.controller.js';
import { ModerationService } from './moderation.service.js';

@Global()
@Module({
  imports: [SettingsModule],
  controllers: [AdminForbiddenWordsController, AdminLogsController],
  providers: [ModerationService, AuditService],
  exports: [ModerationService, AuditService],
})
export class ModerationModule {}
