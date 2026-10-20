import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { IconClose, IconSearch } from './icons'
import {
  applyQuickRange,
  dateFiltersEqual,
  formatRangeLabel,
  inspectDateFilter,
  inspectIntFilters,
  quickRangeOf,
  type DateFilter,
  type DateRangeMode,
  type QuickRange,
} from '../lib/list-query'
import { isDay } from '../lib/format'
import { btnSmPrimary, btnSmSecondary, chipCls, dateInputCls, filterSearchCls } from '../lib/styles'

export type FilterChip = { key: string; label: string; onRemove?: () => void }
export type FilterPreset = { id: string; label: string }

const QUICK: { id: QuickRange; label: string; title: string }[] = [
  { id: 'today', label: '오늘', title: '오늘' },
  { id: 'yesterday', label: '어제', title: '어제' },
  { id: 'week', label: '이번주', title: '이번 주' },
  { id: 'd7', label: '7일', title: '최근 7일' },
  { id: 'd30', label: '30일', title: '최근 30일' },
  { id: 'month', label: '이번달', title: '이번 달' },
  { id: 'all', label: '전체', title: '전체기간' },
]

const fieldCap = 'h-4 text-center text-[11px] font-semibold leading-4 text-dim'

function filterChipCls(active: boolean): string {
  return chipCls(active).replace('h-8', 'h-9')
}

