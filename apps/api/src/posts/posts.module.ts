import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { CommentsService } from './comments.service.js';
import {
  AdminCommentsController,
  AdminPostsController,
  CommentsController,
  MyPostsController,
  PostsController,
} from './posts.controller.js';
import { PostsService } from './posts.service.js';

@Module({
  imports: [MatchesModule, SettingsModule],
  controllers: [
    PostsController,
    CommentsController,
    MyPostsController,
    AdminPostsController,
    AdminCommentsController,
  ],
  providers: [PostsService, CommentsService],
  exports: [PostsService],
})
export class PostsModule {}
