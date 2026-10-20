import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { SocialModule } from '../social/social.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { UsersModule } from '../users/users.module.js';
import { CommentsService } from './comments.service.js';
import { PollsService } from './polls.service.js';
import {
  AdminCommentsController,
  AdminPostsController,
  CommentsController,
  MyPostsController,
  PollsController,
  PostsController,
} from './posts.controller.js';
import { PostsService } from './posts.service.js';

@Module({
  imports: [MatchesModule, SettingsModule, UploadsModule, SocialModule, UsersModule],
  controllers: [
    PostsController,
    CommentsController,
    MyPostsController,
    AdminPostsController,
    AdminCommentsController,
    PollsController,
  ],
  providers: [PostsService, CommentsService, PollsService],
  exports: [PostsService],
})
export class PostsModule {}
