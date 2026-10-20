import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'
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

export class CreateCashDto {
  @Type(() => Number)
  @IsInt({ message: '회원 번호가 올바르지 않습니다.' })
  @Min(1)
  userId!: number

  @IsIn(['입금', '출금'], { message: '유형은 입금 또는 출금이어야 합니다.' })
  type!: '입금' | '출금'

  @Type(() => Number)
  @IsInt({ message: '금액은 정수(원)여야 합니다.' })
  @Min(1, { message: '금액은 1원 이상이어야 합니다.' })
  amount!: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string
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

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string
}
