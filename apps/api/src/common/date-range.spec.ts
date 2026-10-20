import { describe, expect, it } from 'vitest';
import { isRealKstDate, resolveDateRange } from './date-range.js';

describe('resolveDateRange', () => {
  const now = new Date('2026-10-18T04:30:00Z');

  it('파라미터가 없으면 한국 시간 오늘 하루다', () => {
    const range = resolveDateRange({}, now);
    expect(range).toMatchObject({
      mode: 'today',
      from: '2026-10-18',
      to: '2026-10-18',
    });
    if (range.mode === 'all') throw new Error('expected bounded range');
    expect(range.start.toISOString()).toBe('2026-10-17T15:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-10-18T15:00:00.000Z');
  });

  it('전체기간은 날짜 조건을 없앤다', () => {
    expect(resolveDateRange({ range: 'all' }, now)).toEqual({
      mode: 'all',
      from: null,
      to: null,
      start: null,
      end: null,
    });
  });

  it('from/to만 있으면 custom으로 본다', () => {
    const range = resolveDateRange({ from: '2026-10-01', to: '2026-10-07' }, now);
    expect(range.mode).toBe('custom');
    expect(range.from).toBe('2026-10-01');
    expect(range.to).toBe('2026-10-07');
  });

  it('한쪽 날짜만 있으면 같은 날로 채운다', () => {
    const range = resolveDateRange({ from: '2026-10-10' }, now);
    expect(range).toMatchObject({ mode: 'custom', from: '2026-10-10', to: '2026-10-10' });
  });

  it('legacy date는 하루 조회다', () => {
    const range = resolveDateRange({ date: '2026-10-19' }, now);
    expect(range).toMatchObject({ mode: 'custom', from: '2026-10-19', to: '2026-10-19' });
  });

  it('시작일이 종료일보다 늦으면 오류다', () => {
    expect(() => resolveDateRange({ from: '2026-10-10', to: '2026-10-01' }, now)).toThrow(
      '검색 시작일은 종료일보다 늦을 수 없습니다.',
    );
  });

  it('없는 날짜는 오류다', () => {
    expect(isRealKstDate('2026-02-31')).toBe(false);
    expect(() => resolveDateRange({ range: 'custom', from: '2026-02-31', to: '2026-02-31' }, now)).toThrow(
      '존재하지 않는 날짜입니다.',
    );
  });
});
