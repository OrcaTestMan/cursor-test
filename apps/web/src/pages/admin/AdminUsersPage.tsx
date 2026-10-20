import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AdminUserStatusPill, IconKey, TempPasswordBox } from '../../components/admin/AdminUi'
import { ListFilterBar, FilterChoice, OptionButtons, useRestoredDateFilter, type FilterChip } from '../../components/filters'
import { IconSend, IconUsers } from '../../components/icons'
import { Avatar, EmptyState, ErrorBox, Field, FormError, FormSuccess, Loading, Modal, PageHeader, Pagination, RolePill } from '../../components/ui'
import { BLOCK_DAY_OPTIONS, blockedUntilText } from '../../lib/admin'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { dateFilterQuery, emptyDateFilter, integerRangeError, optionalIntError, resultCountText, serializeDateFilter } from '../../lib/list-query'
import { formatDateTime, formatShort, ROLE_LABELS, toPositiveInt } from '../../lib/format'
import { useQueryState } from '../../lib/params'
import { loadSavedFilters, paramsFromSearch, removeSavedFilter, saveFilter } from '../../lib/saved-filters'
import { btnDanger, btnPrimary, btnSecondary, btnSmSecondary, inputCls, selectCls, tdCls, textareaCls, thCls, trCls } from '../../lib/styles'
import type { AdminUser, Paged, Role, Team, UserStatus } from '../../lib/types'

type Extra = {
  status: UserStatus | ''
  role: Role | ''
  dateField: 'created' | 'lastLogin'
  sort: string
  hasLogin: '' | 'true' | 'false'
  inactiveDays: string
  minPosts: string
  maxPosts: string
  minComments: string
  maxComments: string
  teamId: string
  hasBio: '' | 'true' | 'false'
  hasAvatar: '' | 'true' | 'false'
}

const EMPTY_EXTRA: Extra = {
  status: '',
  role: '',
  dateField: 'created',
  sort: 'created_desc',
  hasLogin: '',
  inactiveDays: '',
  minPosts: '',
  maxPosts: '',
  minComments: '',
  maxComments: '',
  teamId: '',
  hasBio: '',
  hasAvatar: '',
}

function extraFromParams(get: (key: string) => string): Extra {
  const status = get('status')
  const role = get('role')
  const dateField = get('dateField') === 'lastLogin' ? 'lastLogin' : 'created'
  const hasLogin = get('hasLogin')
  const hasBio = get('hasBio')
  const hasAvatar = get('hasAvatar')
  return {
    status: status === 'active' || status === 'blocked' || status === 'deleted' ? status : '',
    role: role === 'user' || role === 'admin' ? role : '',
    dateField,
    sort: get('sort') || 'created_desc',
    hasLogin: hasLogin === 'true' || hasLogin === 'false' ? hasLogin : '',
    inactiveDays: get('inactiveDays'),
    minPosts: get('minPosts'),
    maxPosts: get('maxPosts'),
    minComments: get('minComments'),
    maxComments: get('maxComments'),
    teamId: get('teamId'),
    hasBio: hasBio === 'true' || hasBio === 'false' ? hasBio : '',
    hasAvatar: hasAvatar === 'true' || hasAvatar === 'false' ? hasAvatar : '',
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    status: extra.status || null,
    role: extra.role || null,
    dateField: extra.dateField === 'lastLogin' ? 'lastLogin' : null,
    sort: extra.sort === 'created_desc' ? null : extra.sort,
    hasLogin: extra.hasLogin || null,
    inactiveDays: extra.inactiveDays || null,
    minPosts: extra.minPosts || null,
    maxPosts: extra.maxPosts || null,
    minComments: extra.minComments || null,
    maxComments: extra.maxComments || null,
    teamId: extra.teamId || null,
    hasBio: extra.hasBio || null,
    hasAvatar: extra.hasAvatar || null,
  }
}

