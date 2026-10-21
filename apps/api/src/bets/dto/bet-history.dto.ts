import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { DateRangeQueryDto } from '../../common/date-range.js'

const STATUSES = [
  '진행',
  '진행 중',
  '적중',
  '낙첨',
  '미적중',
  '적특',
  '취소',
] as const

export class BetHistoryQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsIn(STATUSES, { message: '배팅 상태가 올바르지 않습니다.' })
  status?: (typeof STATUSES)[number]

  @IsOptional()
  @IsString()
  @MaxLength(40)
  login?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sport?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  league?: string

  @IsOptional()
  @IsIn(['single', 'multi', '단폴더', '다폴더'], {
    message: '폴더는 단폴더 또는 다폴더여야 합니다.',
  })
  folder?: 'single' | 'multi' | '단폴더' | '다폴더'

  @IsOptional()
  @IsIn(['live', 'prematch', '라이브', '일반'], {
    message: '구분은 라이브 또는 일반이어야 합니다.',
  })
  live?: 'live' | 'prematch' | '라이브' | '일반'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stakeMin?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stakeMax?: number

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cursor?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
