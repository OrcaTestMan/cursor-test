import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { DateRangeQueryDto } from '../../common/date-range.js'

export class CashListQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string

  @IsOptional()
  @IsIn(['입금', '출금'], { message: '유형은 입금 또는 출금이어야 합니다.' })
  type?: '입금' | '출금'

  @IsOptional()
  @IsIn(['대기', '승인', '거절', '지급 실패'], {
    message: '상태가 올바르지 않습니다.',
  })
  status?: '대기' | '승인' | '거절' | '지급 실패'
}

export class UpdateCashStatusDto {
  @IsIn(['승인', '거절', '지급 실패'], {
    message: '상태는 승인, 거절, 지급 실패 중 하나여야 합니다.',
  })
  status!: '승인' | '거절' | '지급 실패'

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string
}
