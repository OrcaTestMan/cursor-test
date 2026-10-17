import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  author!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body!: string;
}
