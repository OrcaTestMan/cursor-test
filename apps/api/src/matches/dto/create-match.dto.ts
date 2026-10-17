import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMatchDto {
  @IsInt()
  @Min(1)
  leagueId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  homeTeam!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  awayTeam!: string;

  @IsISO8601()
  kickoffAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  venue?: string;
}
