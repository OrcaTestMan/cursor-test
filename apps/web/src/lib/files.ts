import type { UploadFile } from './types'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_POST_IMAGES = 10
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export function fileUrl(id: number): string {
  return `/api/files/${id}`
}

export function uploadSrc(file: Pick<UploadFile, 'id' | 'url'>): string {
  return file.url.startsWith('/') ? file.url : fileUrl(file.id)
}

export function imageLimitMessage(file: File, currentCount: number): string | null {
  if (currentCount >= MAX_POST_IMAGES) return `이미지는 글 하나당 ${MAX_POST_IMAGES}장까지 올릴 수 있습니다.`
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return 'JPEG, PNG, WebP, GIF만 올릴 수 있습니다.'
  }
  if (file.size > MAX_IMAGE_BYTES) return '파일은 5MB까지 올릴 수 있습니다.'
  return null
}
