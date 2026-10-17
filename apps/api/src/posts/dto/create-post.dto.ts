import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { POST_CATEGORIES } from './list-posts.dto.js';

export class CreatePostDto {
  @IsIn(POST_CATEGORIES)
  category!: (typeof POST_CATEGORIES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  matchId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  author!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;
}
