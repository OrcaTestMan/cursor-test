import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { EmptyFilterActions, FilterChoice, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { IconBell } from '../components/icons'
import { Card, EmptyState, ErrorBox, FormError, FormSuccess, Loading, PageHeader, Pagination, Pill } from '../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../lib/api'
import { formatRelative, formatShort, NOTIFICATION_TYPE_LABELS } from '../lib/format'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { btnSecondary, cardCls } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { Notification, NotificationList, NotificationSettings, NotificationType } from '../lib/types'

type Extra = { unread: '' | 'true'; type: NotificationType | '' }
const EMPTY_EXTRA: Extra = { unread: '', type: '' }
const TYPES = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]

function extraFromParams(get: (key: string) => string): Extra {
  const type = get('type')
  return {
    unread: get('unread') === 'true' ? 'true' : '',
    type: TYPES.includes(type as NotificationType) ? (type as NotificationType) : '',
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return { unread: extra.unread || null, type: extra.type || null }
}

const SETTING_ORDER: NotificationType[] = [
  'comment',
  'reply',
  'mention',
  'subscribe',
  'follow',
  'inquiry_answer',
  'message',
  'report_result',
]

export default function NotificationsPage() {
  useTitle('알림')
  const navigate = useNavigate()
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs)
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const { data, loading, error, reload } = useApi<NotificationList>(
    `/notifications${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const apply = (dates = draft, nextExtra = extra) => qs.update({ ...serializeDateFilter(dates), ...extraQuery(nextExtra) })
  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(EMPTY_EXTRA) }, { replace: true })
  }
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.unread) {
    chips.push({ key: 'unread', label: '안 읽음', onRemove: () => apply(appliedDates, { ...appliedExtra, unread: '' }) })
  }
  if (appliedExtra.type) {
    chips.push({
      key: 'type',
      label: `종류: ${NOTIFICATION_TYPE_LABELS[appliedExtra.type]}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, type: '' }),
    })
  }

  const openItem = async (item: Notification) => {
    setActionError(null)
    if (item.available === false) {
      setActionError('삭제되었거나 볼 수 없는 글입니다.')
      if (!item.readAt) {
        try {
          await apiFetch<Notification>(`/notifications/${item.id}/read`, { method: 'POST' })
          reload()
        } catch (err) {
          setActionError(errorMessage(err))
        }
      }
      return
    }
    if (!item.readAt) {
      try {
        await apiFetch<Notification>(`/notifications/${item.id}/read`, { method: 'POST' })
      } catch (err) {
        setActionError(errorMessage(err))
        return
      }
    }
    navigate(item.link)
  }

  const onReadAll = async () => {
    setBusy(true)
    setActionError(null)
    try {
      await apiFetch<void>('/notifications/read-all', { method: 'POST' })
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const unread = data?.unreadCount ?? 0

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<IconBell size={20} />}
        title="알림"
        subtitle={data ? `읽지 않은 알림 ${unread}개` : '댓글, 답글, 멘션, 구독, 팔로우 알림을 확인합니다.'}
        action={
          unread > 0 ? (
            <button type="button" disabled={busy} onClick={() => void onReadAll()} className={btnSecondary}>
              {busy ? '처리 중...' : '모두 읽음'}
            </button>
          ) : undefined
        }
      />
      <ListFilterBar
        dateLabel="알림일 기준"
        searchPlaceholder="알림 내용 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        chips={chips}
        basic={
          <>
            <OptionButtons
              label="읽음"
              value={extra.unread}
              onChange={(value) => setExtra({ ...extra, unread: value })}
              items={[
                { value: '', label: '전체' },
                { value: 'true', label: '안 읽음' },
              ]}
            />
            <FilterChoice
              label="알림 종류"
              value={extra.type}
              onChange={(value) => setExtra({ ...extra, type: TYPES.includes(value as NotificationType) ? (value as NotificationType) : '' })}
              items={[{ value: '', label: '전체 종류' }, ...TYPES.map((type) => ({ value: type, label: NOTIFICATION_TYPE_LABELS[type] }))]}
            />
          </>
        }
        summary={<p className="text-xs text-dim">{resultCountText(data?.total ?? 0, qs.page, qs.pageSize, '건')}</p>}
      />
      <NotificationSettingsCard />
      {actionError && (
        <div>
          <FormError message={actionError} />
        </div>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconBell size={20} />}
          title="선택한 알림일 기간과 검색어에 맞는 알림이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
        />
      ) : (
        <>
          <ul className={`${cardCls} overflow-hidden`}>
            {data.items.map((item) => (
              <li key={item.id} className="border-b border-edge-soft last:border-b-0">
                <button
                  type="button"
                  onClick={() => void openItem(item)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-card-hover"
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-accent'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex items-center gap-2">
                      <Pill tone={item.readAt ? 'gray' : 'green'}>{NOTIFICATION_TYPE_LABELS[item.type]}</Pill>
                      <span className="text-xs text-muted tabular-nums">{formatRelative(item.createdAt)}</span>
                    </span>
                    <span className={`block text-sm ${item.readAt ? 'text-dim' : 'font-semibold'}`}>
                      {item.available === false ? '삭제되었거나 볼 수 없는 글입니다.' : item.text}
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-xs text-muted tabular-nums">{formatShort(item.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination
            page={qs.page}
            pageSize={qs.pageSize}
            total={data.total}
            onPage={(p) => qs.update({ page: p }, true)}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}
    </div>
  )
}

function NotificationSettingsCard() {
  const { data, loading, error, reload } = useApi<NotificationSettings>('/notifications/settings')
  const [busy, setBusy] = useState<NotificationType | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const toggle = async (type: NotificationType, enabled: boolean) => {
    setBusy(type)
    setSaveError(null)
    setNotice(null)
    try {
      await apiFetch<NotificationSettings>('/notifications/settings', {
        method: 'PATCH',
        body: { [type]: enabled },
      })
      setNotice('알림 설정을 저장했습니다.')
      reload()
    } catch (err) {
      setSaveError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card title="알림 종류">
      <div className="space-y-3 p-4">
        {loading && !data ? (
          <Loading />
        ) : error && !data ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data ? (
          <>
            <p className="text-xs text-dim">끈 종류의 알림은 더 이상 오지 않습니다. 이미 받은 알림은 목록에 남습니다.</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {SETTING_ORDER.map((type) => (
                <li key={type}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={data[type]}
                      disabled={busy === type}
                      onChange={(e) => void toggle(type, e.target.checked)}
                    />
                    {NOTIFICATION_TYPE_LABELS[type]}
                  </label>
                </li>
              ))}
            </ul>
            <FormError message={saveError} />
            <FormSuccess message={notice} />
          </>
        ) : null}
      </div>
    </Card>
  )
}
