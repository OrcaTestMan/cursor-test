import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AdminOnly, CurrentUser } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { AdminListUsersDto, UpdateUserDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@Controller('admin/users')
@AdminOnly()
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
