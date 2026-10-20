import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.validation.js';
import { DbModule } from './db/db.module.js';
import { FansModule } from './fans/fans.module.js';
import { InquiriesModule } from './inquiries/inquiries.module.js';
import { LeaguesModule } from './leagues/leagues.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { ModerationModule } from './moderation/moderation.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PostsModule } from './posts/posts.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SecurityModule } from './security/security.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { ChatModule } from './chat/chat.module.js';
import { SocialModule } from './social/social.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    SecurityModule,
    DbModule,
    SettingsModule,
    ModerationModule,
    NotificationsModule,
    AuthModule,
    LeaguesModule,
    MatchesModule,
    FansModule,
    UploadsModule,
    TeamsModule,
    SocialModule,
    ChatModule,
    PostsModule,
    ReportsModule,
    InquiriesModule,
    MessagesModule,
    UsersModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
