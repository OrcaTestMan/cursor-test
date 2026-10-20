import { useState } from 'react'
import { Link } from 'react-router'
import { apiFetch, errorMessage, useApi } from '../lib/api'
import { profilePath } from '../lib/boards'
import { useAuth } from '../lib/auth'
import { formatShort } from '../lib/format'
import { btnPrimary, btnSecondary, btnSmSecondary } from '../lib/styles'
import type { Paged, SocialUser } from '../lib/types'
import { Avatar, EmptyState, ErrorBox, Loading, Pagination } from './ui'
import { IconUser } from './icons'

export function FollowMuteButtons({
  nickname,
  followed,
  muted,
  isSelf,
  onChanged,
}: {
  nickname: string
  followed: boolean
  muted: boolean
  isSelf: boolean
  onChanged?: () => void
}) {
  const { user } = useAuth()
  const [busy, setBusy] = useState<'follow' | 'mute' | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!user || isSelf) return null

  const run = async (kind: 'follow' | 'mute', method: 'POST' | 'DELETE') => {
    setBusy(kind)
    setError(null)
    try {
      await apiFetch(`/profiles/${encodeURIComponent(nickname)}/${kind}`, { method })
      onChanged?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run('follow', followed ? 'DELETE' : 'POST')}
          className={followed ? btnSecondary : btnPrimary}
        >
          {busy === 'follow' ? '처리 중...' : followed ? '팔로우 취소' : '팔로우'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run('mute', muted ? 'DELETE' : 'POST')}
          className={btnSecondary}
        >
          {busy === 'mute' ? '처리 중...' : muted ? '숨김 해제' : '숨기기'}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export function SocialUserList({
  path,
  emptyTitle,
  emptyDescription,
}: {
  path: string
  emptyTitle: string
  emptyDescription: string
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { data, loading, error, reload } = useApi<Paged<SocialUser>>(
    `${path}${path.includes('?') ? '&' : '?'}page=${page}&pageSize=${pageSize}`,
  )

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data || data.items.length === 0) {
    return <EmptyState icon={<IconUser size={20} />} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <>
      <ul className="divide-y divide-edge-soft overflow-hidden rounded-xl border border-edge bg-card">
        {data.items.map((item) => (
          <li key={item.id}>
            <Link to={profilePath(item.nickname)} className="flex items-center gap-3 px-4 py-3 hover:bg-card-hover">
              <Avatar name={item.nickname} uploadId={item.avatarUploadId} size="sm" />
              <span className="min-w-0 flex-1 truncate font-semibold">{item.nickname}</span>
              <span className="text-xs text-muted">{formatShort(item.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
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
  )
}

export function MuteManageList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const { data, loading, error, reload } = useApi<Paged<SocialUser>>(
    `/me/mutes?page=${page}&pageSize=${pageSize}`,
  )

  const unmute = async (nickname: string, id: number) => {
    setBusyId(id)
    setActionError(null)
    try {
      await apiFetch(`/profiles/${encodeURIComponent(nickname)}/mute`, { method: 'DELETE' })
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={<IconUser size={20} />}
        title="숨긴 회원이 없습니다"
        description="프로필이나 글에서 회원을 숨기면 그 사람의 글과 응원방 메시지가 목록에서 빠집니다. 운영자 계정 차단과는 다릅니다."
      />
    )
  }

  return (
    <div className="space-y-3">
      {actionError && <p className="text-sm text-danger">{actionError}</p>}
      <ul className="divide-y divide-edge-soft overflow-hidden rounded-xl border border-edge bg-card">
        {data.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={item.nickname} uploadId={item.avatarUploadId} size="sm" />
            <Link to={profilePath(item.nickname)} className="min-w-0 flex-1 truncate font-semibold hover:text-accent">
              {item.nickname}
            </Link>
            <button
              type="button"
              disabled={busyId === item.id}
              onClick={() => void unmute(item.nickname, item.id)}
              className={btnSmSecondary}
            >
              {busyId === item.id ? '처리 중...' : '숨김 해제'}
            </button>
          </li>
        ))}
      </ul>
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
    </div>
  )
}
