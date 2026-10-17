import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
  IconBall,
  IconChat,
  IconClock,
  IconFile,
  IconHeadset,
  IconLive,
  IconUserPlus,
  IconUsers,
} from '../../components/icons'
import { Card, ContentStatusPill, ErrorBox, InquiryStatusPill, Loading, UserStatusPill } from '../../components/ui'
import { useApi } from '../../lib/api'
import { formatNumber, formatShort, todayKst } from '../../lib/format'
import { linkAccent } from '../../lib/styles'
import type { Dashboard } from '../../lib/types'

type StatTone = 'default' | 'live' | 'gold'

function StatCard({ to, icon, label, value, unit, tone = 'default' }: { to: string; icon: ReactNode; label: string; value: number; unit: string; tone?: StatTone }) {
  const tile =
    tone === 'live' ? 'bg-danger-soft text-danger' : tone === 'gold' ? 'bg-gold-soft text-gold' : 'bg-accent-soft text-accent'
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-edge bg-card px-4 py-4 transition-colors hover:bg-card-hover">
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tile}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-dim">{label}</span>
        <span className="block text-lg font-bold tabular-nums">
          {formatNumber(value)}
          <span className="ml-0.5 text-sm">{unit}</span>
        </span>
      </span>
    </Link>
  )
}

export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useApi<Dashboard>('/admin/dashboard')

  if (loading) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? '대시보드를 불러오지 못했습니다.'} onRetry={reload} />

  const today = todayKst()
  const more = (to: string) => (
    <Link to={to} className={linkAccent}>
      자세히 보기 →
    </Link>
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard to="/admin/users" icon={<IconUsers />} label="총 회원" value={data.users.total} unit="명" />
        <StatCard to="/admin/users" icon={<IconUserPlus />} label="오늘 가입" value={data.users.todaySignups} unit="명" />
        <StatCard to="/admin/posts?status=all" icon={<IconFile />} label="오늘 글" value={data.posts.today} unit="건" />
        <StatCard to="/admin/posts?tab=comments&status=all" icon={<IconChat />} label="오늘 댓글" value={data.comments.today} unit="건" />
        <StatCard to="/admin/posts?status=pending" icon={<IconClock />} label="승인 대기 글" value={data.posts.pending} unit="건" tone={data.posts.pending > 0 ? 'gold' : 'default'} />
        <StatCard to="/admin/inquiries" icon={<IconHeadset />} label="미답변 문의" value={data.inquiries.waiting} unit="건" tone={data.inquiries.waiting > 0 ? 'gold' : 'default'} />
        <StatCard to={`/admin/matches?from=${today}&to=${today}`} icon={<IconBall />} label="오늘 경기" value={data.matches.today} unit="건" />
        <StatCard to={`/admin/matches?status=live`} icon={<IconLive />} label="라이브 경기" value={data.matches.live} unit="건" tone="live" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="최근 글" action={more('/admin/posts?status=all')}>
          {data.recentPosts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-dim">최근 글이 없습니다.</p>
          ) : (
            data.recentPosts.map((post) => (
              <Link
                key={post.id}
                to={`/posts/${post.id}`}
                className="flex items-center gap-3 border-b border-edge-soft px-4 py-2.5 last:border-b-0 hover:bg-card-hover"
              >
                <span className="w-10 shrink-0 text-muted">#{post.id}</span>
                <span className="min-w-0 flex-1 truncate">{post.title}</span>
                <span className="hidden shrink-0 text-xs text-dim sm:inline">{post.author.nickname}</span>
                <ContentStatusPill status={post.status} />
                <span className="shrink-0 text-xs text-muted tabular-nums">{formatShort(post.createdAt)}</span>
              </Link>
            ))
          )}
        </Card>
        <Card title="최근 문의" action={more('/admin/inquiries')}>
          {data.recentInquiries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-dim">최근 문의가 없습니다.</p>
          ) : (
            data.recentInquiries.map((inq) => (
              <Link
                key={inq.id}
                to={`/admin/inquiries?id=${inq.id}`}
                className="flex items-center gap-3 border-b border-edge-soft px-4 py-2.5 last:border-b-0 hover:bg-card-hover"
              >
                <span className="w-10 shrink-0 text-muted">#{inq.id}</span>
                <span className="min-w-0 flex-1 truncate">{inq.title}</span>
                <span className="hidden shrink-0 text-xs text-dim sm:inline">{inq.user.nickname}</span>
                <InquiryStatusPill status={inq.status} />
                <span className="shrink-0 text-xs text-muted tabular-nums">{formatShort(inq.createdAt)}</span>
              </Link>
            ))
          )}
        </Card>
        <Card title="최근 가입 회원" action={more('/admin/users')} className="xl:col-span-2">
          {data.recentUsers.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-dim">최근 가입 회원이 없습니다.</p>
          ) : (
            data.recentUsers.map((u) => (
              <Link
                key={u.id}
                to={`/admin/users?open=${u.id}`}
                className="flex items-center gap-3 border-b border-edge-soft px-4 py-2.5 last:border-b-0 hover:bg-card-hover"
              >
                <span className="w-10 shrink-0 text-muted">#{u.id}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{u.nickname}</span>
                  <span className="text-dim">({u.username})</span>
                </span>
                <UserStatusPill status={u.status} />
                <span className="shrink-0 text-xs text-muted tabular-nums">{formatShort(u.createdAt)}</span>
              </Link>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
