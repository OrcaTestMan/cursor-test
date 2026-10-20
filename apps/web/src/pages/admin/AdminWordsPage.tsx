import { useState, type FormEvent } from 'react'
import { IconFilterWord } from '../../components/admin/AdminUi'
import { EmptyFilterActions, ListFilterBar, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../../components/filters'
import { IconClose, IconPlus } from '../../components/icons'
import { EmptyState, ErrorBox, FormError, FormSuccess, Loading, PageHeader } from '../../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { asPaged, dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../../lib/list-query'
import { useQueryState } from '../../lib/params'
import { btnPrimary, cardCls, inputCls } from '../../lib/styles'
import type { ForbiddenWord, Paged } from '../../lib/types'

const WORD_MAX = 50

export default function AdminWordsPage() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'all')
  const list = useApi<Paged<ForbiddenWord> | ForbiddenWord[]>(
    `/admin/forbidden-words${buildQuery({
      ...dateFilterQuery(appliedDates),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )
  const apply = (dates = draft) => qs.update({ ...serializeDateFilter(dates) })
  const reset = () => {
    const dates = { ...emptyDateFilter(), range: 'all' as const }
    setDraft(dates)
    qs.update({ ...serializeDateFilter(dates) }, { replace: true })
  }
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates)))]
  const paged = asPaged(list.data)
  const items = paged?.items ?? []
  const total = paged?.total ?? 0
  const [word, setWord] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const onAdd = async (e: FormEvent) => {
    e.preventDefault()
    setDone(null)
    const text = word.trim()
    if (!text || text.length > WORD_MAX) return setError(`금칙어는 1~${WORD_MAX}자로 입력해 주세요.`)
    setSending(true)
    setError(null)
    try {
      const saved = await apiFetch<ForbiddenWord>('/admin/forbidden-words', { method: 'POST', body: { word: text } })
      setWord('')
      setDone(`'${saved.word}'을(를) 추가했습니다.`)
      list.reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const onDelete = async (item: ForbiddenWord) => {
    if (!window.confirm(`금칙어 '${item.word}'을(를) 삭제할까요?`)) return
    setBusyId(item.id)
    setError(null)
    setDone(null)
    try {
      await apiFetch<void>(`/admin/forbidden-words/${item.id}`, { method: 'DELETE' })
      setDone(`'${item.word}'을(를) 삭제했습니다.`)
      list.reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader icon={<IconFilterWord size={20} />} title="금칙어" subtitle="회원이 쓸 수 없는 단어를 관리합니다." />
      <ListFilterBar
        dateLabel="등록일 기준"
        searchPlaceholder="금칙어 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        chips={chips}
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '개')}</p>}
      />
      <div className="max-w-3xl space-y-4">
        <form onSubmit={onAdd} className={`${cardCls} space-y-3 p-5`} noValidate>
          <p className="text-xs leading-relaxed text-dim">
            금칙어는 글 제목·본문, 댓글, 닉네임, 아이디에 적용되며 띄어쓰기·대소문자를 무시하고 찾습니다. 포함되면 저장이 거부되고 회원에게 해당 단어가 안내됩니다.
          </p>
          <div className="flex gap-2">
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              maxLength={WORD_MAX}
              placeholder="추가할 단어 (1~50자)"
              aria-label="금칙어"
              className={inputCls}
            />
            <button type="submit" disabled={sending} className={btnPrimary}>
              <IconPlus /> 추가
            </button>
          </div>
          <FormError message={error} />
          <FormSuccess message={done} />
        </form>

        {list.loading ? (
          <Loading />
        ) : list.error ? (
          <ErrorBox message={list.error} onRetry={list.reload} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<IconFilterWord size={20} />}
            title="선택한 등록일 기간과 검색어에 맞는 금칙어가 없습니다."
            description="기간을 넓히거나 조건을 초기화해 보세요."
            action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates))} onReset={reset} />}
          />
        ) : (
          <section className={cardCls}>
            <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
              <h2 className="font-bold">등록된 금칙어</h2>
              <span className="text-xs text-dim">총 {total.toLocaleString('ko-KR')}개</span>
            </div>
            <ul className="flex flex-wrap gap-2 p-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  title={`${formatDateTime(item.createdAt)} 등록`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-edge bg-input pr-1 pl-3 text-sm"
                >
                  {item.word}
                  <button
                    type="button"
                    aria-label={`${item.word} 삭제`}
                    disabled={busyId === item.id}
                    onClick={() => void onDelete(item)}
                    className="grid size-6 place-items-center rounded-md text-dim hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                  >
                    <IconClose size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
