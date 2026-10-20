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
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { CommentsService } from './comments.service.js';
import {
  AdminListCommentsDto,
  AdminListPostsDto,
  AdminUpdatePostDto,
  CreateCommentDto,
  CreatePostDto,
  ListMinePostsDto,
  ListPollsDto,
  ListPostsDto,
  UpdateContentStatusDto,
  UpdatePostDto,
  VotePollDto,
} from './dto/post.dto.js';
import { PollsService } from './polls.service.js';
import { PostsService } from './posts.service.js';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
    private readonly pollsService: PollsService,
  ) {}

  @Get()
  list(
    @Query() query: ListPostsDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.postsService.list(query, user);
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

  @Post(':id/like')
  @LoginRequired()
  @HttpCode(200)
  like(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.postsService.like(id, user);
  }

  @Delete(':id/like')
  @LoginRequired()
  unlike(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.postsService.unlike(id, user);
  }

  @Post(':id/bookmark')
  @LoginRequired()
  @HttpCode(200)
  bookmark(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.postsService.bookmark(id, user);
  }

  @Delete(':id/bookmark')
  @LoginRequired()
  unbookmark(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.postsService.unbookmark(id, user);
  }

  @Post(':id/poll/vote')
  @LoginRequired()
  @HttpCode(200)
  votePoll(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: VotePollDto,
  ) {
    return this.pollsService.vote(id, user, dto.optionId);
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

  @Get('hot')
  listHot() {
    return this.commentsService.listHot();
  }

  @Post(':id/like')
  @LoginRequired()
  @HttpCode(200)
  like(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.commentsService.like(id, user);
  }

  @Delete(':id/like')
  @LoginRequired()
  unlike(@Param('id', ParseIdPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.commentsService.unlike(id, user);
  }

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

@Controller('me')
@LoginRequired()
export class MyPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('posts')
  list(@CurrentUser() user: AuthUser, @Query() query: ListMinePostsDto) {
    return this.postsService.listMine(user, query);
  }

  @Get('bookmarks')
  bookmarks(
    @CurrentUser() user: AuthUser,
    @Query() query: ListMinePostsDto,
  ) {
    return this.postsService.listBookmarks(user, query);
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
  update(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminUpdatePostDto,
  ) {
    return this.postsService.adminUpdate(id, user, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.postsService.adminRemove(id, user);
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
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateContentStatusDto,
  ) {
    return this.commentsService.setStatus(id, user, dto.status);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.commentsService.adminRemove(id, user);
  }
}

@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Get()
  list(@Query() query: ListPollsDto) {
    return this.pollsService.listOpen(8, query.teamId);
  }
}
