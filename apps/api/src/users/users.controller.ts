import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { ParseIdPipe } from '../common/parse-id.pipe.js'
import { UpdateUserStatusDto, UserListQueryDto } from './dto/user.dto.js'
import { UsersService } from './users.service.js'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: UserListQueryDto) {
    return this.usersService.list(query)
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.usersService.get(id)
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIdPipe) id: number,
    @Body() body: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, body)
  }
}
