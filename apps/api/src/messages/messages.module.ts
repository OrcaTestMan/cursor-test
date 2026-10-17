import { Module } from '@nestjs/common';
import {
  AdminMessagesController,
  MessagesController,
} from './messages.controller.js';
import { MessagesService } from './messages.service.js';

@Module({
  controllers: [MessagesController, AdminMessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
