import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { IconBookmark, IconFile, IconTarget, IconUser } from '../components/icons'
import { PostTable } from '../components/posts'
import { MuteManageList, SocialUserList } from '../components/social'
import { TeamBadge, TeamPicker } from '../components/teams'
import {
  Avatar,
  Card,
  EmptyState,
  ErrorBox,
  Field,
  FormError,
  FormSuccess,
  Loading,
  MatchStatusPill,
  PageHeader,
  Pagination,
  Pill,
  RolePill,
  SegmentedTabs,
  type TabItem,
} from '../components/ui'
import { EmptyFilterActions, ListFilterBar, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { apiFetch, apiUpload, buildQuery, errorMessage, useApi } from '../lib/api'
import { imageLimitMessage } from '../lib/files'
import { useAuth } from '../lib/auth'
import { profilePath } from '../lib/boards'
import {
  formatDate,
  formatDateTime,
  formatNumber,
  PICK_LABELS,
  PREDICTION_RESULT_LABELS,
  scoreText,
} from '../lib/format'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { btnDanger, btnPrimary, btnSecondary, cardCls, inputCls, textareaCls } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { MeProfile, MyPredictionList, Paged, PostSummary, Team, UploadFile } from '../lib/types'

type MeTab = 'info' | 'posts' | 'bookmarks' | 'predictions' | 'following' | 'mutes'

const TABS: TabItem<MeTab>[] = [
  { value: 'info', label: '내 정보' },
  { value: 'posts', label: '내 글' },
  { value: 'bookmarks', label: '스크랩' },
  { value: 'predictions', label: '내 예측' },
  { value: 'following', label: '팔로우' },
  { value: 'mutes', label: '숨긴 회원' },
]

const TAB_TITLES: Record<MeTab, string> = {
  info: '내 정보',
  posts: '내 글',
  bookmarks: '스크랩',
  predictions: '내 예측',
  following: '팔로우',
  mutes: '숨긴 회원',
}

function isMeTab(value: string | null): value is MeTab {
  return (
    value === 'info' ||
    value === 'posts' ||
    value === 'bookmarks' ||
    value === 'predictions' ||
    value === 'following' ||
    value === 'mutes'
  )
}

function nicknameLockDays(changedAt: string | null): number {
  if (!changedAt) return 0
  const remaining = new Date(changedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()
  return remaining > 0 ? Math.ceil(remaining / (24 * 60 * 60 * 1000)) : 0
}

function hitRateText(rate: number, decided: number): string {
  if (decided === 0) return '-'
  const pct = rate <= 1 ? rate * 100 : rate
  return `${Math.round(pct)}%`
}

export default function MePage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('tab')
  const tab: MeTab = isMeTab(rawTab) ? rawTab : 'info'
  useTitle(TAB_TITLES[tab])
  if (!user) return null

  return (
    <div className="space-y-5">
      <PageHeader icon={<IconUser size={20} />} title="내 정보" subtitle="계정, 작성 글, 스크랩, 예측, 팔로우를 관리합니다." />
      <SegmentedTabs
        items={TABS}
        value={tab}
        onChange={(v) => {
          const next = new URLSearchParams()
          if (v !== 'info') next.set('tab', v)
          setParams(next, { replace: true })
        }}
      />
      {tab === 'info' && (
        <div className="space-y-5">
          {params.get('setup') === 'teams' && <TeamSetup />}
          <div className="grid gap-5 lg:grid-cols-2">
            <ProfileCard />
            <NicknameForm />
          </div>
          <ProfileEditForm />
          <PasswordForm />
          <WithdrawForm />
        </div>
      )}
      {tab === 'posts' && <MyPosts />}
      {tab === 'bookmarks' && <MyBookmarks />}
      {tab === 'predictions' && <MyPredictions />}
      {tab === 'following' && <MyFollowing />}
      {tab === 'mutes' && <MuteManageList />}
    </div>
  )
}

function ProfileCard() {
  const { user } = useAuth()
  const mine = useApi<Team[]>(user ? '/me/teams' : null)
  if (!user) return null
  const primary = mine.data?.find((team) => team.isPrimary) ?? mine.data?.[0] ?? null
  return (
    <Card title="프로필">
      <div className="flex items-center gap-4 p-5">
        <Avatar name={user.nickname} uploadId={user.avatarUploadId} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold">
            {user.nickname} <RolePill role={user.role} />
            {primary && <TeamBadge team={primary} />}
          </p>
          <p className="text-xs text-dim">{user.username}</p>
          {user.bio ? <p className="mt-1.5 text-sm text-fg/90">{user.bio}</p> : null}
          <Link to={profilePath(user.nickname)} className="mt-1.5 inline-block text-xs font-semibold text-accent hover:text-accent-strong">
            공개 프로필 보기 →
          </Link>
        </div>
      </div>
      <dl className="space-y-2 border-t border-edge-soft px-5 py-4 text-sm">
        <div className="flex gap-3">
          <dt className="w-24 text-dim">가입일</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-24 text-dim">최근 닉네임 변경</dt>
          <dd>{user.nicknameChangedAt ? formatDate(user.nicknameChangedAt) : '없음'}</dd>
        </div>
      </dl>
    </Card>
  )
}

function TeamSetup() {
  const navigate = useNavigate()
  return (
    <Card title="응원팀을 고르면 홈이 맞춰집니다">
      <div className="space-y-3 p-5">
        <p className="text-sm text-dim">관심 종목과 응원팀은 나중에 내 정보에서 바꿀 수 있습니다. 지금은 건너뛰어도 됩니다.</p>
        <TeamForm />
        <button type="button" className={btnSecondary} onClick={() => navigate('/me', { replace: true })}>
          건너뛰기
        </button>
      </div>
    </Card>
  )
}

function ProfileEditForm() {
  const { user, refresh } = useAuth()
  const [bio, setBio] = useState(user?.bio ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  if (!user) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (bio.length > 160) return setError('자기소개는 160자까지 쓸 수 있습니다.')
    setSending(true)
    setError(null)
    setDone(null)
    try {
      await apiFetch<MeProfile>('/me/profile', { method: 'PATCH', body: { bio } })
      await refresh()
      setDone('자기소개를 저장했습니다.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const onAvatar = async (file: File) => {
    const message = imageLimitMessage(file, 0)
    if (message) return setError(message)
    setAvatarBusy(true)
    setError(null)
    try {
      await apiUpload<UploadFile>('/uploads?kind=avatar', file)
      await refresh()
      setDone('프로필 이미지를 바꿨습니다.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setAvatarBusy(false)
    }
  }

  return (
    <Card title="프로필 수정">
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <Field label="프로필 이미지" hint="JPEG, PNG, WebP, GIF · 5MB까지">
          <div className="flex items-center gap-3">
            <Avatar name={user.nickname} uploadId={user.avatarUploadId} size="lg" />
            <label className={`${btnSecondary} cursor-pointer`}>
              {avatarBusy ? '올리는 중...' : '이미지 선택'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={avatarBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onAvatar(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </Field>
        <Field label="자기소개" hint={`${bio.length}/160`}>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} className={textareaCls} />
        </Field>
        <FormError message={error} />
        <FormSuccess message={done} />
        <button type="submit" disabled={sending} className={btnPrimary}>
          {sending ? '저장 중...' : '자기소개 저장'}
        </button>
      </form>
      <div className="border-t border-edge-soft p-5">
        <p className="mb-3 text-sm font-semibold">응원팀</p>
        <TeamForm />
      </div>
    </Card>
  )
}

function TeamForm() {
  const { refresh } = useAuth()
  const all = useApi<Team[]>('/teams')
  const mine = useApi<Team[]>('/me/teams')
  const [selected, setSelected] = useState<number[]>([])
  const [primary, setPrimary] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!mine.data || ready) return
    setSelected(mine.data.map((team) => team.id))
    setPrimary(mine.data.find((team) => team.isPrimary)?.id ?? mine.data[0]?.id ?? null)
    setReady(true)
  }, [mine.data, ready])

  const onSave = async () => {
    setSending(true)
    setError(null)
    setDone(null)
    try {
      await apiFetch<MeProfile>('/me/profile', { method: 'PATCH', body: { teamIds: selected, primaryTeamId: primary } })
      await refresh()
      mine.reload()
      setDone(selected.length === 0 ? '응원팀을 비웠습니다.' : '응원팀을 저장했습니다.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  if (all.loading || mine.loading) return <p className="text-xs text-dim">팀 목록을 불러오는 중...</p>
  if (all.error || mine.error) return <p className="text-xs text-danger">{all.error ?? mine.error}</p>
  if (!all.data || all.data.length === 0) return <p className="text-xs text-dim">등록된 팀이 없습니다.</p>

  return (
    <div className="space-y-3">
      <TeamPicker teams={all.data} selectedIds={selected} primaryId={primary} onChange={(ids, nextPrimary) => {
        setSelected(ids)
        setPrimary(nextPrimary)
      }} />
      <FormError message={error} />
      <FormSuccess message={done} />
      <button type="button" disabled={sending} onClick={() => void onSave()} className={btnPrimary}>
        {sending ? '저장 중...' : '응원팀 저장'}
      </button>
    </div>
  )
}

function NicknameForm() {
  const { user, refresh } = useAuth()
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  if (!user) return null

  const lockDays = nicknameLockDays(user.nicknameChangedAt)
  const locked = lockDays > 0

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setDone(null)
    const next = nickname.trim()
    if (next.length < 2 || next.length > 12) return setError('닉네임은 2~12자로 입력해 주세요.')
    if (next === user.nickname) return setError('지금과 같은 닉네임입니다.')
    setSending(true)
    setError(null)
    try {
      await apiFetch('/auth/me/nickname', { method: 'PATCH', body: { nickname: next } })
      await refresh()
      setDone('닉네임을 바꿨습니다. 다음 변경은 30일 뒤입니다.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Card title="닉네임 변경">
      <form onSubmit={onSubmit} className="space-y-3 p-5" noValidate>
        <Field
          label="닉네임"
          hint={locked ? `닉네임은 ${lockDays}일 뒤에 바꿀 수 있습니다.` : '2~12자. 30일에 한 번 바꿀 수 있습니다.'}
        >
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
            disabled={locked}
            autoComplete="nickname"
            className={inputCls}
          />
        </Field>
        <FormError message={error} />
        <FormSuccess message={done} />
        <div className="flex justify-end">
          <button type="submit" disabled={sending || locked} className={btnPrimary}>
            {sending ? '변경 중...' : '닉네임 변경'}
          </button>
        </div>
      </form>
    </Card>
  )
}

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setDone(null)
    if (!current) return setError('현재 비밀번호를 입력해 주세요.')
    if (next.length < 8 || next.length > 64) return setError('새 비밀번호는 8~64자로 입력해 주세요.')
    if (next !== confirm) return setError('새 비밀번호가 서로 다릅니다.')
    setSending(true)
    setError(null)
    try {
      await apiFetch<void>('/auth/me/password', { method: 'PATCH', body: { currentPassword: current, newPassword: next } })
      setCurrent('')
      setNext('')
      setConfirm('')
      setDone('비밀번호를 바꿨습니다.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Card title="비밀번호 변경">
      <form onSubmit={onSubmit} className="space-y-3 p-5" noValidate>
        <Field label="현재 비밀번호">
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={inputCls} />
        </Field>
        <Field label="새 비밀번호" hint="8~64자">
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className={inputCls} />
        </Field>
        <Field label="새 비밀번호 확인">
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputCls} />
        </Field>
        <FormError message={error} />
        <FormSuccess message={done} />
        <div className="flex justify-end">
          <button type="submit" disabled={sending} className={btnPrimary}>
            {sending ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      </form>
    </Card>
  )
}

function WithdrawForm() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  if (!user) return null
  if (user.role === 'admin') {
    return (
      <section className={`${cardCls} border-danger/30 p-5`}>
        <h2 className="font-bold text-danger">회원 탈퇴</h2>
        <p className="mt-2 text-sm text-dim">관리자 계정은 탈퇴할 수 없습니다.</p>
      </section>
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password) return setError('비밀번호를 입력해 주세요.')
    if (!agreed) return setError('탈퇴 안내에 동의해 주세요.')
    if (!window.confirm('정말 탈퇴할까요? 이 작업은 되돌릴 수 없습니다.')) return
    setSending(true)
    setError(null)
    try {
      await apiFetch<void>('/auth/me', { method: 'DELETE', body: { password } })
      await logout()
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setSending(false)
    }
  }

  return (
    <section className={`${cardCls} border-danger/30`}>
      <div className="border-b border-edge-soft px-4 py-3">
        <h2 className="font-bold text-danger">회원 탈퇴</h2>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 p-5" noValidate>
        <p className="text-sm text-dim">탈퇴하면 계정은 복구할 수 없으며, 작성한 글과 댓글은 남습니다.</p>
        <Field label="비밀번호 확인">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={inputCls} />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
          <span>위 내용을 확인했고 탈퇴에 동의합니다.</span>
        </label>
        <FormError message={error} />
        <div className="flex justify-end">
          <button type="submit" disabled={sending} className={btnDanger}>
            {sending ? '탈퇴 중...' : '탈퇴하기'}
          </button>
        </div>
      </form>
    </section>
  )
}

function MyPosts() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'all')
  const { data, loading, error, reload } = useApi<Paged<PostSummary>>(
    `/me/posts${buildQuery({ ...dateFilterQuery(appliedDates), page: qs.page, pageSize: qs.pageSize })}`,
  )
  const apply = (dates = draft) => qs.update({ ...serializeDateFilter(dates) })
  const reset = () => {
    const dates = { ...emptyDateFilter(), range: 'all' as const }
    setDraft(dates)
    qs.update({ ...serializeDateFilter(dates) }, { replace: true })
  }
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates)))]

  return (
    <section>
      <h2 className="mb-3 font-bold">내가 쓴 글</h2>
      <ListFilterBar
        dateLabel="작성일 기준"
        searchPlaceholder="제목 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        chips={chips}
        summary={<p className="text-xs text-dim">{resultCountText(data?.total ?? 0, qs.page, qs.pageSize, '건')}</p>}
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconFile size={20} />}
          title="선택한 작성일 기간과 검색어에 맞는 글이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates))} onReset={reset} />}
        />
      ) : (
        <>
          <PostTable posts={data.items} showCategory showStatus />
          <Pagination
            page={qs.page}
            pageSize={qs.pageSize}
            total={data.total}
            onPage={(p) => qs.update({ page: p }, true)}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}
    </section>
  )
}

