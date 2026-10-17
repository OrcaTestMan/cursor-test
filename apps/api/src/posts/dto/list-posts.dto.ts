import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const POST_CATEGORIES = ['free', 'match'] as const;
export const POST_PAGE_SIZE = 20;

export class ListPostsDto {
  @IsOptional()
  @IsIn(POST_CATEGORIES)
  category?: (typeof POST_CATEGORIES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  matchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
