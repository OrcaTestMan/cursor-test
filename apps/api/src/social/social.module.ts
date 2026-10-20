import { Module } from '@nestjs/common';
import {
  MySocialController,
  PostSubscribeController,
  ProfileSocialController,
} from './social.controller.js';
import { SocialService } from './social.service.js';

@Module({
  controllers: [
    ProfileSocialController,
    MySocialController,
    PostSubscribeController,
  ],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
