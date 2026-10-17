import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { trimString } from '../../common/text.js';
import type { Category, ContentStatus } from '../../db/columns.js';

export const POST_CATEGORIES = [
  'notice',
  'free',
  'match',
] as const satisfies readonly Category[];

export const CONTENT_STATUSES = [
  'pending',
  'visible',
  'hidden',
] as const satisfies readonly ContentStatus[];

const CATEGORY_MESSAGE = '분류는 notice, free, match 중 하나여야 합니다.';
const STATUS_MESSAGE = '상태는 pending, visible, hidden 중 하나여야 합니다.';
const MATCH_MESSAGE = '경기 번호가 올바르지 않습니다.';
const TITLE_MESSAGE = '제목은 1~100자로 입력해 주세요.';
const BODY_MESSAGE = '내용은 1~5000자로 입력해 주세요.';
const COMMENT_MESSAGE = '댓글은 1~500자로 입력해 주세요.';
const Q_MESSAGE = '검색어는 100자까지 쓸 수 있습니다.';

const isDefined = (_: object, value: unknown) => value !== undefined;

export class ListPostsDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(POST_CATEGORIES, { message: CATEGORY_MESSAGE })
  category?: Category;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: MATCH_MESSAGE })
  @Min(1, { message: MATCH_MESSAGE })
  matchId?: number;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;
}

export class AdminListPostsDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(CONTENT_STATUSES, { message: STATUS_MESSAGE })
  status?: ContentStatus;

  @IsOptional()
  @IsIn(POST_CATEGORIES, { message: CATEGORY_MESSAGE })
  category?: Category;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;
}

export class AdminListCommentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(CONTENT_STATUSES, { message: STATUS_MESSAGE })
  status?: ContentStatus;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;
}

export class CreatePostDto {
  @IsIn(POST_CATEGORIES, { message: CATEGORY_MESSAGE })
  category!: Category;

  @IsOptional()
  @IsInt({ message: MATCH_MESSAGE })
  @Min(1, { message: MATCH_MESSAGE })
  matchId?: number | null;

  @IsString({ message: '제목을 입력해 주세요.' })
  @Matches(/\S/, { message: '제목을 입력해 주세요.' })
  @Length(1, 100, { message: TITLE_MESSAGE })
  title!: string;

  @IsString({ message: '내용을 입력해 주세요.' })
  @Matches(/\S/, { message: '내용을 입력해 주세요.' })
  @Length(1, 5000, { message: BODY_MESSAGE })
  body!: string;
}

export class UpdatePostDto {
  @ValidateIf(isDefined)
  @IsString({ message: '제목을 입력해 주세요.' })
  @Matches(/\S/, { message: '제목을 입력해 주세요.' })
  @Length(1, 100, { message: TITLE_MESSAGE })
  title?: string;

  @ValidateIf(isDefined)
  @IsString({ message: '내용을 입력해 주세요.' })
  @Matches(/\S/, { message: '내용을 입력해 주세요.' })
  @Length(1, 5000, { message: BODY_MESSAGE })
  body?: string;
}

export class CreateCommentDto {
  @IsString({ message: '댓글을 입력해 주세요.' })
  @Matches(/\S/, { message: '댓글을 입력해 주세요.' })
  @Length(1, 500, { message: COMMENT_MESSAGE })
  body!: string;
}

export class UpdateContentStatusDto {
  @IsIn(CONTENT_STATUSES, { message: STATUS_MESSAGE })
  status!: ContentStatus;
}
