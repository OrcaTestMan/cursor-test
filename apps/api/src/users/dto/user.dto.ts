import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { DateRangeQueryDto } from '../../common/date-range.js'

export class UserListQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string

  @IsOptional()
  @IsIn(['active', 'blocked'], {
    message: '상태는 active 또는 blocked 여야 합니다.',
  })
  status?: 'active' | 'blocked'
}

export class UpdateUserStatusDto {
  @IsIn(['active', 'blocked'], {
    message: '상태는 active 또는 blocked 여야 합니다.',
  })
  status!: 'active' | 'blocked'

  @IsOptional()
  @IsString()
  @MaxLength(200)
  blockReason?: string
}