export function FilterChipRow({ chips }: { chips: FilterChip[] }) {
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex h-9 items-center gap-1 rounded-full border border-edge bg-card px-2.5 text-xs font-semibold">
          {chip.label}
          {chip.onRemove && (
            <button type="button" aria-label={`${chip.label} 해제`} onClick={chip.onRemove} className="text-dim hover:text-fg">
              <IconClose size={12} />
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

export function ListFilterBar({
  dateLabel,
  searchPlaceholder,
  searchLabel,
  draft,
  applied,
  onDraft,
  onSubmit,
  onReset,
  basic,
  advanced,
  advancedCount = 0,
  chips,
  summary,
  presets,
  onPreset,
  extraActions,
  restoreNotice,
  alert,
}: {
  dateLabel: string
  searchPlaceholder: string
  searchLabel?: string
  draft: DateFilter
  applied: DateFilter
  onDraft: (next: DateFilter) => void
  onSubmit: () => void
  onReset: () => void
  basic?: ReactNode
  advanced?: ReactNode
  advancedCount?: number
  chips?: FilterChip[]
  summary?: ReactNode
  presets?: FilterPreset[]
  onPreset?: (id: string) => void
  extraActions?: ReactNode
  restoreNotice?: string | null
  alert?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)
  const [hideRestore, setHideRestore] = useState(false)
  const fromRef = useRef<HTMLInputElement>(null)
  const dirty = !dateFiltersEqual(draft, applied)
  const allPeriod = draft.range === 'all'
  const activeQuick = quickRangeOf(draft)
  const keywordLabel = searchLabel ?? '검색'
  const banner = dateError || alert || (hideRestore ? null : restoreNotice)

  useEffect(() => {
    setHideRestore(false)
  }, [restoreNotice])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!allPeriod && (!isDay(draft.from) || !isDay(draft.to))) {
      setDateError('달력에 있는 날짜를 입력하세요.')
      fromRef.current?.focus()
      return
    }
    if (!allPeriod && draft.from > draft.to) {
      setDateError('시작일은 종료일보다 늦을 수 없습니다.')
      fromRef.current?.focus()
      return
    }
    setDateError(null)
    setHideRestore(true)
    onSubmit()
  }

  return (
    <form onSubmit={submit} className="filter-panel mb-4 space-y-2 rounded-xl border border-edge bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex max-w-full flex-wrap items-end gap-2">
          <span className="flex h-9 items-center text-xs font-semibold whitespace-nowrap text-dim">{dateLabel}</span>
          <div className="flex items-end gap-2">
            <label className="grid w-[8.75rem] shrink-0 justify-items-center gap-1">
              <span className={fieldCap}>시작</span>
              <input
                ref={fromRef}
                type="date"
                aria-label={`${dateLabel} 시작`}
                aria-invalid={Boolean(dateError)}
                value={draft.from}
                disabled={allPeriod}
                onChange={(e) => {
                  setDateError(null)
                  onDraft({ ...draft, range: 'custom', from: e.target.value, to: draft.to || e.target.value })
                }}
                className={dateInputCls}
              />
            </label>
            <span className="flex h-9 w-3 items-center justify-center text-sm text-dim">~</span>
            <label className="grid w-[8.75rem] shrink-0 justify-items-center gap-1">
              <span className={fieldCap}>종료</span>
              <input
                type="date"
                aria-label={`${dateLabel} 종료`}
                aria-invalid={Boolean(dateError)}
                value={draft.to}
                disabled={allPeriod}
                onChange={(e) => {
                  setDateError(null)
                  onDraft({ ...draft, range: 'custom', from: draft.from || e.target.value, to: e.target.value })
                }}
                className={dateInputCls}
              />
            </label>
          </div>
        </div>
        <label className="grid w-[13rem] shrink-0 justify-items-center gap-1">
          <span className={fieldCap}>{keywordLabel}</span>
          <span className="relative block w-full">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
            <input
              value={draft.q}
              onChange={(e) => onDraft({ ...draft, q: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault()
              }}
              placeholder={searchPlaceholder}
              aria-label={keywordLabel}
              className={`${filterSearchCls} pl-8 pr-7`}
            />
            {draft.q && (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={() => onDraft({ ...draft, q: '' })}
                className="absolute top-1/2 right-1.5 -translate-y-1/2 text-dim hover:text-fg"
              >
                <IconClose size={14} />
              </button>
            )}
          </span>
        </label>
        {basic ? <div className="contents">{basic}</div> : null}
        <div className="flex h-9 shrink-0 items-center gap-1.5">
          <button type="submit" className={btnSmPrimary}>
            검색
          </button>
          <button type="button" onClick={onReset} className={btnSmSecondary}>
            초기화
          </button>
        </div>
        {extraActions ? <div className="flex h-9 shrink-0 items-center gap-2">{extraActions}</div> : null}
      </div>
      {banner && (
        <p className="text-xs font-semibold text-gold" role="alert">
          {banner}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.title}
            aria-label={item.title}
            onClick={() => onDraft(applyQuickRange(item.id, draft.q))}
            className={`h-9 min-w-[2.75rem] shrink-0 rounded-full border px-2.5 text-xs font-bold ${
              activeQuick === item.id ? 'border-accent/50 bg-accent-soft text-accent' : 'border-edge bg-transparent text-dim hover:text-fg'
            }`}
          >
            {item.label}
          </button>
        ))}
        {advanced && (
          <button type="button" onClick={() => setOpen((value) => !value)} className={filterChipCls(open || advancedCount > 0)}>
            상세 필터{advancedCount > 0 ? ` ${advancedCount}개 적용` : ''}
          </button>
        )}
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => (
            <button key={preset.id} type="button" onClick={() => onPreset?.(preset.id)} className={filterChipCls(false)}>
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {open && advanced && <div className="space-y-3 border-t border-edge-soft pt-3">{advanced}</div>}

      {dirty && <p className="text-xs font-semibold text-gold">조건 변경됨 · 검색을 눌러 적용</p>}
      {allPeriod && <p className="text-xs text-dim">전체기간 · 날짜 제한 없음</p>}
      <p className="text-xs text-dim">
        {dateLabel} · {formatRangeLabel(applied)}
        {applied.q ? ` · “${applied.q}”` : ''}
      </p>
      {chips && chips.length > 0 && <FilterChipRow chips={chips} />}
      {summary}
    </form>
  )
}

export function useDraftFilter(applied: DateFilter) {
  const [draft, setDraft] = useState(applied)
  useEffect(() => {
    setDraft(applied)
  }, [applied.q, applied.range, applied.from, applied.to])
  return { draft, setDraft }
}

export function useRestoredDateFilter(
  qs: {
    params: URLSearchParams
    update: (patch: Record<string, string | number | null>, options?: boolean | { keepPage?: boolean; replace?: boolean }) => void
  },
  fallback: DateRangeMode = 'today',
  ints?: { keys?: string[]; pairs?: Array<[string, string]> },
) {
  const inspected = inspectDateFilter(qs.params, fallback)
  const intInspected = inspectIntFilters(qs.params, ints?.keys ?? [], ints?.pairs ?? [])
  const { draft, setDraft } = useDraftFilter(inspected.filter)
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null)
  const notice = [inspected.notice, intInspected.notice].filter(Boolean).join(' ') || null
  const patch = inspected.patch || intInspected.patch ? { ...(inspected.patch ?? {}), ...(intInspected.patch ?? {}) } : null
  const patchKey = patch ? JSON.stringify(patch) : ''

  useEffect(() => {
    if (!notice || !patch) return
    setRestoreNotice(notice)
    qs.update(patch, { replace: true })
  }, [notice, patchKey])

  return { applied: inspected.filter, draft, setDraft, restoreNotice }
}

