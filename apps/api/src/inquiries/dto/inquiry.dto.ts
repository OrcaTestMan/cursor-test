import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import type { InquiryStatus } from '../../db/columns.js';

export const INQUIRY_STATUSES = [
  'waiting',
  'answered',
] as const satisfies readonly InquiryStatus[];

export class CreateInquiryDto {
  @IsString({ message: '제목을 입력해 주세요.' })
  @Matches(/\S/, { message: '제목을 입력해 주세요.' })
  @Length(1, 100, { message: '제목은 1~100자로 입력해 주세요.' })
  title!: string;

  @IsString({ message: '내용을 입력해 주세요.' })
  @Matches(/\S/, { message: '내용을 입력해 주세요.' })
  @Length(1, 2000, { message: '내용은 1~2000자로 입력해 주세요.' })
  body!: string;
}

export class AnswerInquiryDto {
  @IsString({ message: '답변을 입력해 주세요.' })
  @Matches(/\S/, { message: '답변을 입력해 주세요.' })
  @Length(1, 2000, { message: '답변은 1~2000자로 입력해 주세요.' })
  answer!: string;
}

export class AdminListInquiriesDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(INQUIRY_STATUSES, {
    message: '상태는 waiting, answered 중 하나여야 합니다.',
  })
  status?: InquiryStatus;
}
