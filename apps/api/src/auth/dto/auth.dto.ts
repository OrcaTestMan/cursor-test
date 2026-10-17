import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { trimString } from '../../common/text.js';

export const USERNAME_PATTERN = /^[a-z0-9_]{4,20}$/;
export const USERNAME_MESSAGE =
  '아이디는 4~20자 영문 소문자, 숫자, _만 쓸 수 있습니다.';
export const NICKNAME_MESSAGE = '닉네임은 공백이 아닌 2~12자로 입력해 주세요.';
export const PASSWORD_MESSAGE = '비밀번호는 8~64자로 입력해 주세요.';

export class SignupDto {
  @IsString({ message: '아이디를 입력해 주세요.' })
  @Matches(USERNAME_PATTERN, { message: USERNAME_MESSAGE })
  username!: string;

  @Transform(trimString)
  @IsString({ message: '닉네임을 입력해 주세요.' })
  @Length(2, 12, { message: NICKNAME_MESSAGE })
  nickname!: string;

  @IsString({ message: '비밀번호를 입력해 주세요.' })
  @Length(8, 64, { message: PASSWORD_MESSAGE })
  password!: string;
}

export class LoginDto {
  @IsString({ message: '아이디를 입력해 주세요.' })
  @IsNotEmpty({ message: '아이디를 입력해 주세요.' })
  username!: string;

  @IsString({ message: '비밀번호를 입력해 주세요.' })
  @IsNotEmpty({ message: '비밀번호를 입력해 주세요.' })
  password!: string;
}

export class ChangePasswordDto {
  @IsString({ message: '현재 비밀번호를 입력해 주세요.' })
  @IsNotEmpty({ message: '현재 비밀번호를 입력해 주세요.' })
  currentPassword!: string;

  @IsString({ message: '새 비밀번호를 입력해 주세요.' })
  @Length(8, 64, { message: '새 비밀번호는 8~64자로 입력해 주세요.' })
  newPassword!: string;
}
