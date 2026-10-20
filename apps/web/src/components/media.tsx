import { useState } from 'react'
import { fileUrl, uploadSrc } from '../lib/files'
import { youtubeLinks, youtubeThumb } from '../lib/youtube'
import type { UploadFile } from '../lib/types'
import { IconClose, IconExternal, IconFile } from './icons'

export function PostThumbnail({ id, title }: { id: number | null | undefined; title: string }) {
  if (!id) return null
  return (
    <img
      src={fileUrl(id)}
      alt=""
      className="size-10 shrink-0 rounded-md object-cover"
      title={title}
    />
  )
}

export function ImageGallery({ images }: { images: UploadFile[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (images.length === 0) return null
  const current = images.find((item) => item.id === open) ?? null
  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((image) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setOpen(image.id)}
              className="block w-full overflow-hidden rounded-lg border border-edge bg-panel"
            >
              <img src={uploadSrc(image)} alt={image.originalName} className="max-h-72 w-full object-contain" />
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" className="absolute inset-0 cursor-default" onClick={() => setOpen(null)} />
          <div className="relative max-h-full max-w-5xl">
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="닫기"
              className="absolute -top-10 right-0 rounded-lg p-1 text-fg hover:bg-white/10"
            >
              <IconClose size={20} />
            </button>
            <img src={uploadSrc(current)} alt={current.originalName} className="max-h-[85vh] max-w-full object-contain" />
          </div>
        </div>
      )}
    </>
  )
}

export function YoutubeCards({ text }: { text: string }) {
  const items = youtubeLinks(text)
  if (items.length === 0) return null
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex overflow-hidden rounded-xl border border-edge bg-panel">
          <img src={youtubeThumb(item.id)} alt="" className="h-24 w-40 shrink-0 object-cover" />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-3">
            <p className="text-sm font-semibold">YouTube 영상</p>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-accent hover:text-accent-strong"
            >
              보러 가기 <IconExternal size={12} />
            </a>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function EmptyImageHint() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <IconFile size={12} /> 사진
    </span>
  )
}
