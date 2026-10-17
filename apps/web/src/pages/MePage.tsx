import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { IconFile, IconUser } from '../components/icons'
import { PostTable } from '../components/posts'
import { Avatar, Card, EmptyState, ErrorBox, Field, FormError, FormSuccess, Loading, PageHeader, Pagination, RolePill } from '../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDate } from '../lib/format'
import { btnPrimary, inputCls } from '../lib/styles'
import type { Paged, PostSummary } from '../lib/types'

export default function MePage() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <div className="space-y-5">
      <PageHeader icon={<IconUser size={20} />} title="내 정보" subtitle="내 계정과 작성한 글을 확인합니다." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="프로필">
          <div className="flex items-center gap-4 p-5">
            <Avatar name={user.nickname} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-bold">
                {user.nickname} <RolePill role={user.role} />
              </p>
              <p className="text-xs text-dim">{user.username}</p>
            </div>
          </div>
          <dl className="space-y-2 border-t border-edge-soft px-5 py-4 text-sm">
            <div className="flex gap-3">
              <dt className="w-20 text-dim">가입일</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </Card>
        <PasswordForm />
      </div>
      <MyPosts />
    </div>
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

function MyPosts() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { data, loading, error, reload } = useApi<Paged<PostSummary>>(`/me/posts${buildQuery({ page, pageSize })}`)

  return (
    <section>
      <h2 className="mb-3 font-bold">내가 쓴 글</h2>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconFile size={20} />}
          title="아직 쓴 글이 없습니다"
          description="자유게시판에 첫 글을 남겨 보세요."
          action={
            <Link to="/write?category=free" className={btnPrimary}>
              글쓰기
            </Link>
          }
        />
      ) : (
        <>
          <PostTable posts={data.items} showCategory showStatus />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </>
      )}
    </section>
  )
}
