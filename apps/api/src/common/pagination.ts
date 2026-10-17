import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const PAGE_SIZES = [20, 50, 100] as const;

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '페이지 번호가 올바르지 않습니다.' })
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn(PAGE_SIZES, {
    message: '한 페이지 개수는 20, 50, 100 중 하나여야 합니다.',
  })
  pageSize?: number;
}

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function pageParams(query: PaginationQueryDto) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? PAGE_SIZES[0];
  return { page, pageSize, offset: (page - 1) * pageSize };
}
