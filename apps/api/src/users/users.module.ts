import { Module } from '@nestjs/common';
import { FansModule } from '../fans/fans.module.js';
import { SocialModule } from '../social/social.module.js';
import { TeamsModule } from '../teams/teams.module.js';
import {
  AdminUsersController,
  BadgesController,
  MeProfileController,
  ProfilesController,
} from './users.controller.js';
import { BadgesService } from './badges.service.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [FansModule, TeamsModule, SocialModule],
  controllers: [
    BadgesController,
    MeProfileController,
    ProfilesController,
    AdminUsersController,
  ],
  providers: [UsersService, BadgesService],
  exports: [UsersService, BadgesService],
})
export class UsersModule {}
