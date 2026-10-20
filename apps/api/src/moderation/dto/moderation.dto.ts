import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { DateRangeQueryDto } from '../../common/date-range.js';
import { trimString } from '../../common/text.js';

const WORD_MESSAGE = '금칙어는 1~50자로 입력해 주세요.';
const Q_MESSAGE = '검색어는 100자까지 쓸 수 있습니다.';

export class CreateForbiddenWordDto {
  @Transform(trimString)
  @IsString({ message: WORD_MESSAGE })
  @Length(1, 50, { message: WORD_MESSAGE })
  word!: string;
}

export class AdminListForbiddenWordsDto extends DateRangeQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;
}

export class AdminListLogsDto extends DateRangeQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '조치 종류는 문자열이어야 합니다.' })
  @MaxLength(50, { message: '조치 종류는 50자까지 쓸 수 있습니다.' })
  action?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '관리자 번호가 올바르지 않습니다.' })
  @Min(1, { message: '관리자 번호가 올바르지 않습니다.' })
  adminId?: number;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '대상 종류는 문자열이어야 합니다.' })
  @MaxLength(20, { message: '대상 종류는 20자까지 쓸 수 있습니다.' })
  targetType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '대상 번호가 올바르지 않습니다.' })
  @Min(1, { message: '대상 번호가 올바르지 않습니다.' })
  targetId?: number;
}
