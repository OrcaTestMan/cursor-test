import { Transform } from 'class-transformer';
import { IsBoolean, IsString, Length, Matches } from 'class-validator';
import { trimString } from '../../common/text.js';

export class UpdateSettingsDto {
  @Transform(trimString)
  @IsString({ message: '사이트 이름을 입력해 주세요.' })
  @Matches(/\S/, { message: '사이트 이름을 입력해 주세요.' })
  @Length(1, 30, { message: '사이트 이름은 1~30자로 입력해 주세요.' })
  siteName!: string;

  @IsString({ message: '공지 배너는 문자열이어야 합니다.' })
  @Length(0, 200, { message: '공지 배너는 200자까지 쓸 수 있습니다.' })
  noticeBanner!: string;

  @IsBoolean({ message: '회원가입 허용 여부는 true 또는 false여야 합니다.' })
  signupEnabled!: boolean;

  @IsBoolean({ message: '글 승인 사용 여부는 true 또는 false여야 합니다.' })
  postApprovalRequired!: boolean;
}
