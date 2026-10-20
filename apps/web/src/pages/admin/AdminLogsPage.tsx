import { useEffect, useState } from 'react'
import { EmptyFilterActions, FilterChoice, ListFilterBar, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../../components/filters'
import { IconHistory } from '../../components/admin/AdminUi'
import { EmptyState, ErrorBox, Field, Loading, PageHeader, Pagination, Pill, type Tone } from '../../components/ui'
import { LOG_ACTION_GROUPS, logActionLabel, logTargetLabel } from '../../lib/admin'
import { buildQuery, useApi } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../../lib/list-query'
import { useQueryState } from '../../lib/params'
import { inputCls, tdCls, thCls, trCls } from '../../lib/styles'
import type { AdminLog, Paged } from '../../lib/types'

const TARGET_TYPES = [
  { value: '', label: '전체 대상' },
  { value: 'user', label: '회원' },
  { value: 'post', label: '글' },
  { value: 'comment', label: '댓글' },
  { value: 'match', label: '경기' },
  { value: 'league', label: '리그' },
  { value: 'report', label: '신고' },
  { value: 'inquiry', label: '문의' },
  { value: 'message', label: '쪽지' },
  { value: 'settings', label: '설정' },
  { value: 'word', label: '금칙어' },
]

type Extra = {
  action: string
  adminId: string
  targetType: string
  targetId: string
}

const EMPTY_EXTRA: Extra = { action: '', adminId: '', targetType: '', targetId: '' }

function extraFromParams(get: (key: string) => string): Extra {
  const actionParam = get('action')
  const action = LOG_ACTION_GROUPS.some((g) => g.value === actionParam) ? actionParam : ''
  const targetType = TARGET_TYPES.some((item) => item.value === get('targetType')) ? get('targetType') : ''
  return {
    action,
    adminId: get('adminId'),
    targetType,
    targetId: get('targetId'),
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    action: extra.action || null,
    adminId: extra.adminId || null,
    targetType: extra.targetType || null,
    targetId: extra.targetId || null,
  }
}

function advancedCountOf(extra: Extra) {
  return [extra.adminId, extra.targetType, extra.targetId].filter(Boolean).length
}

function actionTone(action: string): Tone {
  if (/\.(delete|block)$/.test(action)) return 'red'
  if (/\.(hide|dismiss|reset_password)$/.test(action)) return 'gold'
  if (/\.(create|add|unblock|approve|show)$/.test(action)) return 'green'
  return 'blue'
}

export default function AdminLogsPage() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs)
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const list = useApi<Paged<AdminLog>>(
    `/admin/logs${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
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

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.action) {
    const label = LOG_ACTION_GROUPS.find((g) => g.value === appliedExtra.action)?.label ?? appliedExtra.action
    chips.push({
      key: 'action',
      label: `작업: ${label}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, action: '' }),
    })
  }
  if (appliedExtra.adminId) {
    chips.push({
      key: 'adminId',
      label: `관리자: #${appliedExtra.adminId}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, adminId: '' }),
    })
  }
  if (appliedExtra.targetType) {
    chips.push({
      key: 'targetType',
      label: `대상: ${logTargetLabel(appliedExtra.targetType)}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, targetType: '' }),
    })
  }
  if (appliedExtra.targetId) {
    chips.push({
      key: 'targetId',
      label: `대상번호: #${appliedExtra.targetId}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, targetId: '' }),
    })
  }

  const total = list.data?.total ?? 0

  return (
    <div>
      <PageHeader icon={<IconHistory size={20} />} title="관리 이력" subtitle="관리자가 한 조치를 최신순으로 확인합니다." />
      <ListFilterBar
        dateLabel="기록일 기준"
        searchPlaceholder="내용, 관리자 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        advancedCount={advancedCountOf(appliedExtra)}
        chips={chips}
        basic={
          <FilterChoice
            label="작업 종류"
            value={extra.action}
            onChange={(value) => setExtra({ ...extra, action: value })}
            items={LOG_ACTION_GROUPS.map((g) => ({ value: g.value, label: g.value ? `${g.label} (${g.value})` : g.label }))}
          />
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="관리자 회원번호">
              <input value={extra.adminId} onChange={(e) => setExtra({ ...extra, adminId: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 1" />
            </Field>
            <Field label="대상 종류">
              <FilterChoice label="대상 종류" value={extra.targetType} onChange={(value) => setExtra({ ...extra, targetType: value })} items={TARGET_TYPES} />
            </Field>
            <Field label="대상 번호">
              <input value={extra.targetId} onChange={(e) => setExtra({ ...extra, targetId: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 12" />
            </Field>
          </div>
        }
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '건')}</p>}
      />

      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorBox message={list.error} onRetry={list.reload} />
      ) : !list.data || list.data.items.length === 0 ? (
        <EmptyState
          icon={<IconHistory size={20} />}
          title="선택한 기록일 기간과 검색어에 맞는 이력이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-edge bg-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-edge">
                <tr>
                  <th className={thCls}>시각</th>
                  <th className={thCls}>관리자</th>
                  <th className={thCls}>작업</th>
                  <th className={thCls}>대상</th>
                  <th className={thCls}>내용</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((log) => (
                  <tr key={log.id} className={trCls}>
                    <td className={`${tdCls} text-dim tabular-nums`}>{formatDateTime(log.createdAt)}</td>
                    <td className={tdCls}>{log.admin?.nickname ?? <span className="text-muted">알 수 없음</span>}</td>
                    <td className={tdCls}>
                      <span title={log.action}>
                        <Pill tone={actionTone(log.action)}>{logActionLabel(log.action)}</Pill>
                      </span>
                    </td>
                    <td className={`${tdCls} text-dim`}>
                      {logTargetLabel(log.targetType)}
                      {log.targetId !== null && <span className="ml-1 text-muted">#{log.targetId}</span>}
                    </td>
                    <td className={`${tdCls} max-w-[28rem] truncate text-dim`} title={log.detail}>
                      {log.detail || '-'}
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
