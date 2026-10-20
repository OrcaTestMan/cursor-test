import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DateRangeQueryDto } from '../../common/date-range.js';
import { trimString } from '../../common/text.js';
import type {
  ReportReason,
  ReportStatus,
  ReportTarget,
} from '../../db/columns.js';

export const REPORT_TARGETS = ['post', 'comment', 'chat'] as const satisfies readonly ReportTarget[];
export const REPORT_REASONS = [
  'abuse',
  'obscene',
  'spam',
  'privacy',
  'etc',
] as const satisfies readonly ReportReason[];
export const REPORT_STATUSES = [
  'pending',
  'resolved',
  'rejected',
] as const satisfies readonly ReportStatus[];
export const REPORT_ACTIONS = ['hide', 'delete', 'dismiss'] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];
export const REPORT_SORTS = ['pending_old', 'latest', 'count'] as const;
export type ReportSort = (typeof REPORT_SORTS)[number];
export const BLOCK_DAYS = [0, 1, 3, 7, 14, 30] as const;

const TARGET_MESSAGE = '신고 대상은 post, comment 중 하나여야 합니다.';
const TARGET_ID_MESSAGE = '신고 대상 번호가 올바르지 않습니다.';
const REASON_MESSAGE = '신고 사유는 abuse, obscene, spam, privacy, etc 중 하나여야 합니다.';
const DETAIL_MESSAGE = '신고 내용은 300자까지 쓸 수 있습니다.';
const STATUS_MESSAGE = '상태는 pending, resolved, rejected 중 하나여야 합니다.';
const NOTE_MESSAGE = '처리 메모는 300자까지 쓸 수 있습니다.';

export class CreateReportDto {
  @IsIn(REPORT_TARGETS, { message: TARGET_MESSAGE })
  targetType!: ReportTarget;

  @IsInt({ message: TARGET_ID_MESSAGE })
  @Min(1, { message: TARGET_ID_MESSAGE })
  targetId!: number;

  @IsIn(REPORT_REASONS, { message: REASON_MESSAGE })
  reason!: ReportReason;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: DETAIL_MESSAGE })
  @MaxLength(300, { message: DETAIL_MESSAGE })
  detail?: string;
}

export class AdminListReportsDto extends DateRangeQueryDto {
  @IsOptional()
  @IsIn(REPORT_STATUSES, { message: STATUS_MESSAGE })
  status?: ReportStatus;

  @IsOptional()
  @IsIn(REPORT_TARGETS, { message: TARGET_MESSAGE })
  targetType?: ReportTarget;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '검색어는 100자까지 쓸 수 있습니다.' })
  @MaxLength(100, { message: '검색어는 100자까지 쓸 수 있습니다.' })
  q?: string;

  @IsOptional()
  @IsIn(REPORT_REASONS, { message: REASON_MESSAGE })
  reason?: ReportReason;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '신고 수가 올바르지 않습니다.' })
  @Min(1, { message: '신고 수는 1 이상이어야 합니다.' })
  minCount?: number;

  @IsOptional()
  @IsIn(REPORT_SORTS, { message: '정렬 값이 올바르지 않습니다.' })
  sort?: ReportSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '대기 시간이 올바르지 않습니다.' })
  @Min(1, { message: '대기 시간은 1 이상이어야 합니다.' })
  pendingHours?: number;
}

export class ResolveReportDto {
  @IsIn(REPORT_TARGETS, { message: TARGET_MESSAGE })
  targetType!: ReportTarget;

  @IsInt({ message: TARGET_ID_MESSAGE })
  @Min(1, { message: TARGET_ID_MESSAGE })
  targetId!: number;

  @IsIn(REPORT_ACTIONS, { message: '처리 방식은 hide, delete, dismiss 중 하나여야 합니다.' })
  action!: ReportAction;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: NOTE_MESSAGE })
  @MaxLength(300, { message: NOTE_MESSAGE })
  note?: string;

  @IsOptional()
  @IsIn(BLOCK_DAYS, { message: '차단 기간은 0, 1, 3, 7, 14, 30일 중 하나여야 합니다.' })
  blockDays?: number;
}
