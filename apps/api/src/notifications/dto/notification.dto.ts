import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { DateRangeQueryDto } from '../../common/date-range.js';
import { toBoolean } from '../../common/search-query.js';
import { trimString } from '../../common/text.js';
import type { NotificationType } from '../../db/columns.js';

export const NOTIFICATION_TYPES = [
  'comment',
  'reply',
  'inquiry_answer',
  'message',
  'report_result',
  'mention',
  'subscribe',
  'follow',
] as const satisfies readonly NotificationType[];

export class ListNotificationsDto extends DateRangeQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '검색어는 100자까지 쓸 수 있습니다.' })
  @MaxLength(100, { message: '검색어는 100자까지 쓸 수 있습니다.' })
  q?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '읽지 않음 여부는 true 또는 false여야 합니다.' })
  unread?: boolean;

  @IsOptional()
  @IsIn(NOTIFICATION_TYPES, { message: '알림 종류가 올바르지 않습니다.' })
  type?: NotificationType;
}
