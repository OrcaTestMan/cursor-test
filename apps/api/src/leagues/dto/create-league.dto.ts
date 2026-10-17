import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLeagueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  sport!: string;
}
