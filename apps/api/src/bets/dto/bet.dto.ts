import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'
import { DateRangeQueryDto } from '../../common/date-range.js'

export class BetListQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string

  @IsOptional()
  @IsIn(['진행 중', '적중', '미적중', '취소'], {
    message: '배팅 상태가 올바르지 않습니다.',
  })
  status?: '진행 중' | '적중' | '미적중' | '취소'

  @IsOptional()
  @IsIn(['실시간', '일반'], { message: '구분은 실시간 또는 일반이어야 합니다.' })
  whenLabel?: '실시간' | '일반'
}

export class UpdateBetStatusDto {
  @IsIn(['적중', '미적중', '취소'], {
    message: '상태는 적중, 미적중, 취소 중 하나여야 합니다.',
  })
  status!: '적중' | '미적중' | '취소'
}

export class PlaceBetDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number

  @IsString()
  @MaxLength(200)
  matchName!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  league?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sport?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  market?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  line?: string

  @IsOptional()
  @IsIn(['실시간', '일반'])
  whenLabel?: '실시간' | '일반'

  @Type(() => Number)
  @IsInt()
  @Min(1)
  stake!: number

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  odds!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  potentialPayout!: number

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string
}

export class PlaceCasinoBetDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number

  @IsString()
  @MaxLength(160)
  name!: string

  @IsOptional()
  @IsIn(['live', 'slot', 'other'])
  kind?: 'live' | 'slot' | 'other'

  @Type(() => Number)
  @IsInt()
  @Min(1)
  stake!: number

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string
}

export class CasinoBetListQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string

  @IsOptional()
  @IsIn(['진행 중', '적중', '미적중', '취소'], {
    message: '배팅 상태가 올바르지 않습니다.',
  })
  status?: '진행 중' | '적중' | '미적중' | '취소'

  @IsOptional()
  @IsIn(['live', 'slot', 'other'], {
    message: '종류는 live, slot, other 중 하나여야 합니다.',
  })
  kind?: 'live' | 'slot' | 'other'
}
