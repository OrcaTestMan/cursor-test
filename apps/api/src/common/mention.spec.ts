import { describe, expect, it } from 'vitest';
import { extractMentionNicknames } from './mention.js';

describe('extractMentionNicknames', () => {
  it('공백 뒤 닉네임을 모은다', () => {
    expect(extractMentionNicknames('안녕 @홍길동 그리고 @user_1')).toEqual([
      '홍길동',
      'user_1',
    ]);
  });

  it('한 글자나 13자는 무시하고 중복은 한 번만', () => {
    expect(extractMentionNicknames('@가 @가나 @가나 @abcdefghijklm')).toEqual([
      '가나',
    ]);
  });

  it('이메일 주소는 멘션으로 보지 않는다', () => {
    expect(extractMentionNicknames('메일 a@example.com')).toEqual([]);
  });
});
