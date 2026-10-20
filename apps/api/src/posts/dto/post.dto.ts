import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DateRangeQueryDto } from '../../common/date-range.js';
import { toBoolean } from '../../common/search-query.js';
import { trimString } from '../../common/text.js';
import type { Category, ContentStatus } from '../../db/columns.js';

export const POST_CATEGORIES = [
  'notice',
  'free',
  'match',
  'humor',
  'review',
  'news',
] as const satisfies readonly Category[];

export const CONTENT_STATUSES = [
  'pending',
  'visible',
  'hidden',
] as const satisfies readonly ContentStatus[];

const CATEGORY_MESSAGE =
  '분류는 notice, free, match, humor, review, news 중 하나여야 합니다.';
const STATUS_MESSAGE = '상태는 pending, visible, hidden 중 하나여야 합니다.';
const MATCH_MESSAGE = '경기 번호가 올바르지 않습니다.';
const TITLE_MESSAGE = '제목은 1~100자로 입력해 주세요.';
const BODY_MESSAGE = '내용은 1~5000자로 입력해 주세요.';
const COMMENT_MESSAGE = '댓글은 1~500자로 입력해 주세요.';
const Q_MESSAGE = '검색어는 100자까지 쓸 수 있습니다.';

export const SEARCH_TYPES = ['title', 'title_body', 'author'] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];
export const POST_SORTS = ['latest', 'oldest', 'likes', 'views', 'comments'] as const;
export type PostSort = (typeof POST_SORTS)[number];
export const POLL_FILTERS = ['none', 'open', 'closed'] as const;

const TAG_MESSAGE = '말머리는 1~20자로 입력해 주세요.';
const SEARCH_TYPE_MESSAGE = '검색 방식은 title, title_body, author 중 하나여야 합니다.';

const isDefined = (_: object, value: unknown) => value !== undefined;
const isPresent = (_: object, value: unknown) =>
  value !== undefined && value !== null;

export class ListPostsDto extends DateRangeQueryDto {
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

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '인기글 여부는 true 또는 false여야 합니다.' })
  best?: boolean;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: TAG_MESSAGE })
  @Length(1, 20, { message: TAG_MESSAGE })
  tag?: string;

  @IsOptional()
  @IsIn(SEARCH_TYPES, { message: SEARCH_TYPE_MESSAGE })
  searchType?: SearchType;

  @IsOptional()
  @IsIn(POST_SORTS, { message: '정렬 값이 올바르지 않습니다.' })
  sort?: PostSort;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '공지 포함 여부는 true 또는 false여야 합니다.' })
  includeNotice?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '댓글 여부는 true 또는 false여야 합니다.' })
  hasComments?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '추천 수가 올바르지 않습니다.' })
  @Min(0, { message: '추천 수는 0 이상이어야 합니다.' })
  minLikes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '댓글 수가 올바르지 않습니다.' })
  @Min(0, { message: '댓글 수는 0 이상이어야 합니다.' })
  minCommentCount?: number;

  @IsOptional()
  @IsIn(POLL_FILTERS, { message: '투표 조건이 올바르지 않습니다.' })
  poll?: (typeof POLL_FILTERS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '팀 번호가 올바르지 않습니다.' })
  @Min(1, { message: '팀 번호가 올바르지 않습니다.' })
  teamId?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '이미지 여부는 true 또는 false여야 합니다.' })
  hasImage?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '팔로우 여부는 true 또는 false여야 합니다.' })
  followed?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '작성자 번호가 올바르지 않습니다.' })
  @Min(1, { message: '작성자 번호가 올바르지 않습니다.' })
  authorId?: number;
}

export class ListMinePostsDto extends DateRangeQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;
}

export class AdminListPostsDto extends DateRangeQueryDto {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '작성자 번호가 올바르지 않습니다.' })
  @Min(1, { message: '작성자 번호가 올바르지 않습니다.' })
  authorId?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '이미지 여부는 true 또는 false여야 합니다.' })
  hasImage?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '추천 수가 올바르지 않습니다.' })
  @Min(0, { message: '추천 수는 0 이상이어야 합니다.' })
  minLikes?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '인기글 제외 여부는 true 또는 false여야 합니다.' })
  bestExcluded?: boolean;

  @IsOptional()
  @IsIn(POST_SORTS, { message: '정렬 값이 올바르지 않습니다.' })
  sort?: PostSort;
}

