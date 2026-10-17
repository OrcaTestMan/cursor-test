import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { DATE_PATTERN } from '../../common/kst.js';
import { PaginationQueryDto } from '../../common/pagination.js';
import { trimString } from '../../common/text.js';
import type { MatchStatus } from '../../db/columns.js';

export const MATCH_STATUSES = [
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled',
] as const satisfies readonly MatchStatus[];

const STATUS_MESSAGE =
  '경기 상태는 scheduled, live, finished, postponed, cancelled 중 하나여야 합니다.';
const DATE_MESSAGE = '날짜는 YYYY-MM-DD 형식으로 입력해 주세요.';
const LEAGUE_MESSAGE = '리그를 골라 주세요.';
const HOME_MESSAGE = '홈 팀 이름은 1~50자로 입력해 주세요.';
const AWAY_MESSAGE = '원정 팀 이름은 1~50자로 입력해 주세요.';
const KICKOFF_MESSAGE = '시작 시각 형식이 올바르지 않습니다.';
const VENUE_MESSAGE = '경기장은 100자까지 쓸 수 있습니다.';
const SCORE_MESSAGE = '점수는 0~999 사이 정수 또는 null이어야 합니다.';

const isDefined = (_: object, value: unknown) => value !== undefined;

export class ListMatchesDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  @IsISO8601({ strict: true }, { message: DATE_MESSAGE })
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: LEAGUE_MESSAGE })
  @Min(1, { message: LEAGUE_MESSAGE })
  leagueId?: number;

  @IsOptional()
  @IsIn(MATCH_STATUSES, { message: STATUS_MESSAGE })
  status?: MatchStatus;
}

export class AdminListMatchesDto extends PaginationQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  @IsISO8601({ strict: true }, { message: DATE_MESSAGE })
  from?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  @IsISO8601({ strict: true }, { message: DATE_MESSAGE })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: LEAGUE_MESSAGE })
  @Min(1, { message: LEAGUE_MESSAGE })
  leagueId?: number;

  @IsOptional()
  @IsIn(MATCH_STATUSES, { message: STATUS_MESSAGE })
  status?: MatchStatus;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  @MaxLength(50, { message: '검색어는 50자까지 쓸 수 있습니다.' })
  q?: string;
}

export class CreateMatchDto {
  @IsInt({ message: LEAGUE_MESSAGE })
  @Min(1, { message: LEAGUE_MESSAGE })
  leagueId!: number;

  @Transform(trimString)
  @IsString({ message: HOME_MESSAGE })
  @Length(1, 50, { message: HOME_MESSAGE })
  homeTeam!: string;

  @Transform(trimString)
  @IsString({ message: AWAY_MESSAGE })
  @Length(1, 50, { message: AWAY_MESSAGE })
  awayTeam!: string;

  @IsISO8601({ strict: true }, { message: KICKOFF_MESSAGE })
  kickoffAt!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: VENUE_MESSAGE })
  @Length(0, 100, { message: VENUE_MESSAGE })
  venue?: string | null;
}

export class UpdateMatchDto {
  @ValidateIf(isDefined)
  @IsInt({ message: LEAGUE_MESSAGE })
  @Min(1, { message: LEAGUE_MESSAGE })
  leagueId?: number;

  @ValidateIf(isDefined)
  @Transform(trimString)
  @IsString({ message: HOME_MESSAGE })
  @Length(1, 50, { message: HOME_MESSAGE })
  homeTeam?: string;

  @ValidateIf(isDefined)
  @Transform(trimString)
  @IsString({ message: AWAY_MESSAGE })
  @Length(1, 50, { message: AWAY_MESSAGE })
  awayTeam?: string;

  @ValidateIf(isDefined)
  @IsISO8601({ strict: true }, { message: KICKOFF_MESSAGE })
  kickoffAt?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: VENUE_MESSAGE })
  @Length(0, 100, { message: VENUE_MESSAGE })
  venue?: string | null;

  @ValidateIf(isDefined)
  @IsIn(MATCH_STATUSES, { message: STATUS_MESSAGE })
  status?: MatchStatus;

  @IsOptional()
  @IsInt({ message: SCORE_MESSAGE })
  @Min(0, { message: SCORE_MESSAGE })
  @Max(999, { message: SCORE_MESSAGE })
  homeScore?: number | null;

  @IsOptional()
  @IsInt({ message: SCORE_MESSAGE })
  @Min(0, { message: SCORE_MESSAGE })
  @Max(999, { message: SCORE_MESSAGE })
  awayScore?: number | null;
}
