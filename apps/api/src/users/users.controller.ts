import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminOnly, CurrentUser, LoginRequired } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import {
  AdminListUsersDto,
  AdminLookupUsersDto,
  UpdateProfileDto,
  UpdateUserDto,
} from './dto/user.dto.js';
import { BADGE_RULES } from './badges.service.js';
import { UsersService } from './users.service.js';

@Controller('badges')
export class BadgesController {
  @Get()
  list() {
    return { items: BADGE_RULES };
  }
}

@Controller('me')
@LoginRequired()
export class MeProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user, dto);
  }

  @Get('teams')
  listTeams(@CurrentUser() user: AuthUser) {
    return this.usersService.listTeams(user.id);
  }
}

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':nickname')
  get(
    @Param('nickname') nickname: string,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.usersService.getPublic(nickname, user);
  }
}

@Controller('admin/users')
@AdminOnly()
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('lookup')
  lookup(@Query() query: AdminLookupUsersDto) {
    return this.usersService.lookup(query);
  }

  @Get()
  list(@Query() query: AdminListUsersDto) {
    return this.usersService.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.usersService.get(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(admin, id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  resetPassword(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseIdPipe) id: number,
  ) {
    return this.usersService.resetPassword(admin, id);
  }
}
