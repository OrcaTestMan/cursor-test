import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
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
