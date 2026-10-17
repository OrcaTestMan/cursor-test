import { useState } from 'react'
import { Link } from 'react-router'
import { IconBan } from '../../components/icons'
import { EmptyState, ErrorBox, FormError, Loading, PageHeader, Pagination } from '../../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { formatShort } from '../../lib/format'
import { useQueryState } from '../../lib/params'
import { btnSmPrimary, btnSmSecondary, tdCls, thCls, trCls } from '../../lib/styles'
import type { AdminUser, Paged } from '../../lib/types'

export default function AdminBlacklistPage() {
  const qs = useQueryState()
  const list = useApi<Paged<AdminUser>>(`/admin/users${buildQuery({ status: 'blocked', page: qs.page, pageSize: qs.pageSize })}`)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div>
      <PageHeader icon={<IconBan size={20} />} title="블랙리스트" subtitle="이용이 제한된 회원 목록입니다." />
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
        <EmptyState icon={<IconBan size={20} />} title="차단된 회원이 없습니다" description="회원 관리에서 회원을 차단하면 여기에 표시됩니다." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-edge bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-edge">
                <tr>
                  <th className={thCls}>ID</th>
                  <th className={thCls}>사용자</th>
                  <th className={thCls}>차단 사유</th>
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
                    <td className={`${tdCls} text-dim tabular-nums`}>{formatShort(u.createdAt)}</td>
                    <td className={`${tdCls} text-dim tabular-nums`}>{u.lastLoginAt ? formatShort(u.lastLoginAt) : '-'}</td>
                    <td className={`${tdCls} text-right`}>
                      <span className="inline-flex gap-1.5">
                        <Link to={`/admin/users?open=${u.id}`} className={btnSmSecondary}>
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
            onPage={(p) => qs.update({ page: p })}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}
    </div>
  )
}
