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
import { DATE_RANGES, DateRangeQueryDto, type DateRangeMode } from '../../common/date-range.js';
import { DATE_PATTERN } from '../../common/kst.js';
import { trimString } from '../../common/text.js';

export const CHEER_SIDES = ['home', 'away'] as const;
export const PREDICTION_PICKS = ['home', 'draw', 'away'] as const;

export type CheerSide = (typeof CHEER_SIDES)[number];
export type PredictionPick = (typeof PREDICTION_PICKS)[number];

export class CheerDto {
  @IsIn(CHEER_SIDES, { message: '응원 팀은 home, away 중 하나여야 합니다.' })
  side!: CheerSide;
}

export class PredictionDto {
  @IsIn(PREDICTION_PICKS, {
    message: '예측은 home, draw, away 중 하나여야 합니다.',
  })
  pick!: PredictionPick;
}

export class RankingQueryDto extends DateRangeQueryDto {
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
  @Type(() => Number)
  @IsInt({ message: '팀 번호가 올바르지 않습니다.' })
  @Min(1, { message: '팀 번호가 올바르지 않습니다.' })
  teamId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '확정 경기 수가 올바르지 않습니다.' })
  @Min(0, { message: '확정 경기 수는 0 이상이어야 합니다.' })
  minDecided?: number;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '검색어는 50자까지 쓸 수 있습니다.' })
  @MaxLength(50, { message: '검색어는 50자까지 쓸 수 있습니다.' })
  q?: string;
}

/** 누적 순위가 비지 않도록 range 기본값은 서비스에서 all. */
export class StandingsQueryDto {
  @IsOptional()
  @IsIn(DATE_RANGES, { message: '기간은 today, custom, all 중 하나여야 합니다.' })
  range?: DateRangeMode;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: '날짜는 YYYY-MM-DD 형식으로 입력해 주세요.' })
  from?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: '날짜는 YYYY-MM-DD 형식으로 입력해 주세요.' })
  to?: string;
}
