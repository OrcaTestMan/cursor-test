import { or, type SQL } from 'drizzle-orm';
import { likePattern } from './text.js';

export function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export function searchTokens(q?: string | null): string[] {
  if (!q) return [];
  return q
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

export function idFromToken(token: string): number | null {
  const raw = token.startsWith('#') ? token.slice(1) : token;
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return id >= 1 ? id : null;
}

export function tokenPattern(token: string): string {
  return likePattern(token);
}

/** 한 단어의 필드 OR. 빈 배열이면 undefined */
export function anyField(parts: Array<SQL | undefined>): SQL | undefined {
  const present = parts.filter((part): part is SQL => part !== undefined);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return or(...present);
}

export function andTokens(
  tokens: string[],
  forToken: (token: string) => SQL | undefined,
): SQL[] {
  const conditions: SQL[] = [];
  for (const token of tokens) {
    const condition = forToken(token);
    if (condition) conditions.push(condition);
  }
  return conditions;
}
