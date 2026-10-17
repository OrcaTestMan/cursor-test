import { useState, type FormEvent } from 'react'
import { IconTrophy } from '../../components/icons'
import { EmptyState, ErrorBox, FormError, Loading, PageHeader, Pagination } from '../../components/ui'
import { apiFetch, errorMessage, useApi } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { btnPrimary, btnSmDanger, btnSmPrimary, btnSmSecondary, cardCls, inputCls, tdCls, thCls, trCls } from '../../lib/styles'
import type { League } from '../../lib/types'

function validateLeague(name: string, sport: string): string | null {
  if (!name || name.length > 50) return '리그 이름은 1~50자로 입력해 주세요.'
  if (!sport || sport.length > 20) return '종목은 1~20자로 입력해 주세요.'
  return null
}

export default function AdminLeaguesPage() {
  const { data, loading, error, reload } = useApi<League[]>('/leagues')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const onDelete = async (league: League) => {
    if (!window.confirm(`'${league.name}' 리그를 삭제할까요?`)) return
    setDeletingId(league.id)
    setActionError(null)
    try {
      await apiFetch<void>(`/admin/leagues/${league.id}`, { method: 'DELETE' })
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  const items = data ?? []
  const shown = items.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <PageHeader icon={<IconTrophy size={20} />} title="리그 관리" subtitle="경기를 묶는 리그와 종목을 관리합니다." />
      <AddLeagueForm onAdded={reload} />
      {actionError && (
        <div className="mb-3">
          <FormError message={actionError} />
        </div>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState icon={<IconTrophy size={20} />} title="등록된 리그가 없습니다" description="위 입력란에서 첫 리그를 추가하세요." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-edge bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-edge">
                <tr>
                  <th className={thCls}>ID</th>
                  <th className={thCls}>이름</th>
                  <th className={thCls}>종목</th>
                  <th className={`${thCls} text-right`}>경기 수</th>
                  <th className={thCls}>등록일</th>
                  <th className={`${thCls} text-right`}>관리</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((league) =>
                  editingId === league.id ? (
                    <EditRow
                      key={league.id}
                      league={league}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null)
                        reload()
                      }}
                    />
                  ) : (
                    <tr key={league.id} className={trCls}>
                      <td className={`${tdCls} text-muted`}>#{league.id}</td>
                      <td className={`${tdCls} font-semibold`}>{league.name}</td>
                      <td className={`${tdCls} text-dim`}>{league.sport}</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{league.matchCount}</td>
                      <td className={`${tdCls} text-dim`}>{formatDate(league.createdAt)}</td>
                      <td className={`${tdCls} text-right`}>
                        <span className="inline-flex gap-1.5">
                          <button type="button" onClick={() => setEditingId(league.id)} className={btnSmSecondary}>
                            수정
                          </button>
                          <button type="button" disabled={deletingId === league.id} onClick={() => void onDelete(league)} className={btnSmDanger}>
                            삭제
                          </button>
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={items.length}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </>
      )}
    </div>
  )
}

function AddLeagueForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    const s = sport.trim()
    const problem = validateLeague(n, s)
    if (problem) return setError(problem)
    setSending(true)
    setError(null)
    try {
      await apiFetch<League>('/admin/leagues', { method: 'POST', body: { name: n, sport: s } })
      setName('')
      setSport('')
      onAdded()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${cardCls} mb-4 p-4`} noValidate>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1">
          <span className="mb-1.5 block text-xs font-semibold text-dim">리그 이름</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="예: K리그1" className={inputCls} />
        </label>
        <label className="w-40">
          <span className="mb-1.5 block text-xs font-semibold text-dim">종목</span>
          <input value={sport} onChange={(e) => setSport(e.target.value)} maxLength={20} placeholder="예: 축구" className={inputCls} />
        </label>
        <button type="submit" disabled={sending} className={btnPrimary}>
          {sending ? '추가 중...' : '리그 추가'}
        </button>
      </div>
      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}
    </form>
  )
}

function EditRow({ league, onCancel, onSaved }: { league: League; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(league.name)
  const [sport, setSport] = useState(league.sport)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const onSave = async () => {
    const n = name.trim()
    const s = sport.trim()
    const problem = validateLeague(n, s)
    if (problem) return setError(problem)
    setSending(true)
    setError(null)
    try {
      await apiFetch<League>(`/admin/leagues/${league.id}`, { method: 'PATCH', body: { name: n, sport: s } })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
      setSending(false)
    }
  }

  return (
    <tr className="border-b border-edge-soft bg-card-hover last:border-b-0">
      <td className={`${tdCls} align-top text-muted`}>#{league.id}</td>
      <td className="px-3 py-2 align-top" colSpan={2}>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} aria-label="리그 이름" className={`${inputCls} h-8`} />
          <input value={sport} onChange={(e) => setSport(e.target.value)} maxLength={20} aria-label="종목" className={`${inputCls} h-8 w-32!`} />
        </div>
        {error && <p className="mt-1.5 text-xs whitespace-pre-line text-danger">{error}</p>}
      </td>
      <td className={`${tdCls} text-right align-top tabular-nums`}>{league.matchCount}</td>
      <td className={`${tdCls} align-top text-dim`}>{formatDate(league.createdAt)}</td>
      <td className={`${tdCls} text-right align-top`}>
        <span className="inline-flex gap-1.5">
          <button type="button" disabled={sending} onClick={() => void onSave()} className={btnSmPrimary}>
            {sending ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={onCancel} className={btnSmSecondary}>
            취소
          </button>
        </span>
      </td>
    </tr>
  )
}
