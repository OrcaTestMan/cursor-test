import {
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
import { PaginationQueryDto } from '../common/pagination.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { ListMineFollowingDto } from './dto/social.dto.js';
import { SocialService } from './social.service.js';

@Controller('profiles')
export class ProfileSocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get(':nickname/followers')
  followers(
    @Param('nickname') nickname: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.socialService.listFollowers(nickname, query);
  }

  @Get(':nickname/following')
  following(
    @Param('nickname') nickname: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.socialService.listFollowing(nickname, query);
  }

  @Post(':nickname/follow')
  @LoginRequired()
  @HttpCode(200)
  follow(@CurrentUser() user: AuthUser, @Param('nickname') nickname: string) {
    return this.socialService.follow(user, nickname);
  }

  @Delete(':nickname/follow')
  @LoginRequired()
  unfollow(@CurrentUser() user: AuthUser, @Param('nickname') nickname: string) {
    return this.socialService.unfollow(user, nickname);
  }

  @Post(':nickname/mute')
  @LoginRequired()
  @HttpCode(200)
  mute(@CurrentUser() user: AuthUser, @Param('nickname') nickname: string) {
    return this.socialService.mute(user, nickname);
  }

  @Delete(':nickname/mute')
  @LoginRequired()
  unmute(@CurrentUser() user: AuthUser, @Param('nickname') nickname: string) {
    return this.socialService.unmute(user, nickname);
  }
}

@Controller('me')
@LoginRequired()
export class MySocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('followers')
  followers(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.socialService.listMyFollowers(user, query);
  }

  @Get('following')
  following(@CurrentUser() user: AuthUser, @Query() query: ListMineFollowingDto) {
    return this.socialService.listMyFollowing(user, query);
  }

  @Get('mutes')
  mutes(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.socialService.listMyMutes(user, query);
  }
}

@Controller('posts')
export class PostSubscribeController {
  constructor(private readonly socialService: SocialService) {}

  @Post(':id/subscribe')
  @LoginRequired()
  @HttpCode(200)
  subscribe(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.socialService.subscribe(user, id);
  }

  @Delete(':id/subscribe')
  @LoginRequired()
  unsubscribe(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.socialService.unsubscribe(user, id);
  }
}
