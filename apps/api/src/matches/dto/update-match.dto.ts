import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const MATCH_STATUSES = [
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled',
] as const;

export class UpdateMatchDto {
  @IsOptional()
  @IsIn(MATCH_STATUSES)
  status?: (typeof MATCH_STATUSES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  homeScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  awayScore?: number;
}
