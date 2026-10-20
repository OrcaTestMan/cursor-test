const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function kstDayStart(date: string): Date {
  return new Date(`${date}T00:00:00+09:00`);
}

export function kstDayRange(date: string) {
  const start = kstDayStart(date);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

export function kstToday(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 한국 시간 'YYYY-MM-DD HH:mm' */
export function formatKst(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
}

export function addDays(date: string, days: number): string {
  return new Date(kstDayStart(date).getTime() + days * DAY_MS + KST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}
