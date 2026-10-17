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
import { AdminOnly, CurrentUser, LoginRequired } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { PaginationQueryDto } from '../common/pagination.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { SendMessageDto } from './dto/message.dto.js';
import { MessagesService } from './messages.service.js';

@Controller('messages')
@LoginRequired()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.messagesService.listMine(user, query);
  }

  @Post(':id/read')
  @HttpCode(200)
  read(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.messagesService.markRead(user, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
  ) {
    await this.messagesService.remove(user, id);
  }
}

@Controller('admin/messages')
@AdminOnly()
export class AdminMessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.messagesService.send(user, dto);
  }

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.messagesService.listSent(query);
  }
}
