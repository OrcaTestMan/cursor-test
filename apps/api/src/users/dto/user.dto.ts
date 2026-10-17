import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { trimString } from '../../common/text.js';
import type { Role, UserStatus } from '../../db/columns.js';

export const ROLES = ['user', 'admin'] as const satisfies readonly Role[];
export const USER_STATUSES = [
  'active',
  'blocked',
] as const satisfies readonly UserStatus[];

const ROLE_MESSAGE = '권한은 user, admin 중 하나여야 합니다.';
const STATUS_MESSAGE = '상태는 active, blocked 중 하나여야 합니다.';

const isDefined = (_: object, value: unknown) => value !== undefined;

export class AdminListUsersDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  @MaxLength(50, { message: '검색어는 50자까지 쓸 수 있습니다.' })
  q?: string;

  @IsOptional()
  @IsIn(USER_STATUSES, { message: STATUS_MESSAGE })
  status?: UserStatus;

  @IsOptional()
  @IsIn(ROLES, { message: ROLE_MESSAGE })
  role?: Role;
}

export class UpdateUserDto {
  @ValidateIf(isDefined)
  @IsIn(ROLES, { message: ROLE_MESSAGE })
  role?: Role;

  @ValidateIf(isDefined)
  @IsIn(USER_STATUSES, { message: STATUS_MESSAGE })
  status?: UserStatus;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '차단 사유는 문자열이어야 합니다.' })
  @MaxLength(200, { message: '차단 사유는 200자까지 쓸 수 있습니다.' })
  blockedReason?: string | null;
}
