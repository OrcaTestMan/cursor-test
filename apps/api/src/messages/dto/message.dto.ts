import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DateRangeQueryDto } from '../../common/date-range.js';
import { toBoolean } from '../../common/search-query.js';
import { trimString } from '../../common/text.js';

const Q_MESSAGE = '검색어는 100자까지 쓸 수 있습니다.';

export class SendMessageDto {
  @IsOptional()
  @IsInt({ message: '받는 회원 번호가 올바르지 않습니다.' })
  @Min(1, { message: '받는 회원 번호가 올바르지 않습니다.' })
  toUserId?: number | null;

  @IsOptional()
  @IsBoolean({ message: '전체 발송 여부는 true 또는 false여야 합니다.' })
  toAll?: boolean | null;

  @IsString({ message: '제목을 입력해 주세요.' })
  @Matches(/\S/, { message: '제목을 입력해 주세요.' })
  @Length(1, 100, { message: '제목은 1~100자로 입력해 주세요.' })
  title!: string;

  @IsString({ message: '내용을 입력해 주세요.' })
  @Matches(/\S/, { message: '내용을 입력해 주세요.' })
  @Length(1, 2000, { message: '내용은 1~2000자로 입력해 주세요.' })
  body!: string;
}

export class ListMineMessagesDto extends DateRangeQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '읽지 않음 여부는 true 또는 false여야 합니다.' })
  unread?: boolean;
}

export class AdminListMessagesDto extends DateRangeQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '전체 발송 여부는 true 또는 false여야 합니다.' })
  toAll?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '받는 회원 번호가 올바르지 않습니다.' })
  @Min(1, { message: '받는 회원 번호가 올바르지 않습니다.' })
  toUserId?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '미읽음 여부는 true 또는 false여야 합니다.' })
  unreadOnly?: boolean;
}
