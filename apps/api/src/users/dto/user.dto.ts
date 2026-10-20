import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { DateRangeQueryDto } from '../../common/date-range.js';
import { PaginationQueryDto } from '../../common/pagination.js';
import { toBoolean } from '../../common/search-query.js';
import { trimString } from '../../common/text.js';
import type { Role, UserStatus } from '../../db/columns.js';

export const ROLES = ['user', 'admin'] as const satisfies readonly Role[];
export const USER_STATUSES = [
  'active',
  'blocked',
] as const satisfies readonly UserStatus[];
export const LIST_USER_STATUSES = [
  'active',
  'blocked',
  'deleted',
] as const satisfies readonly UserStatus[];
export const BLOCK_DAYS = [0, 1, 3, 7, 14, 30] as const;

const ROLE_MESSAGE = '권한은 user, admin 중 하나여야 합니다.';
const STATUS_MESSAGE = '상태는 active, blocked 중 하나여야 합니다.';
const LIST_STATUS_MESSAGE = '상태는 active, blocked, deleted 중 하나여야 합니다.';
const BLOCK_DAYS_MESSAGE = '차단 기간은 0, 1, 3, 7, 14, 30일 중 하나여야 합니다.';

const isDefined = (_: object, value: unknown) => value !== undefined;

export const USER_DATE_FIELDS = ['created', 'lastLogin', 'blocked'] as const;
export const BLOCK_KINDS = ['permanent', 'timed'] as const;
export type UserDateField = (typeof USER_DATE_FIELDS)[number];
export const USER_SORTS = [
  'created_desc',
  'created_asc',
  'login_desc',
  'login_asc',
  'posts_desc',
  'comments_desc',
] as const;
export type UserSort = (typeof USER_SORTS)[number];

export class AdminListUsersDto extends DateRangeQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  @MaxLength(50, { message: '검색어는 50자까지 쓸 수 있습니다.' })
  q?: string;

  @IsOptional()
  @IsIn(LIST_USER_STATUSES, { message: LIST_STATUS_MESSAGE })
  status?: UserStatus;

  @IsOptional()
  @IsIn(ROLES, { message: ROLE_MESSAGE })
  role?: Role;

  @IsOptional()
  @IsIn(USER_DATE_FIELDS, { message: '날짜 기준은 created, lastLogin, blocked 중 하나여야 합니다.' })
  dateField?: UserDateField;

  @IsOptional()
  @IsIn(BLOCK_KINDS, { message: '차단 구분은 permanent 또는 timed여야 합니다.' })
  blockKind?: (typeof BLOCK_KINDS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '해제 예정 시간이 올바르지 않습니다.' })
  @Min(1, { message: '해제 예정 시간은 1 이상이어야 합니다.' })
  expireWithinHours?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '로그인 기록 여부는 true 또는 false여야 합니다.' })
  hasLogin?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '미로그인 경과일이 올바르지 않습니다.' })
  @Min(1, { message: '미로그인 경과일은 1 이상이어야 합니다.' })
  inactiveDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '글 수가 올바르지 않습니다.' })
  @Min(0, { message: '글 수는 0 이상이어야 합니다.' })
  minPosts?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '글 수가 올바르지 않습니다.' })
  @Min(0, { message: '글 수는 0 이상이어야 합니다.' })
  maxPosts?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '댓글 수가 올바르지 않습니다.' })
  @Min(0, { message: '댓글 수는 0 이상이어야 합니다.' })
  minComments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '댓글 수가 올바르지 않습니다.' })
  @Min(0, { message: '댓글 수는 0 이상이어야 합니다.' })
  maxComments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '팀 번호가 올바르지 않습니다.' })
  @Min(1, { message: '팀 번호가 올바르지 않습니다.' })
  teamId?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '자기소개 여부는 true 또는 false여야 합니다.' })
  hasBio?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '프로필 이미지 여부는 true 또는 false여야 합니다.' })
  hasAvatar?: boolean;

  @IsOptional()
  @IsIn(USER_SORTS, { message: '정렬 값이 올바르지 않습니다.' })
  sort?: UserSort;
}

export class AdminLookupUsersDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  @MaxLength(50, { message: '검색어는 50자까지 쓸 수 있습니다.' })
  q?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '자기소개는 문자열이어야 합니다.' })
  @MaxLength(160, { message: '자기소개는 160자까지 쓸 수 있습니다.' })
  bio?: string;

  @IsOptional()
  @IsArray({ message: '응원팀 목록이 올바르지 않습니다.' })
  @ArrayMaxSize(10, { message: '응원팀은 10개까지 고를 수 있습니다.' })
  @IsInt({ each: true, message: '팀 번호가 올바르지 않습니다.' })
  teamIds?: number[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt({ message: '대표 응원팀 번호가 올바르지 않습니다.' })
  @Min(1, { message: '대표 응원팀 번호가 올바르지 않습니다.' })
  primaryTeamId?: number | null;
}

export class UpdateUserDto {
  @ValidateIf(isDefined)
  @IsIn(ROLES, { message: ROLE_MESSAGE })
  role?: Role;

  @ValidateIf(isDefined)
  @IsIn(USER_STATUSES, { message: STATUS_MESSAGE })
  status?: (typeof USER_STATUSES)[number];

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '차단 사유는 문자열이어야 합니다.' })
  @MaxLength(200, { message: '차단 사유는 200자까지 쓸 수 있습니다.' })
  blockedReason?: string | null;

  @ValidateIf(isDefined)
  @IsIn(BLOCK_DAYS, { message: BLOCK_DAYS_MESSAGE })
  blockDays?: (typeof BLOCK_DAYS)[number];
}
