import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DateRangeQueryDto } from '../../common/date-range.js';
import { trimString } from '../../common/text.js';
import type { InquiryStatus } from '../../db/columns.js';

export const INQUIRY_STATUSES = [
  'waiting',
  'answered',
] as const satisfies readonly InquiryStatus[];
export const INQUIRY_DATE_FIELDS = ['created', 'answered'] as const;
export type InquiryDateField = (typeof INQUIRY_DATE_FIELDS)[number];
export const INQUIRY_SORTS = [
  'waiting_old',
  'created_desc',
  'created_asc',
  'answered_desc',
] as const;
export type InquirySort = (typeof INQUIRY_SORTS)[number];

const Q_MESSAGE = '검색어는 100자까지 쓸 수 있습니다.';

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

export class ListMineInquiriesDto extends DateRangeQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;
}

export class AdminListInquiriesDto extends DateRangeQueryDto {
  @IsOptional()
  @IsIn(INQUIRY_STATUSES, {
    message: '상태는 waiting, answered 중 하나여야 합니다.',
  })
  status?: InquiryStatus;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: Q_MESSAGE })
  @MaxLength(100, { message: Q_MESSAGE })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '회원 번호가 올바르지 않습니다.' })
  @Min(1, { message: '회원 번호가 올바르지 않습니다.' })
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '문의 번호가 올바르지 않습니다.' })
  @Min(1, { message: '문의 번호가 올바르지 않습니다.' })
  id?: number;

  @IsOptional()
  @IsIn(INQUIRY_DATE_FIELDS, {
    message: '날짜 기준은 created, answered 중 하나여야 합니다.',
  })
  dateField?: InquiryDateField;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '대기 시간이 올바르지 않습니다.' })
  @Min(1, { message: '대기 시간은 1 이상이어야 합니다.' })
  waitingHours?: number;

  @IsOptional()
  @IsIn(INQUIRY_SORTS, { message: '정렬 값이 올바르지 않습니다.' })
  sort?: InquirySort;
}
