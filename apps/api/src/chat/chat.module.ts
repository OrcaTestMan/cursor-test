import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MatchesModule } from '../matches/matches.module.js';
import { SocialModule } from '../social/social.module.js';
import { ChatController } from './chat.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [MatchesModule, AuthModule, SocialModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
