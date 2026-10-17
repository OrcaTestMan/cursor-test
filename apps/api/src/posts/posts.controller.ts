import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminOnly, CurrentUser, LoginRequired } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { PaginationQueryDto } from '../common/pagination.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { CommentsService } from './comments.service.js';
import {
  AdminListCommentsDto,
  AdminListPostsDto,
  CreateCommentDto,
  CreatePostDto,
  ListPostsDto,
  UpdateContentStatusDto,
  UpdatePostDto,
} from './dto/post.dto.js';
import { PostsService } from './posts.service.js';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) {}

  @Get()
  list(@Query() query: ListPostsDto) {
    return this.postsService.list(query);
  }

  @Get(':id')
  get(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser | undefined,
    @Ip() ip: string,
  ) {
    const viewerKey = user ? `u${user.id}` : `ip${ip}`;
    return this.postsService.getDetail(id, user, viewerKey);
  }

  @Post()
  @LoginRequired()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.postsService.create(user, dto);
  }

  @Patch(':id')
  @LoginRequired()
  update(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(id, user, dto);
  }

  @Delete(':id')
  @LoginRequired()
  @HttpCode(204)
  async remove(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.postsService.remove(id, user);
  }

  @Post(':id/comments')
  @LoginRequired()
  addComment(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(id, user, dto);
  }
}

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Delete(':id')
  @LoginRequired()
  @HttpCode(204)
  async remove(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.commentsService.remove(id, user);
  }
}

@Controller('me/posts')
@LoginRequired()
export class MyPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.postsService.listMine(user, query);
  }
}

@Controller('admin/posts')
@AdminOnly()
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  list(@Query() query: AdminListPostsDto) {
    return this.postsService.listAdmin(query);
  }

  @Patch(':id')
  setStatus(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateContentStatusDto,
  ) {
    return this.postsService.setStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIdPipe) id: number) {
    await this.postsService.adminRemove(id);
  }
}

@Controller('admin/comments')
@AdminOnly()
export class AdminCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Query() query: AdminListCommentsDto) {
    return this.commentsService.listAdmin(query);
  }

  @Patch(':id')
  setStatus(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateContentStatusDto,
  ) {
    return this.commentsService.setStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIdPipe) id: number) {
    await this.commentsService.adminRemove(id);
  }
}