function MyBookmarks() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'all')
  const { data, loading, error, reload } = useApi<Paged<PostSummary>>(
    `/me/bookmarks${buildQuery({ ...dateFilterQuery(appliedDates), page: qs.page, pageSize: qs.pageSize })}`,
  )
  const apply = (dates = draft) => qs.update({ ...serializeDateFilter(dates) })
  const reset = () => {
    const dates = { ...emptyDateFilter(), range: 'all' as const }
    setDraft(dates)
    qs.update({ ...serializeDateFilter(dates) }, { replace: true })
  }
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates)))]

  return (
    <section>
      <h2 className="mb-3 font-bold">스크랩</h2>
      <ListFilterBar
        dateLabel="작성일 기준"
        searchPlaceholder="제목 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        chips={chips}
        summary={<p className="text-xs text-dim">{resultCountText(data?.total ?? 0, qs.page, qs.pageSize, '건')}</p>}
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconBookmark size={20} />}
          title="선택한 작성일 기간과 검색어에 맞는 스크랩이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates))} onReset={reset} />}
        />
      ) : (
        <>
          <PostTable posts={data.items} showCategory />
          <Pagination
            page={qs.page}
            pageSize={qs.pageSize}
            total={data.total}
            onPage={(p) => qs.update({ page: p }, true)}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}
    </section>
  )
}

