import { BadRequestException } from '@nestjs/common';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { and, gte, lt, type SQL } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';
import { DATE_PATTERN, addDays, kstDayStart, kstToday } from './kst.js';
import { PaginationQueryDto } from './pagination.js';

export const DATE_RANGES = ['today', 'custom', 'all'] as const;
export type DateRangeMode = (typeof DATE_RANGES)[number];

const RANGE_MESSAGE = '기간은 today, custom, all 중 하나여야 합니다.';
const DATE_MESSAGE = '날짜는 YYYY-MM-DD 형식으로 입력해 주세요.';

export class DateRangeQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(DATE_RANGES, { message: RANGE_MESSAGE })
  range?: DateRangeMode;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  from?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  to?: string;
}

export type ResolvedDateRange =
  | {
      mode: 'all';
      from: null;
      to: null;
      start: null;
      end: null;
    }
  | {
      mode: 'today' | 'custom';
      from: string;
      to: string;
      start: Date;
      end: Date;
    };

export function isRealKstDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const start = kstDayStart(value);
  if (Number.isNaN(start.getTime())) return false;
  return kstToday(start) === value;
}

export function resolveDateRange(
  query: { range?: string; from?: string; to?: string; date?: string },
  now: Date = new Date(),
): ResolvedDateRange {
  const today = kstToday(now);
  let mode = query.range;
  let from = query.from;
  let to = query.to;
  if (query.date && !from && !to && !mode) {
    from = query.date;
    to = query.date;
    mode = 'custom';
  }
  if (!mode) {
    mode = from || to ? 'custom' : 'today';
  }
  if (mode !== 'today' && mode !== 'custom' && mode !== 'all') {
    throw new BadRequestException(RANGE_MESSAGE);
  }
  if (mode === 'all') {
    return { mode: 'all', from: null, to: null, start: null, end: null };
  }
  if (mode === 'today') {
    from = today;
    to = today;
  } else {
    if (!from && !to) {
      throw new BadRequestException('검색 시작일과 종료일을 입력해 주세요.');
    }
    from = from ?? to;
    to = to ?? from;
  }
  if (!from || !to) {
    throw new BadRequestException('검색 시작일과 종료일을 입력해 주세요.');
  }
  if (!isRealKstDate(from) || !isRealKstDate(to)) {
    throw new BadRequestException('존재하지 않는 날짜입니다.');
  }
  if (from > to) {
    throw new BadRequestException('검색 시작일은 종료일보다 늦을 수 없습니다.');
  }
  const start = kstDayStart(from);
  const end = kstDayStart(addDays(to, 1));
  return { mode, from, to, start, end };
}

export function dateCondition(
  column: Column,
  range: ResolvedDateRange,
): SQL | undefined {
  if (range.mode === 'all' || !range.start || !range.end) return undefined;
  return and(gte(column, range.start), lt(column, range.end));
}

export function rangeMeta(range: ResolvedDateRange) {
  return { range: range.mode, from: range.from, to: range.to };
}
