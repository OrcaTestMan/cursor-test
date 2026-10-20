import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DateRangeQueryDto } from '../../common/date-range.js';
import { toBoolean } from '../../common/search-query.js';
import { trimString } from '../../common/text.js';

export class AdminListLeaguesDto extends DateRangeQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '검색어는 50자까지 쓸 수 있습니다.' })
  @MaxLength(50, { message: '검색어는 50자까지 쓸 수 있습니다.' })
  q?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '종목은 1~20자로 입력해 주세요.' })
  @Length(1, 20, { message: '종목은 1~20자로 입력해 주세요.' })
  sport?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '경기 여부는 true 또는 false여야 합니다.' })
  hasMatches?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '경기 수가 올바르지 않습니다.' })
  @Min(0, { message: '경기 수는 0 이상이어야 합니다.' })
  minMatchCount?: number;
}

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