export function dateRangeChip(applied: DateFilter, onToday: () => void): FilterChip {
  if (applied.range === 'custom') {
    return { key: 'range', label: `기간: ${applied.from} ~ ${applied.to}`, onRemove: onToday }
  }
  return {
    key: 'range',
    label: applied.range === 'all' ? '기간: 전체' : '기간: 오늘',
    onRemove: applied.range === 'today' ? undefined : onToday,
  }
}

export function EmptyFilterActions({ onAllPeriod, onReset }: { onAllPeriod: () => void; onReset: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btnSmSecondary} onClick={onAllPeriod}>
        전체기간으로 검색
      </button>
      <button type="button" className={btnSmSecondary} onClick={onReset}>
        조건 초기화
      </button>
    </div>
  )
}

export function OptionButtons<T extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: T | ''
  items: { value: T | ''; label: string }[]
  onChange: (value: T | '') => void
}) {
  return (
    <div className="contents" role="group" aria-label={label}>
      {items.map((item) => (
        <button key={item.value || 'all'} type="button" onClick={() => onChange(item.value)} className={filterChipCls(value === item.value)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

const SEARCHABLE_AT = 8

export function FilterChoice<T extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: T | ''
  items: { value: T | ''; label: string }[]
  onChange: (value: T | '') => void
}) {
  if (items.length < SEARCHABLE_AT) {
    return <OptionButtons label={label} value={value} items={items} onChange={onChange} />
  }
  return <SearchableChoice label={label} value={value} items={items} onChange={onChange} />
}

function SearchableChoice<T extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: T | ''
  items: { value: T | ''; label: string }[]
  onChange: (value: T | '') => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const current = items.find((item) => item.value === value)?.label ?? label
  const query = q.trim().toLowerCase()
  const filtered = items.filter((item) => !query || item.label.toLowerCase().includes(query))

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((next) => !next)
          setQ('')
        }}
        className="inline-flex h-9 min-w-[7.5rem] items-center justify-between gap-2 rounded-xl border border-edge bg-input px-3 text-[13px] font-bold text-fg"
      >
        <span className="truncate">{current}</span>
        <span className="text-[10px] text-dim" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-60 rounded-xl border border-edge bg-panel p-2 shadow-lg">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
            placeholder={`${label} 검색`}
            aria-label={`${label} 검색`}
            className={filterSearchCls}
          />
          <div className="mt-2 flex max-h-52 flex-col gap-1 overflow-y-auto" role="listbox" aria-label={label}>
            {filtered.map((item) => (
              <button
                key={item.value || 'all'}
                type="button"
                role="option"
                aria-selected={item.value === value}
                onClick={() => {
                  onChange(item.value)
                  setOpen(false)
                  setQ('')
                }}
                className={`flex h-9 w-full shrink-0 items-center rounded-lg px-2 text-left text-[13px] font-bold ${
                  item.value === value ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-2 py-2 text-xs text-dim">일치하는 항목이 없습니다</p>}
          </div>
        </div>
      )}
    </div>
  )
}