export class AdminListCommentsDto extends DateRangeQueryDto {
  @IsOptional()
  @IsIn(CONTENT_STATUSES, { message: STATUS_MESSAGE })
  status?: ContentStatus;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '작성자 번호가 올바르지 않습니다.' })
  @Min(1, { message: '작성자 번호가 올바르지 않습니다.' })
  authorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '글 번호가 올바르지 않습니다.' })
  @Min(1, { message: '글 번호가 올바르지 않습니다.' })
  postId?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '답글 여부는 true 또는 false여야 합니다.' })
  reply?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '삭제 여부는 true 또는 false여야 합니다.' })
  deleted?: boolean;
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

  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString({ message: TAG_MESSAGE })
  @Length(1, 20, { message: TAG_MESSAGE })
  tag?: string | null;

  @IsOptional()
  @IsArray({ message: '이미지 목록이 올바르지 않습니다.' })
  @ArrayMaxSize(10, { message: '이미지는 글 하나당 10장까지 올릴 수 있습니다.' })
  @IsInt({ each: true, message: '이미지 번호가 올바르지 않습니다.' })
  imageIds?: number[];

  @IsOptional()
  @IsArray({ message: '팀 목록이 올바르지 않습니다.' })
  @ArrayMaxSize(5, { message: '관련 팀은 5개까지 고를 수 있습니다.' })
  @IsInt({ each: true, message: '팀 번호가 올바르지 않습니다.' })
  teamIds?: number[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PollInputDto)
  poll?: PollInputDto | null;
}

export class PollInputDto {
  @IsArray({ message: '선택지 목록이 올바르지 않습니다.' })
  @ArrayMinSize(2, { message: '선택지는 2~10개여야 합니다.' })
  @ArrayMaxSize(10, { message: '선택지는 2~10개여야 합니다.' })
  @IsString({ each: true, message: '선택지는 문자열이어야 합니다.' })
  options!: string[];

  @IsDateString({}, { message: '마감 시각이 올바르지 않습니다.' })
  closesAt!: string;
}

export class VotePollDto {
  @Type(() => Number)
  @IsInt({ message: '선택지 번호가 올바르지 않습니다.' })
  @Min(1, { message: '선택지 번호가 올바르지 않습니다.' })
  optionId!: number;
}

export class ListPollsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '팀 번호가 올바르지 않습니다.' })
  @Min(1, { message: '팀 번호가 올바르지 않습니다.' })
  teamId?: number;
}

export class UpdatePostDto {
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString({ message: TAG_MESSAGE })
  @Length(1, 20, { message: TAG_MESSAGE })
  tag?: string | null;

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

  @IsOptional()
  @IsArray({ message: '이미지 목록이 올바르지 않습니다.' })
  @ArrayMaxSize(10, { message: '이미지는 글 하나당 10장까지 올릴 수 있습니다.' })
  @IsInt({ each: true, message: '이미지 번호가 올바르지 않습니다.' })
  imageIds?: number[];

  @IsOptional()
  @IsArray({ message: '팀 목록이 올바르지 않습니다.' })
  @ArrayMaxSize(5, { message: '관련 팀은 5개까지 고를 수 있습니다.' })
  @IsInt({ each: true, message: '팀 번호가 올바르지 않습니다.' })
  teamIds?: number[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => PollInputDto)
  poll?: PollInputDto | null;
}

export class CreateCommentDto {
  @IsString({ message: '댓글을 입력해 주세요.' })
  @Matches(/\S/, { message: '댓글을 입력해 주세요.' })
  @Length(1, 500, { message: COMMENT_MESSAGE })
  body!: string;

  @ValidateIf(isPresent)
  @IsInt({ message: '원 댓글 번호가 올바르지 않습니다.' })
  @Min(1, { message: '원 댓글 번호가 올바르지 않습니다.' })
  parentId?: number | null;
}

export class UpdateContentStatusDto {
  @IsIn(CONTENT_STATUSES, { message: STATUS_MESSAGE })
  status!: ContentStatus;
}

export class AdminUpdatePostDto {
  @IsOptional()
  @IsIn(CONTENT_STATUSES, { message: STATUS_MESSAGE })
  status?: ContentStatus;

  @IsOptional()
  @IsBoolean({ message: '인기글 제외 여부는 true 또는 false여야 합니다.' })
  bestExcluded?: boolean;
}
