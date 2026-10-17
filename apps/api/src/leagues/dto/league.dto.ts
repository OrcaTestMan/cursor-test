import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { trimString } from '../../common/text.js';

export class CreateLeagueDto {
  @Transform(trimString)
  @IsString({ message: '리그 이름을 입력해 주세요.' })
  @Length(1, 50, { message: '리그 이름은 1~50자로 입력해 주세요.' })
  name!: string;

  @Transform(trimString)
  @IsString({ message: '종목을 입력해 주세요.' })
  @Length(1, 20, { message: '종목은 1~20자로 입력해 주세요.' })
  sport!: string;
}

export class UpdateLeagueDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '리그 이름을 입력해 주세요.' })
  @Matches(/\S/, { message: '리그 이름을 입력해 주세요.' })
  @Length(1, 50, { message: '리그 이름은 1~50자로 입력해 주세요.' })
  name?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '종목을 입력해 주세요.' })
  @Matches(/\S/, { message: '종목을 입력해 주세요.' })
  @Length(1, 20, { message: '종목은 1~20자로 입력해 주세요.' })
  sport?: string;
}
