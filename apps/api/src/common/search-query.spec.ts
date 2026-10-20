import { describe, expect, it } from 'vitest';
import { idFromToken, searchTokens, tokenPattern } from './search-query.js';

describe('searchTokens', () => {
  it('앞뒤 공백을 버리고 단어로 나눈다', () => {
    expect(searchTokens('  홍길동   test  ')).toEqual(['홍길동', 'test']);
  });

  it('공백만 있으면 검색어 없음이다', () => {
    expect(searchTokens('   ')).toEqual([]);
    expect(searchTokens(undefined)).toEqual([]);
  });
});

describe('idFromToken', () => {
  it('#123과 123을 회원·글 번호로 본다', () => {
    expect(idFromToken('#123')).toBe(123);
    expect(idFromToken('123')).toBe(123);
  });

  it('부분 번호나 문자는 번호로 보지 않는다', () => {
    expect(idFromToken('12a')).toBeNull();
    expect(idFromToken('0')).toBeNull();
  });
});

describe('tokenPattern', () => {
  it('%, _, 역슬래시를 문자로 취급한다', () => {
    expect(tokenPattern('100%_\\')).toBe('%100\\%\\_\\\\%');
  });
});
