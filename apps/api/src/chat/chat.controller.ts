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
import { CurrentUser, LoginRequired } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { CreateChatDto, ListChatDto } from './chat.dto.js';
import { ChatGateway } from './chat.gateway.js';
import { ChatService } from './chat.service.js';

@Controller('matches/:matchId/chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get()
  list(
    @Param('matchId', ParseIdPipe) matchId: number,
    @Query() query: ListChatDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.chatService.list(matchId, user, query.beforeId);
  }

  @Post()
  @LoginRequired()
  async create(
    @Param('matchId', ParseIdPipe) matchId: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateChatDto,
  ) {
    const message = await this.chatService.create(matchId, user, dto.body);
    this.chatGateway.broadcast(matchId, { type: 'message', message });
    return message;
  }

  @Delete(':id')
  @LoginRequired()
  @HttpCode(200)
  async remove(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.chatService.remove(id, user);
    this.chatGateway.broadcast(result.matchId, { type: 'deleted', id: result.id });
    return result;
  }
}
