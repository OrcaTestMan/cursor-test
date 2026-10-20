import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { EmptyFilterActions, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../../components/filters'
import { IconBan } from '../../components/icons'
import { EmptyState, ErrorBox, FormError, Loading, PageHeader, Pagination, Pill } from '../../components/ui'
import { blockedUntilText } from '../../lib/admin'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { formatShort } from '../../lib/format'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../../lib/list-query'
import { useQueryState } from '../../lib/params'
import { btnSmPrimary, btnSmSecondary, inputCls, tdCls, thCls, trCls } from '../../lib/styles'
import type { AdminUser, Paged } from '../../lib/types'

type Extra = {
  blockKind: '' | 'timed' | 'permanent'
  expireWithinHours: string
}

const EMPTY_EXTRA: Extra = { blockKind: '', expireWithinHours: '' }

function extraFromParams(get: (key: string) => string): Extra {
  const blockKind = get('blockKind')
  return {
    blockKind: blockKind === 'timed' || blockKind === 'permanent' ? blockKind : '',
    expireWithinHours: get('expireWithinHours'),
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    status: 'blocked',
    dateField: 'blocked',
    blockKind: extra.blockKind || null,
    expireWithinHours: extra.expireWithinHours || null,
  }
}

function advancedCountOf(extra: Extra) {
  return [extra.expireWithinHours].filter(Boolean).length
}

export default function AdminBlacklistPage() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs)
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const list = useApi<Paged<AdminUser>>(
    `/admin/users${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
      q: appliedDates.q || null,
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const apply = (dates = draft, nextExtra = extra) => {
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(nextExtra) })
  }

  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(EMPTY_EXTRA) }, { replace: true })
  }

  const applyPreset = (id: string) => {
    const dates = emptyDateFilter()
    let next = { ...EMPTY_EXTRA }
    if (id === 'today-block') {
      next = { ...next }
    }
    if (id === 'expire-24') {
      dates.range = 'all'
      next = { ...next, expireWithinHours: '24' }
    }
    if (id === 'permanent-all') {
      dates.range = 'all'
      next = { ...next, blockKind: 'permanent' }
    }
    setDraft(dates)
    setExtra(next)
    apply(dates, next)
  }

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.blockKind) {
    chips.push({
      key: 'blockKind',
      label: `종류: ${appliedExtra.blockKind === 'permanent' ? '영구' : '기간'}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, blockKind: '' }),
    })
  }
  if (appliedExtra.expireWithinHours) {
    chips.push({
      key: 'expire',
      label: `${appliedExtra.expireWithinHours}시간 내 해제 예정`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, expireWithinHours: '' }),
    })
  }

  const onUnblock = async (user: AdminUser) => {
    if (!window.confirm(`${user.nickname} 님의 차단을 해제할까요?`)) return
    setBusyId(user.id)
    setError(null)
    try {
      await apiFetch<AdminUser>(`/admin/users/${user.id}`, { method: 'PATCH', body: { status: 'active' } })
      list.reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const total = list.data?.total ?? 0

  return (
    <div>
      <PageHeader icon={<IconBan size={20} />} title="블랙리스트" subtitle="이용이 제한된 회원 목록입니다. 기간 차단은 기간이 지난 뒤 로그인하면 자동으로 풀립니다." />
      <ListFilterBar
        dateLabel="차단일 기준"
        searchPlaceholder="회원번호, 아이디, 닉네임, 차단 사유 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        advancedCount={advancedCountOf(appliedExtra)}
        chips={chips}
        presets={[
          { id: 'today-block', label: '오늘 차단' },
          { id: 'expire-24', label: '전체 24시간 내 해제 예정' },
          { id: 'permanent-all', label: '전체기간 영구 차단' },
        ]}
        onPreset={applyPreset}
        basic={
          <OptionButtons
            label="차단 종류"
            value={extra.blockKind}
            onChange={(value) => setExtra({ ...extra, blockKind: value })}
            items={[
              { value: '', label: '전체 종류' },
              { value: 'timed', label: '기간 차단' },
              { value: 'permanent', label: '영구 차단' },
            ]}
          />
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-dim">해제 예정(시간 이내)</span>
              <input
                value={extra.expireWithinHours}
                onChange={(e) => setExtra({ ...extra, expireWithinHours: e.target.value })}
                inputMode="numeric"
                className={inputCls}
                placeholder="예: 24"
              />
            </label>
          </div>
        }
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '명')}</p>}
      />
      {error && (
        <div className="mb-3">
          <FormError message={error} />
        </div>
      )}
      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorBox message={list.error} onRetry={list.reload} />
      ) : !list.data || list.data.items.length === 0 ? (
        <EmptyState
          icon={<IconBan size={20} />}
          title="선택한 차단일 기간과 검색어에 맞는 회원이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-edge bg-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-edge">
                <tr>
                  <th className={thCls}>ID</th>
                  <th className={thCls}>사용자</th>
                  <th className={thCls}>차단 사유</th>
                  <th className={thCls}>차단 기간</th>
                  <th className={thCls}>차단일</th>
                  <th className={thCls}>가입</th>
                  <th className={thCls}>최근 로그인</th>
                  <th className={`${thCls} text-right`}>관리</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((u) => (
                  <tr key={u.id} className={trCls}>
                    <td className={`${tdCls} text-muted`}>#{u.id}</td>
                    <td className={tdCls}>
                      <span className="font-semibold">{u.nickname}</span>
                      <span className="text-dim">({u.username})</span>
                    </td>
                    <td className={`${tdCls} max-w-80 truncate text-dim`} title={u.blockedReason ?? undefined}>
                      {u.blockedReason || '-'}
                    </td>
                    <td className={`${tdCls} tabular-nums`}>
                      {u.blockedUntil ? <span className="text-dim">{blockedUntilText(u)}</span> : <Pill tone="red">영구</Pill>}
                    </td>
                    <td className={`${tdCls} text-dim tabular-nums`}>{u.blockedAt ? formatShort(u.blockedAt) : '차단일 미기록'}</td>
                    <td className={`${tdCls} text-dim tabular-nums`}>{formatShort(u.createdAt)}</td>
                    <td className={`${tdCls} text-dim tabular-nums`}>{u.lastLoginAt ? formatShort(u.lastLoginAt) : '-'}</td>
                    <td className={`${tdCls} text-right`}>
                      <span className="inline-flex gap-1.5">
                        <Link to={`/admin/users?open=${u.id}&range=all`} className={btnSmSecondary}>
                          상세
                        </Link>
                        <button type="button" disabled={busyId === u.id} onClick={() => void onUnblock(u)} className={btnSmPrimary}>
                          차단 해제
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={qs.page}
            pageSize={qs.pageSize}
            total={list.data.total}
            onPage={(p) => qs.update({ page: p }, true)}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}
    </div>
  )
}
