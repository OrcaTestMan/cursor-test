import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsInt({ message: '받는 회원 번호가 올바르지 않습니다.' })
  @Min(1, { message: '받는 회원 번호가 올바르지 않습니다.' })
  toUserId?: number | null;

  @IsOptional()
  @IsBoolean({ message: '전체 발송 여부는 true 또는 false여야 합니다.' })
  toAll?: boolean | null;

  @IsString({ message: '제목을 입력해 주세요.' })
  @Matches(/\S/, { message: '제목을 입력해 주세요.' })
  @Length(1, 100, { message: '제목은 1~100자로 입력해 주세요.' })
  title!: string;

  @IsString({ message: '내용을 입력해 주세요.' })
  @Matches(/\S/, { message: '내용을 입력해 주세요.' })
  @Length(1, 2000, { message: '내용은 1~2000자로 입력해 주세요.' })
  body!: string;
}
