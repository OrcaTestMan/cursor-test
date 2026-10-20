import { describe, expect, it } from 'vitest';
import { sniffImageMime } from './file-type.js';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('sniffImageMime', () => {
  it('JPEG·PNG·GIF·WebP 매직 바이트를 구분한다', () => {
    expect(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, ...Array(12).fill(0)]))).toBe(
      'image/jpeg',
    );
    expect(sniffImageMime(PNG_1X1)).toBe('image/png');
    expect(sniffImageMime(Buffer.from('GIF89aXXXXXXX'))).toBe('image/gif');
    const webp = Buffer.alloc(12);
    webp.write('RIFF', 0);
    webp.write('WEBP', 8);
    expect(sniffImageMime(webp)).toBe('image/webp');
  });

  it('텍스트나 짧은 버퍼는 거절한다', () => {
    expect(sniffImageMime(Buffer.from('hello world!!'))).toBeNull();
    expect(sniffImageMime(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
