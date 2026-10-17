import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { IconSearch, IconSend, IconUsers } from '../../components/icons'
import {
  EmptyState,
  ErrorBox,
  Field,
  FormError,
  FormSuccess,
  Loading,
  Modal,
  PageHeader,
  Pagination,
  RolePill,
  UserStatusPill,
} from '../../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDateTime, formatShort, ROLE_LABELS, toPositiveInt } from '../../lib/format'
import { useQueryState } from '../../lib/params'
import { btnDanger, btnPrimary, btnSecondary, btnSmSecondary, inputCls, selectCls, tdCls, textareaCls, thCls, trCls } from '../../lib/styles'
import type { AdminUser, Paged, Role } from '../../lib/types'

export default function AdminUsersPage() {
  const qs = useQueryState()
  const q = qs.get('q')
  const statusParam = qs.get('status')
  const status = statusParam === 'active' || statusParam === 'blocked' ? statusParam : ''
  const roleParam = qs.get('role')
  const role = roleParam === 'user' || roleParam === 'admin' ? roleParam : ''
  const openId = toPositiveInt(qs.get('open'))
  const [search, setSearch] = useState(q)

  const list = useApi<Paged<AdminUser>>(
    `/admin/users${buildQuery({ q: q || null, status: status || null, role: role || null, page: qs.page, pageSize: qs.pageSize })}`,
  )

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    qs.update({ q: search.trim() || null })
  }

  return (
    <div>
      <PageHeader icon={<IconUsers size={20} />} title="회원 관리" subtitle="회원 정보와 권한, 이용 제한을 관리합니다." />
      <form onSubmit={onSearch} className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-64">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="아이디 또는 닉네임" aria-label="회원 검색" className={`${inputCls} pl-9`} />
        </div>
        <select aria-label="상태" value={status} onChange={(e) => qs.update({ status: e.target.value || null })} className={selectCls}>
          <option value="">전체 상태</option>
          <option value="active">활성</option>
          <option value="blocked">차단</option>
        </select>
        <select aria-label="권한" value={role} onChange={(e) => qs.update({ role: e.target.value || null })} className={selectCls}>
          <option value="">전체 권한</option>
          <option value="user">일반 회원</option>
          <option value="admin">관리자</option>
        </select>
        <button type="submit" className={btnSecondary}>
          검색
        </button>
      </form>

      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorBox message={list.error} onRetry={list.reload} />
      ) : !list.data || list.data.items.length === 0 ? (
        <EmptyState icon={<IconUsers size={20} />} title="조건에 맞는 회원이 없습니다" description="검색어나 필터를 바꿔 보세요." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-edge bg-card">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-edge">
                <tr>
                  <th className={thCls}>ID</th>
                  <th className={thCls}>사용자</th>
                  <th className={thCls}>권한</th>
                  <th className={thCls}>상태</th>
                  <th className={`${thCls} text-right`}>글</th>
                  <th className={`${thCls} text-right`}>댓글</th>
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
                    <td className={tdCls}>
                      <RolePill role={u.role} />
                    </td>
                    <td className={tdCls}>
                      <UserStatusPill status={u.status} />
                    </td>
                    <td className={`${tdCls} text-right tabular-nums`}>{u.postCount}</td>
                    <td className={`${tdCls} text-right tabular-nums`}>{u.commentCount}</td>
                    <td className={`${tdCls} text-dim tabular-nums`}>{formatShort(u.createdAt)}</td>
                    <td className={`${tdCls} text-dim tabular-nums`}>{u.lastLoginAt ? formatShort(u.lastLoginAt) : '-'}</td>
                    <td className={`${tdCls} text-right`}>
                      <button type="button" onClick={() => qs.update({ open: u.id }, true)} className={btnSmSecondary}>
                        상세
                      </button>
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

      {openId && <UserDetailModal id={openId} onClose={() => qs.update({ open: null }, true)} onChanged={list.reload} />}
    </div>
  )
}

function UserDetailModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useApi<AdminUser>(`/admin/users/${id}`)
  return (
    <Modal title={`회원 상세 #${id}`} onClose={onClose} wide>
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox message={error ?? '회원을 찾을 수 없습니다.'} onRetry={reload} />
      ) : (
        <UserDetail key={data.id} initial={data} onChanged={onChanged} />
      )}
    </Modal>
  )
}

function UserDetail({ initial, onChanged }: { initial: AdminUser; onChanged: () => void }) {
  const { user: me } = useAuth()
  const [user, setUser] = useState(initial)
  const isSelf = me?.id === user.id
  const [role, setRole] = useState<Role>(user.role)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const patch = async (body: Record<string, unknown>, message: string) => {
    setSending(true)
    setError(null)
    setDone(null)
    try {
      const saved = await apiFetch<AdminUser>(`/admin/users/${user.id}`, { method: 'PATCH', body })
      setUser(saved)
      setRole(saved.role)
      setReason('')
      setDone(message)
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const onRole = () => {
    if (role === user.role) return
    if (!window.confirm(`${user.nickname} 님의 권한을 '${ROLE_LABELS[role]}'(으)로 바꿀까요?`)) return
    void patch({ role }, '권한을 바꿨습니다.')
  }

  const onBlock = () => {
    const text = reason.trim()
    if (text.length > 200) return setError('차단 사유는 200자 이내로 입력해 주세요.')
    if (!window.confirm(`${user.nickname} 님을 차단할까요? 로그인 중인 세션도 모두 끊깁니다.`)) return
    void patch({ status: 'blocked', ...(text ? { blockedReason: text } : {}) }, '회원을 차단했습니다.')
  }

  const onUnblock = () => {
    if (!window.confirm(`${user.nickname} 님의 차단을 해제할까요?`)) return
    void patch({ status: 'active' }, '차단을 해제했습니다.')
  }

  const rows: [string, string][] = [
    ['아이디', user.username],
    ['닉네임', user.nickname],
    ['가입일', formatDateTime(user.createdAt)],
    ['최근 로그인', user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '-'],
    ['작성 글', `${user.postCount}건`],
    ['작성 댓글', `${user.commentCount}건`],
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <RolePill role={user.role} />
        <UserStatusPill status={user.status} />
        <Link to={`/admin/messages?to=${user.id}`} className={`${btnSecondary} ml-auto h-8 px-3`}>
          <IconSend size={14} /> 쪽지 보내기
        </Link>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3">
            <dt className="w-20 shrink-0 text-dim">{label}</dt>
            <dd className="min-w-0 truncate">{value}</dd>
          </div>
        ))}
      </dl>
      {user.status === 'blocked' && (
        <div className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          차단 사유: {user.blockedReason || '사유 없음'}
        </div>
      )}

      <div className="space-y-3 border-t border-edge pt-4">
        <Field label="권한" hint={isSelf ? '자기 자신의 권한은 내릴 수 없습니다.' : undefined}>
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value === 'admin' ? 'admin' : 'user')}
              className={`${selectCls} w-40`}
            >
              <option value="user">일반 회원</option>
              <option value="admin">관리자</option>
            </select>
            <button type="button" onClick={onRole} disabled={sending || role === user.role} className={btnPrimary}>
              권한 저장
            </button>
          </div>
        </Field>
      </div>

      <div className="space-y-3 border-t border-edge pt-4">
        {user.status === 'active' ? (
          <>
            <Field label="차단 사유" hint="로그인 시 회원에게 함께 안내됩니다.">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={200} className={textareaCls} />
            </Field>
            <div className="flex justify-end">
              <button type="button" onClick={onBlock} disabled={sending || isSelf} className={btnDanger}>
                회원 차단
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-end">
            <button type="button" onClick={onUnblock} disabled={sending} className={btnPrimary}>
              차단 해제
            </button>
          </div>
        )}
      </div>
      <FormError message={error} />
      <FormSuccess message={done} />
    </div>
  )
}
