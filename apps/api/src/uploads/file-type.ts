const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const GIF = Buffer.from([0x47, 0x49, 0x46, 0x38]);

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_POST_IMAGES = 10;

/** 파일 앞부분을 보고 실제 이미지 종류를 판별한다. 확장자만 보고 믿지 않는다. */
export function sniffImageMime(buffer: Buffer): AllowedImageMime | null {
  if (buffer.length < 12) return null;
  if (buffer.subarray(0, 3).equals(JPEG)) return 'image/jpeg';
  if (buffer.subarray(0, 4).equals(PNG)) return 'image/png';
  if (buffer.subarray(0, 4).equals(GIF)) return 'image/gif';
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function extensionOf(mime: AllowedImageMime): string {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  return '.gif';
}