function advancedCountOf(extra: Extra) {
  return [
    extra.hasLogin,
    extra.inactiveDays,
    extra.minPosts,
    extra.maxPosts,
    extra.minComments,
    extra.maxComments,
    extra.teamId,
    extra.hasBio,
    extra.hasAvatar,
  ].filter(Boolean).length
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export default function AdminUsersPage() {
  const qs = useQueryState()
  const { user } = useAuth()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'today', {
    keys: ['inactiveDays'],
    pairs: [
      ['minPosts', 'maxPosts'],
      ['minComments', 'maxComments'],
    ],
  })
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const [notice, setNotice] = useState<string | null>(null)
  const [filterAlert, setFilterAlert] = useState<string | null>(null)
  const openId = toPositiveInt(qs.get('open'))
  const teams = useApi<Team[]>('/teams')
  const saved = user ? loadSavedFilters(user.id, 'admin-users') : []

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const list = useApi<Paged<AdminUser>>(
    `/admin/users${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const apply = (dates = draft, nextExtra = extra) => {
    setFilterAlert(null)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(nextExtra) })
  }
  const submit = () => {
    const message =
      optionalIntError(extra.inactiveDays, '미로그인 일수') ||
      integerRangeError(extra.minPosts, extra.maxPosts, '글 수 최소', '글 수 최대') ||
      integerRangeError(extra.minComments, extra.maxComments, '댓글 수 최소', '댓글 수 최대')
    if (message) {
      setFilterAlert(message)
      return
    }
    apply()
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
    if (id === 'today-user') next = { ...next, role: 'user' }
    if (id === 'today-login') next = { ...next, dateField: 'lastLogin' }
    if (id === 'inactive-30') {
      dates.range = 'all'
      next = { ...next, role: 'user', inactiveDays: '30' }
    }
    if (id === 'posts-10') {
      dates.range = 'all'
      next = { ...next, role: 'user', minPosts: '10' }
    }
    if (id === 'no-login') {
      dates.range = 'all'
      next = { ...next, hasLogin: 'false' }
    }
    setDraft(dates)
    setExtra(next)
    apply(dates, next)
  }

  const chips: FilterChip[] = []
  chips.push({
    key: 'range',
    label: appliedDates.range === 'all' ? '기간: 전체' : '기간: 오늘',
    onRemove: appliedDates.range === 'today' ? undefined : () => apply({ ...appliedDates, range: 'today', from: emptyDateFilter().from, to: emptyDateFilter().to }, appliedExtra),
  })
  if (appliedDates.range === 'custom') {
    chips[0] = {
      key: 'range',
      label: `기간: ${appliedDates.from} ~ ${appliedDates.to}`,
      onRemove: () => apply({ ...appliedDates, range: 'today' }, appliedExtra),
    }
  }
  if (appliedExtra.status) {
    chips.push({
      key: 'status',
      label: `상태: ${appliedExtra.status === 'active' ? '활성' : appliedExtra.status === 'blocked' ? '차단' : '탈퇴'}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, status: '' }),
    })
  }
  if (appliedExtra.role) {
    chips.push({
      key: 'role',
      label: `권한: ${appliedExtra.role === 'admin' ? '관리자' : '일반'}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, role: '' }),
    })
  }
  if (appliedExtra.inactiveDays) {
    chips.push({
      key: 'inactive',
      label: `미로그인: ${appliedExtra.inactiveDays}일 이상`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, inactiveDays: '' }),
    })
  }
  if (appliedExtra.minPosts) {
    chips.push({
      key: 'minPosts',
      label: `누적 글: ${appliedExtra.minPosts}개 이상`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, minPosts: '' }),
    })
  }
  if (appliedExtra.hasLogin === 'false') {
    chips.push({
      key: 'hasLogin',
      label: '로그인 기록 없음',
      onRemove: () => apply(appliedDates, { ...appliedExtra, hasLogin: '' }),
    })
  }

  const dateLabel = appliedExtra.dateField === 'lastLogin' ? '최근 로그인일 기준' : '가입일 기준'
  const total = list.data?.total ?? 0

  return (
    <div>
      <PageHeader icon={<IconUsers size={20} />} title="회원 관리" subtitle="회원 정보와 권한, 이용 제한을 관리합니다." />
      <ListFilterBar
        dateLabel={dateLabel}
        searchPlaceholder="회원번호, 아이디, 닉네임 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={submit}
        onReset={reset}
        restoreNotice={restoreNotice}
        alert={filterAlert}
        advancedCount={advancedCountOf(appliedExtra)}
        chips={chips}
        presets={[
          { id: 'today-user', label: '오늘 가입한 일반 회원' },
          { id: 'today-login', label: '오늘 로그인한 회원' },
          { id: 'inactive-30', label: '30일 미로그인 · 가입기간 전체' },
          { id: 'posts-10', label: '글 10개 이상 · 가입기간 전체' },
          { id: 'no-login', label: '로그인 기록 없는 회원 · 전체기간' },
        ]}
        onPreset={applyPreset}
        extraActions={
          user ? (
            <button
              type="button"
              className={btnSmSecondary}
              onClick={() => {
                const name = window.prompt('저장할 조건 이름')
                if (!name?.trim()) return
                saveFilter(user.id, 'admin-users', name.trim(), paramsFromSearch(window.location.search), appliedDates.range !== 'custom')
                setNotice('현재 조건을 저장했습니다.')
              }}
            >
              조건 저장
            </button>
          ) : null
        }
        basic={
          <>
            <OptionButtons
              label="상태"
              value={extra.status}
              onChange={(value) => setExtra({ ...extra, status: value })}
              items={[
                { value: '', label: '전체 상태' },
                { value: 'active', label: '활성' },
                { value: 'blocked', label: '차단' },
                { value: 'deleted', label: '탈퇴' },
              ]}
            />
            <OptionButtons
              label="권한"
              value={extra.role}
              onChange={(value) => setExtra({ ...extra, role: value })}
              items={[
                { value: '', label: '전체 권한' },
                { value: 'user', label: '일반' },
                { value: 'admin', label: '관리자' },
              ]}
            />
            <OptionButtons
              label="날짜 기준"
              value={extra.dateField}
              onChange={(value) => setExtra({ ...extra, dateField: value || 'created' })}
              items={[
                { value: 'created', label: '가입일' },
                { value: 'lastLogin', label: '최근 로그인일' },
              ]}
            />
            <FilterChoice
              label="정렬"
              value={extra.sort}
              onChange={(value) => setExtra({ ...extra, sort: value || 'created_desc' })}
              items={[
                { value: 'created_desc', label: '가입 최신순' },
                { value: 'created_asc', label: '가입 오래된 순' },
                { value: 'login_desc', label: '최근 로그인순' },
                { value: 'login_asc', label: '로그인 오래된 순' },
                { value: 'posts_desc', label: '글 수순' },
                { value: 'comments_desc', label: '댓글 수순' },
              ]}
            />
          </>
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="로그인 기록">
              <FilterChoice
                label="로그인 기록"
                value={extra.hasLogin}
                onChange={(value) => setExtra({ ...extra, hasLogin: value })}
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'true', label: '있음' },
                  { value: 'false', label: '없음' },
                ]}
              />
            </Field>
            <Field label="마지막 로그인 후 경과일">
              <input value={extra.inactiveDays} onChange={(e) => setExtra({ ...extra, inactiveDays: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 30" />
            </Field>
            <Field label="누적 글 수 이상/이하">
              <div className="flex gap-2">
                <input value={extra.minPosts} onChange={(e) => setExtra({ ...extra, minPosts: e.target.value })} inputMode="numeric" className={inputCls} placeholder="이상" />
                <input value={extra.maxPosts} onChange={(e) => setExtra({ ...extra, maxPosts: e.target.value })} inputMode="numeric" className={inputCls} placeholder="이하" />
              </div>
            </Field>
            <Field label="누적 댓글 수 이상/이하">
              <div className="flex gap-2">
                <input value={extra.minComments} onChange={(e) => setExtra({ ...extra, minComments: e.target.value })} inputMode="numeric" className={inputCls} placeholder="이상" />
                <input value={extra.maxComments} onChange={(e) => setExtra({ ...extra, maxComments: e.target.value })} inputMode="numeric" className={inputCls} placeholder="이하" />
              </div>
            </Field>
            <Field label="응원팀">
              <FilterChoice
                label="응원팀"
                value={extra.teamId}
                onChange={(value) => setExtra({ ...extra, teamId: value })}
                items={[{ value: '', label: '전체' }, ...(teams.data ?? []).map((team) => ({ value: String(team.id), label: team.name }))]}
              />
            </Field>
            <Field label="자기소개">
              <FilterChoice
                label="자기소개"
                value={extra.hasBio}
                onChange={(value) => setExtra({ ...extra, hasBio: value })}
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'true', label: '있음' },
                  { value: 'false', label: '없음' },
                ]}
              />
            </Field>
            <Field label="프로필 이미지">
              <FilterChoice
                label="프로필 이미지"
                value={extra.hasAvatar}
                onChange={(value) => setExtra({ ...extra, hasAvatar: value })}
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'true', label: '있음' },
                  { value: 'false', label: '없음' },
                ]}
              />
            </Field>
          </div>
        }
        summary={
          <p className="text-xs text-dim">
            {resultCountText(total, qs.page, qs.pageSize, '명')}
            {' · '}
            <Link to="/admin/users?range=all" className="font-semibold text-accent">
              누적 전체
            </Link>
          </p>
        }
      />
      {saved.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {saved.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-edge px-2 py-1">
              <button
                type="button"
                onClick={() => {
                  const patch: Record<string, string | null> = { range: null, from: null, to: null }
                  for (const [key, value] of Object.entries(item.params)) patch[key] = value
                  qs.update(patch)
                }}
              >
                {item.name}
              </button>
              <button type="button" aria-label="삭제" onClick={() => user && removeSavedFilter(user.id, 'admin-users', item.id)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {notice && <FormSuccess message={notice} />}

      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorBox message={list.error} onRetry={list.reload} />
      ) : !list.data || list.data.items.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} />}
          title="선택한 가입일 기간과 검색어에 맞는 회원이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSecondary} onClick={() => apply({ ...appliedDates, range: 'all' }, appliedExtra)}>
                전체기간으로 검색
              </button>
              <button type="button" className={btnSecondary} onClick={reset}>
                조건 초기화
              </button>
            </div>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-edge bg-card">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 border-b border-edge bg-card">
                <tr>
                  <th className={thCls}>회원번호</th>
                  <th className={thCls}>회원 정보</th>
                  <th className={thCls}>상태</th>
                  <th className={thCls}>권한</th>
                  <th className={`${thCls} text-right`}>글·댓글</th>
                  <th className={thCls}>가입일</th>
                  <th className={thCls}>최근 로그인</th>
                  <th className={`${thCls} text-right`}>관리</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((u) => (
                  <tr key={u.id} className={trCls}>
                    <td className={`${tdCls} text-muted`}>
                      <button type="button" className="hover:text-accent" onClick={() => void copyText(String(u.id)).then((ok) => setNotice(ok ? '회원번호를 복사했습니다.' : '복사하지 못했습니다.'))}>
                        #{u.id}
                      </button>
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2">
                        <Avatar name={u.nickname} uploadId={u.avatarUploadId} size="sm" />
                        <span>
                          <button type="button" className="block font-semibold hover:text-accent" onClick={() => qs.update({ open: u.id }, true)}>
                            {u.nickname}
                          </button>
                          <button
                            type="button"
                            className="block text-xs text-dim hover:text-fg"
                            onClick={() => void copyText(u.username).then((ok) => setNotice(ok ? '아이디를 복사했습니다.' : '복사하지 못했습니다.'))}
                          >
                            {u.username}
                          </button>
                        </span>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center gap-1.5">
                        <AdminUserStatusPill status={u.status} />
                        {blockedUntilText(u) && <span className="text-xs text-dim tabular-nums">{blockedUntilText(u)}</span>}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <RolePill role={u.role} />
                    </td>
                    <td className={`${tdCls} text-right tabular-nums`}>
                      <Link to={`/admin/posts?authorId=${u.id}&range=all`} className="hover:text-accent">
                        {u.postCount}
                      </Link>
                      {' / '}
                      <Link to={`/admin/posts?tab=comments&authorId=${u.id}&range=all`} className="hover:text-accent">
                        {u.commentCount}
                      </Link>
                    </td>
                    <td className={`${tdCls} text-dim tabular-nums`} title={formatDateTime(u.createdAt)}>
                      {formatShort(u.createdAt)}
                    </td>
                    <td className={`${tdCls} text-dim tabular-nums`} title={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : undefined}>
                      {u.lastLoginAt ? formatShort(u.lastLoginAt) : '로그인 기록 없음'}
                    </td>
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
            onPage={(p) => qs.update({ page: p }, true)}
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
  const isDeleted = user.status === 'deleted'
  const [role, setRole] = useState<Role>(user.role)
  const [reason, setReason] = useState('')
  const [blockDays, setBlockDays] = useState(7)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
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
    const period = blockDays === 0 ? '영구' : `${blockDays}일`
    if (!window.confirm(`${user.nickname} 님을 ${period} 차단할까요? 로그인 중인 세션도 모두 끊깁니다.`)) return
    void patch({ status: 'blocked', blockDays, ...(text ? { blockedReason: text } : {}) }, `회원을 ${period} 차단했습니다.`)
  }

  const onUnblock = () => {
    if (!window.confirm(`${user.nickname} 님의 차단을 해제할까요?`)) return
    void patch({ status: 'active' }, '차단을 해제했습니다.')
  }

  const onResetPassword = async () => {
    if (!window.confirm(`${user.nickname} 님의 비밀번호를 초기화할까요?\n임시 비밀번호가 발급되고 로그인 중인 세션이 모두 끊깁니다.`)) return
    setSending(true)
    setError(null)
    setDone(null)
    try {
      const res = await apiFetch<{ tempPassword: string }>(`/admin/users/${user.id}/reset-password`, { method: 'POST' })
      setTempPassword(res.tempPassword)
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const untilText = blockedUntilText(user)
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
        <AdminUserStatusPill status={user.status} />
        {!isDeleted && (
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={() => void onResetPassword()} disabled={sending} className={`${btnSecondary} h-8 px-3`}>
              <IconKey size={14} /> 비밀번호 초기화
            </button>
            <Link to={`/admin/messages?to=${user.id}`} className={`${btnSecondary} h-8 px-3`}>
              <IconSend size={14} /> 쪽지 보내기
            </Link>
          </span>
        )}
      </div>
      {tempPassword && <TempPasswordBox password={tempPassword} />}
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3">
            <dt className="w-20 shrink-0 text-dim">{label}</dt>
            <dd className="min-w-0 truncate">{value}</dd>
          </div>
        ))}
      </dl>
      {user.status === 'blocked' && (
        <div className="space-y-0.5 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p>차단 사유: {user.blockedReason || '사유 없음'}</p>
          <p>차단 기간: {untilText}</p>
        </div>
      )}
      {isDeleted && (
        <div className="rounded-lg border border-edge bg-input px-4 py-3 text-sm text-dim">
          탈퇴한 회원입니다. 쓴 글과 댓글은 남아 있으며 권한·차단을 바꿀 수 없습니다.
        </div>
      )}

      {!isDeleted && (
        <>
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
                <Field label="차단 기간" hint="기간이 지나면 회원이 로그인할 때 자동으로 풀립니다.">
                  <select value={blockDays} onChange={(e) => setBlockDays(Number(e.target.value))} className={`${selectCls} w-40`}>
                    {BLOCK_DAY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
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
        </>
      )}
      <FormError message={error} />
      <FormSuccess message={done} />
    </div>
  )
}
