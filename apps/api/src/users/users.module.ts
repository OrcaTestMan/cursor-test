import { Module } from '@nestjs/common';
import { AdminUsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
