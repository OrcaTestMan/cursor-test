import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  CONTENT_STATUS_LABELS,
  INQUIRY_STATUS_LABELS,
  MATCH_STATUS_LABELS,
  PAGE_SIZES,
  ROLE_LABELS,
  USER_STATUS_LABELS,
} from '../lib/format'
import { btnGhost, cardCls, selectCls } from '../lib/styles'
import type { ContentStatus, InquiryStatus, MatchStatus, Role, UserStatus } from '../lib/types'
import { IconAlert, IconChevronLeft, IconChevronRight, IconChevronUp, IconClose, IconInbox } from './icons'

export type Tone = 'green' | 'gold' | 'red' | 'blue' | 'gray'

const TONE_CLASSES: Record<Tone, string> = {
  green: 'bg-accent-soft text-accent',
  gold: 'bg-gold-soft text-gold',
  red: 'bg-danger-soft text-danger',
  blue: 'bg-info-soft text-info',
  gray: 'bg-edge text-dim',
}

export function Pill({ tone, children, pulse }: { tone: Tone; children: ReactNode; pulse?: boolean }) {
  return (
    <span
      className={`inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {pulse && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {children}
    </span>
  )
}

const MATCH_TONES: Record<MatchStatus, Tone> = {
  scheduled: 'blue',
  live: 'red',
  finished: 'gray',
  postponed: 'gold',
  cancelled: 'gray',
}

export function MatchStatusPill({ status }: { status: MatchStatus }) {
  return (
    <Pill tone={MATCH_TONES[status]} pulse={status === 'live'}>
      {MATCH_STATUS_LABELS[status]}
    </Pill>
  )
}

const CONTENT_TONES: Record<ContentStatus, Tone> = { pending: 'gold', visible: 'green', hidden: 'gray' }

export function ContentStatusPill({ status }: { status: ContentStatus }) {
  return <Pill tone={CONTENT_TONES[status]}>{CONTENT_STATUS_LABELS[status]}</Pill>
}

export function InquiryStatusPill({ status }: { status: InquiryStatus }) {
  return <Pill tone={status === 'waiting' ? 'gold' : 'green'}>{INQUIRY_STATUS_LABELS[status]}</Pill>
}

export function RolePill({ role }: { role: Role }) {
  return <Pill tone={role === 'admin' ? 'green' : 'gray'}>{ROLE_LABELS[role]}</Pill>
}

export function UserStatusPill({ status }: { status: UserStatus }) {
  return <Pill tone={status === 'active' ? 'green' : status === 'blocked' ? 'red' : 'gray'}>{USER_STATUS_LABELS[status]}</Pill>
}

export function CountBadge({ count, tone = 'gold' }: { count: number; tone?: 'gold' | 'red' | 'green' }) {
  if (count <= 0) return null
  const cls =
    tone === 'gold' ? 'bg-gold text-on-accent' : tone === 'red' ? 'bg-danger text-fg' : 'bg-accent-fill text-on-accent'
  return (
    <span className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold ${cls}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function PageHeader({
  icon,
  title,
  subtitle,
  action,
  backTo,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
  backTo?: string
}) {
  const location = useLocation()
  const fallback = backTo ?? (location.pathname.startsWith('/admin') ? '/admin' : '/')
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent">{icon}</div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-black tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-dim">{subtitle}</p>}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {action}
        <BackButton fallback={fallback} />
      </div>
    </div>
  )
}

export function Loading({ text = '불러오는 중...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-dim">
      <span className="size-4 animate-spin rounded-full border-2 border-edge border-t-accent" />
      {text}
    </div>
  )
}

export function BackButton({ fallback = '/' }: { fallback?: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => {
        const idx = window.history.state?.idx
        if (typeof idx === 'number' && idx > 0) navigate(-1)
        else navigate(fallback)
      }}
      className={`${btnGhost} h-9 shrink-0 px-2.5 text-sm`}
    >
      <IconChevronLeft size={16} />
      뒤로
    </button>
  )
}

export function ScrollTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!show) return null
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="맨 위로"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 grid size-10 place-items-center rounded-full border border-edge bg-panel text-fg shadow-lg hover:bg-card-hover"
    >
      <IconChevronUp size={18} />
    </button>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
      <IconAlert size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-line">{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-1.5 text-xs font-semibold underline">
            다시 시도
          </button>
        )}
      </div>
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs whitespace-pre-line text-danger">{message}</p>
}

export function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">{message}</p>
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-edge bg-panel px-6 py-12 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-card text-dim">
        {icon ?? <IconInbox size={20} />}
      </div>
      <p className="font-bold">{title}</p>
      {description && <p className="mt-1 text-xs text-dim">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Card({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${cardCls} ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-edge-soft px-4 py-3">
          <h2 className="font-bold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export type TabItem<T extends string> = { value: T; label: string; count?: number }

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-edge bg-card p-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors ${
            item.value === value ? 'bg-accent-soft text-accent' : 'text-dim hover:text-fg'
          }`}
        >
          {item.label}
          {item.count !== undefined && item.count > 0 && <span className="text-xs">{item.count}</span>}
        </button>
      ))}
    </div>
  )
}

function pageWindow(page: number, totalPages: number): number[] {
  const size = 5
  let start = Math.max(1, page - Math.floor(size / 2))
  const end = Math.min(totalPages, start + size - 1)
  start = Math.max(1, end - size + 1)
  const pages: number[] = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
  onPageSize?: (size: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageBtn = 'grid size-8 place-items-center rounded-lg text-sm font-semibold transition-colors'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <div className="flex items-center gap-2 text-xs text-dim">
        <span>총 {total.toLocaleString('ko-KR')}건</span>
        {onPageSize && (
          <select
            aria-label="페이지당 개수"
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className={`${selectCls} h-8 text-xs`}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}개씩
              </option>
            ))}
          </select>
        )}
      </div>
      <nav className="flex items-center gap-1" aria-label="페이지">
        <button
          type="button"
          aria-label="이전 페이지"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={`${pageBtn} text-dim hover:bg-card-hover disabled:opacity-30`}
        >
          <IconChevronLeft />
        </button>
        {pageWindow(page, totalPages).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`${pageBtn} ${p === page ? 'bg-accent-soft text-accent' : 'text-dim hover:bg-card-hover hover:text-fg'}`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          aria-label="다음 페이지"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className={`${pageBtn} text-dim hover:bg-card-hover disabled:opacity-30`}
        >
          <IconChevronRight />
        </button>
      </nav>
    </div>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-dim">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-muted">{hint}</span>
      )}
    </label>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-semibold">{label}</p>
        {description && <p className="mt-0.5 text-xs text-dim">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-accent-fill' : 'bg-edge'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-fg transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" className="fixed inset-0 cursor-default" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-xl border border-edge bg-panel shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-lg p-1 text-dim hover:bg-card-hover hover:text-fg">
            <IconClose size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Avatar({
  name,
  uploadId,
  size = 'md',
}: {
  name: string
  uploadId?: number | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const dim = size === 'sm' ? 'size-7 text-[11px]' : size === 'lg' ? 'size-16 text-lg' : 'size-8 text-xs'
  if (uploadId) {
    return (
      <img
        src={`/api/files/${uploadId}`}
        alt={name}
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    )
  }
  return (
    <span className={`grid ${dim} shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent`}>
      {name.trim().slice(0, 2).toUpperCase() || '?'}
    </span>
  )
}

export function CenteredMessage({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-lg font-bold">{title}</p>
      {description && <p className="mt-2 text-sm text-dim">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}