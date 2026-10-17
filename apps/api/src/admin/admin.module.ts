import { Module } from '@nestjs/common';
import { InquiriesModule } from '../inquiries/inquiries.module.js';
import { PostsModule } from '../posts/posts.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminController } from './admin.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [PostsModule, InquiriesModule, UsersModule],
  controllers: [AdminController],
  providers: [DashboardService],
})
export class AdminModule {}
