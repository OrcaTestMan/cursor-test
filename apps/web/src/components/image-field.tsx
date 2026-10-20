import { useRef, useState, type DragEvent } from 'react'
import { apiFetch, apiUpload, errorMessage } from '../lib/api'
import { imageLimitMessage, MAX_POST_IMAGES, uploadSrc } from '../lib/files'
import { btnSmDanger, btnSmSecondary } from '../lib/styles'
import type { UploadFile } from '../lib/types'
import { IconImage, IconTrash } from './icons'

type Item = {
  key: string
  id: number | null
  previewUrl: string
  status: 'uploading' | 'ready' | 'error'
  error?: string
  name: string
}

function fromUpload(file: UploadFile): Item {
  return {
    key: `id-${file.id}`,
    id: file.id,
    previewUrl: uploadSrc(file),
    status: 'ready',
    name: file.originalName,
  }
}

export function ImageField({
  images,
  onChange,
}: {
  images: UploadFile[]
  onChange: (next: UploadFile[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>(() => images.map(fromUpload))
  const [hint, setHint] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const readyIds = () => items.filter((item) => item.id && item.status === 'ready').map((item) => item.id!) 

  const sync = (next: Item[]) => {
    setItems(next)
    onChange(
      next
        .filter((item): item is Item & { id: number } => item.id !== null && item.status === 'ready')
        .map((item, sortOrder) => ({
          id: item.id,
          url: item.previewUrl,
          mime: '',
          size: 0,
          originalName: item.name,
          sortOrder,
        })),
    )
  }

  const addFiles = async (files: FileList | File[]) => {
    const list = [...files]
    setHint(null)
    const currentReady = items.filter((item) => item.status !== 'error').length
    const accepted: { file: File; key: string; previewUrl: string }[] = []
    for (const file of list) {
      const message = imageLimitMessage(file, currentReady + accepted.length)
      if (message) {
        setHint(message)
        continue
      }
      accepted.push({ file, key: `${file.name}-${file.size}-${crypto.randomUUID()}`, previewUrl: URL.createObjectURL(file) })
    }
    if (accepted.length === 0) return
    const pending = accepted.map(
      (item): Item => ({
        key: item.key,
        id: null,
        previewUrl: item.previewUrl,
        status: 'uploading',
        name: item.file.name,
      }),
    )
    setItems((prev) => [...prev, ...pending])
    const uploaded: Item[] = []
    for (const item of accepted) {
      try {
        const saved = await apiUpload<UploadFile>('/uploads', item.file)
        uploaded.push({
          key: item.key,
          id: saved.id,
          previewUrl: uploadSrc(saved),
          status: 'ready',
          name: saved.originalName,
        })
        URL.revokeObjectURL(item.previewUrl)
      } catch (err) {
        uploaded.push({
          key: item.key,
          id: null,
          previewUrl: item.previewUrl,
          status: 'error',
          error: errorMessage(err),
          name: item.file.name,
        })
      }
    }
    setItems((prev) => {
      const next = prev.map((item) => uploaded.find((row) => row.key === item.key) ?? item)
      onChange(
        next
          .filter((item): item is Item & { id: number } => item.id !== null && item.status === 'ready')
          .map((item, sortOrder) => ({
            id: item.id,
            url: item.previewUrl,
            mime: '',
            size: 0,
            originalName: item.name,
            sortOrder,
          })),
      )
      return next
    })
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = [...items]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    sync(next)
  }

  const remove = async (item: Item) => {
    if (item.id) {
      try {
        await apiFetch<void>(`/uploads/${item.id}`, { method: 'DELETE' })
      } catch {
        // 이미 지워졌거나 글에 붙은 파일은 저장 때 목록에서 빠진다.
      }
    }
    if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
    sync(items.filter((row) => row.key !== item.key))
  }

  const retry = (item: Item) => {
    setHint('같은 파일을 다시 선택해 올려 주세요.')
    inputRef.current?.click()
    void item
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-xl border border-dashed px-4 py-5 text-center ${dragOver ? 'border-accent bg-accent-soft/40' : 'border-edge bg-panel'}`}
      >
        <IconImage className="mx-auto mb-2 text-muted" />
        <p className="text-sm">이미지를 끌어다 놓거나 파일을 선택하세요.</p>
        <p className="mt-1 text-xs text-dim">JPEG, PNG, WebP, GIF · 파일당 5MB · 최대 {MAX_POST_IMAGES}장</p>
        <button type="button" onClick={() => inputRef.current?.click()} className={`${btnSmSecondary} mt-3`}>
          파일 선택
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {hint && <p className="text-xs text-danger">{hint}</p>}
      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item, index) => (
            <li key={item.key} className="overflow-hidden rounded-lg border border-edge bg-card">
              <div className="relative aspect-square bg-panel">
                <img src={item.previewUrl} alt={item.name} className="size-full object-cover" />
                {item.status === 'uploading' && (
                  <div className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-semibold">올리는 중...</div>
                )}
                {item.status === 'error' && (
                  <div className="absolute inset-0 grid place-items-center bg-black/60 px-2 text-center text-xs text-danger">
                    {item.error}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1 p-2">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className={btnSmSecondary}>
                  앞
                </button>
                <button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} className={btnSmSecondary}>
                  뒤
                </button>
                {item.status === 'error' && (
                  <button type="button" onClick={() => retry(item)} className={btnSmSecondary}>
                    다시
                  </button>
                )}
                <button type="button" onClick={() => void remove(item)} className={`${btnSmDanger} ml-auto`}>
                  <IconTrash size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-dim">
        {readyIds().length}/{MAX_POST_IMAGES}
      </p>
    </div>
  )
}
