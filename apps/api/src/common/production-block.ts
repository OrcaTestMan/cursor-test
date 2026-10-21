import { ForbiddenException } from '@nestjs/common'

export function refuseMemberWriteInProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new ForbiddenException(
      '운영 환경 관리자 API에서는 이 작업을 할 수 없습니다.',
    )
  }
}

export function refuseBackfillInProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new ForbiddenException('운영 환경에서는 원장 보정을 할 수 없습니다.')
  }
}
