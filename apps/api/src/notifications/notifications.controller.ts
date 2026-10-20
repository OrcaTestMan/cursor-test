import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, LoginRequired } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { ListNotificationsDto } from './dto/notification.dto.js';
import { UpdateNotificationSettingsDto } from '../social/dto/social.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@LoginRequired()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListNotificationsDto) {
    return this.notificationsService.listMine(user, query);
  }

  @Get('settings')
  settings(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getSettings(user);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateSettings(user, dto);
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(@CurrentUser() user: AuthUser) {
    await this.notificationsService.markAllRead(user);
  }

  @Post(':id/read')
  @HttpCode(200)
  read(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.notificationsService.markRead(user, id);
  }
}
