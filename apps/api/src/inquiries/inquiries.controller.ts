import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AdminOnly, CurrentUser, LoginRequired } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { PaginationQueryDto } from '../common/pagination.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import {
  AdminListInquiriesDto,
  AnswerInquiryDto,
  CreateInquiryDto,
} from './dto/inquiry.dto.js';
import { InquiriesService } from './inquiries.service.js';

@Controller('inquiries')
@LoginRequired()
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.inquiriesService.listMine(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.inquiriesService.getMine(user, id);
  }
}

@Controller('admin/inquiries')
@AdminOnly()
export class AdminInquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get()
  list(@Query() query: AdminListInquiriesDto) {
    return this.inquiriesService.listAdmin(query);
  }

  @Get(':id')
  get(@Param('id', ParseIdPipe) id: number) {
    return this.inquiriesService.getAdmin(id);
  }

  @Post(':id/answer')
  @HttpCode(200)
  answer(@Param('id', ParseIdPipe) id: number, @Body() dto: AnswerInquiryDto) {
    return this.inquiriesService.answer(id, dto);
  }
}