function MyPredictions() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'all')
  const { data, loading, error, reload } = useApi<MyPredictionList>(
    `/me/predictions${buildQuery({ ...dateFilterQuery(appliedDates), page: qs.page, pageSize: qs.pageSize })}`,
  )
  const apply = (dates = draft) => qs.update({ ...serializeDateFilter(dates) })
  const reset = () => {
    const dates = { ...emptyDateFilter(), range: 'all' as const }
    setDraft(dates)
    qs.update({ ...serializeDateFilter(dates) }, { replace: true })
  }
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates)))]

  return (
    <section className="space-y-4">
      <h2 className="font-bold">내 예측</h2>
      <ListFilterBar
        dateLabel="경기일 기준"
        searchPlaceholder="팀 이름 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        chips={chips}
        summary={<p className="text-xs text-dim">{resultCountText(data?.total ?? 0, qs.page, qs.pageSize, '건')}</p>}
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconTarget size={20} />}
          title="선택한 경기일 기간과 검색어에 맞는 예측이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates))} onReset={reset} />}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="전체 예측" value={formatNumber(data.summary.total)} />
            <SummaryCard label="판정 완료" value={formatNumber(data.summary.decided)} />
            <SummaryCard label="적중" value={formatNumber(data.summary.hits)} />
            <SummaryCard label="적중률" value={hitRateText(data.summary.rate, data.summary.decided)} />
          </div>
          <ul className={`${cardCls} overflow-hidden`}>
            {data.items.map((item) => (
              <li key={item.match.id} className="border-b border-edge-soft last:border-b-0">
                <Link to={`/matches/${item.match.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-card-hover">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {item.match.homeTeam} <span className="text-muted">{scoreText(item.match)}</span> {item.match.awayTeam}
                    </span>
                    <span className="mt-0.5 block text-xs text-dim">
                      {item.match.leagueName} · {formatDateTime(item.match.kickoffAt)}
                    </span>
                  </span>
                  <MatchStatusPill status={item.match.status} />
                  <span className="text-sm">
                    예측 <span className="font-semibold">{PICK_LABELS[item.pick]}</span>
                  </span>
                  <Pill tone={item.result === 'hit' ? 'green' : item.result === 'miss' ? 'red' : 'gray'}>
                    {PREDICTION_RESULT_LABELS[item.result]}
                  </Pill>
                </Link>
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
    </section>
  )
}

function MyFollowing() {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">팔로잉</h2>
        <Link to="/following" className="text-xs font-semibold text-accent hover:text-accent-strong">
          팔로우한 글 보기 →
        </Link>
      </div>
      <SocialUserList
        path="/me/following"
        emptyTitle="아직 팔로우한 회원이 없습니다"
        emptyDescription="공개 프로필에서 팔로우하면 그 사람의 새 글 알림과 모아 보기를 쓸 수 있습니다."
      />
      <div>
        <h2 className="mb-3 font-bold">팔로워</h2>
        <SocialUserList
          path="/me/followers"
          emptyTitle="아직 팔로워가 없습니다"
          emptyDescription="다른 회원이 나를 팔로우하면 여기에 보입니다."
        />
      </div>
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${cardCls} px-4 py-3`}>
      <p className="text-xs text-dim">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
