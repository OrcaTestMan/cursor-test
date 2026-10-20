import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AdminOnly, CurrentUser } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { AuditService } from './audit.service.js';
import {
  AdminListForbiddenWordsDto,
  AdminListLogsDto,
  CreateForbiddenWordDto,
} from './dto/moderation.dto.js';
import { ModerationService } from './moderation.service.js';

@Controller('admin/forbidden-words')
@AdminOnly()
export class AdminForbiddenWordsController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  list(@Query() query: AdminListForbiddenWordsDto) {
    return this.moderationService.listWords(query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateForbiddenWordDto) {
    return this.moderationService.createWord(user, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.moderationService.removeWord(user, id);
  }
}

@Controller('admin/logs')
@AdminOnly()
export class AdminLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: AdminListLogsDto) {
    return this.auditService.list(query);
  }
}
