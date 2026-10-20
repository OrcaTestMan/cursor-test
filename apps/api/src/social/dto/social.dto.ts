import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { DateRangeQueryDto } from '../../common/date-range.js';
import { trimString } from '../../common/text.js';

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '댓글 알림은 true 또는 false여야 합니다.' })
  comment?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '답글 알림은 true 또는 false여야 합니다.' })
  reply?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '멘션 알림은 true 또는 false여야 합니다.' })
  mention?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '구독 알림은 true 또는 false여야 합니다.' })
  subscribe?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '팔로우 알림은 true 또는 false여야 합니다.' })
  follow?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '문의 답변 알림은 true 또는 false여야 합니다.' })
  inquiry_answer?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '쪽지 알림은 true 또는 false여야 합니다.' })
  message?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '신고 결과 알림은 true 또는 false여야 합니다.' })
  report_result?: boolean;
}

export class ListMineFollowingDto extends DateRangeQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '검색어는 50자까지 쓸 수 있습니다.' })
  @MaxLength(50, { message: '검색어는 50자까지 쓸 수 있습니다.' })
  q?: string;
}
