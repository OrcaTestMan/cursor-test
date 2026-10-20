import { Type } from 'class-transformer'
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'
import { DateRangeQueryDto } from '../../common/date-range.js'

export class MoneyMoveListQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '회원 번호가 올바르지 않습니다.' })
  @Min(1, { message: '회원 번호는 1 이상이어야 합니다.' })
  userId?: number
}

export class AdminAdjustDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number

  /** +지급 / -회수 (0 금지) */
  @Type(() => Number)
  @IsInt()
  amount!: number

  @IsString()
  @MaxLength(40)
  reason!: string

  @IsString()
  @MaxLength(200)
  memo!: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string
}

export class PointConvertDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number

  /** 전환할 포인트(양수) → 머니로 가산 */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  points!: number

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string
}
