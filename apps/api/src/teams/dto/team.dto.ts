import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { DateRangeQueryDto } from '../../common/date-range.js';
import { toBoolean } from '../../common/search-query.js';
import { trimString } from '../../common/text.js';

export class AdminListTeamsDto extends DateRangeQueryDto {
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
  @Type(() => Number)
  @IsInt({ message: '리그 번호가 올바르지 않습니다.' })
  @Min(1, { message: '리그 번호가 올바르지 않습니다.' })
  leagueId?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '활성 여부는 true 또는 false여야 합니다.' })
  active?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '미연결 여부는 true 또는 false여야 합니다.' })
  unlinked?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: '경기 여부는 true 또는 false여야 합니다.' })
  hasMatches?: boolean;
}

export class CreateTeamDto {
  @Transform(trimString)
  @IsString({ message: '팀 이름을 입력해 주세요.' })
  @Length(1, 50, { message: '팀 이름은 1~50자로 입력해 주세요.' })
  name!: string;

  @Transform(trimString)
  @IsString({ message: '종목을 입력해 주세요.' })
  @Length(1, 20, { message: '종목은 1~20자로 입력해 주세요.' })
  sport!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt({ message: '리그 번호가 올바르지 않습니다.' })
  @Min(1, { message: '리그 번호가 올바르지 않습니다.' })
  leagueId?: number | null;
}

export class UpdateTeamDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '팀 이름을 입력해 주세요.' })
  @Length(1, 50, { message: '팀 이름은 1~50자로 입력해 주세요.' })
  name?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '종목을 입력해 주세요.' })
  @Length(1, 20, { message: '종목은 1~20자로 입력해 주세요.' })
  sport?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt({ message: '리그 번호가 올바르지 않습니다.' })
  @Min(1, { message: '리그 번호가 올바르지 않습니다.' })
  leagueId?: number | null;

  @IsOptional()
  @IsBoolean({ message: '활성 여부는 true 또는 false여야 합니다.' })
  active?: boolean;
}
