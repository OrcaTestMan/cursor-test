import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { IconBall, IconBan, IconChat, IconClock, IconFile, IconHeadset, IconLive, IconTarget, IconUserPlus, IconUsers } from '../../components/icons'
import { AdminUserStatusPill, IconFlag } from '../../components/admin/AdminUi'
import { ContentStatusPill, ErrorBox, InquiryStatusPill, Loading } from '../../components/ui'
import { useApi } from '../../lib/api'
import { formatNumber, formatShort } from '../../lib/format'
import type { Dashboard } from '../../lib/types'

type StatTone = 'accent' | 'muted' | 'gold' | 'live'

function StatCard({
  to,
  icon,
  label,
  value,
  unit,
  tone = 'muted',
}: {
  to: string
  icon: ReactNode
  label: string
  value: number
  unit: string
  tone?: StatTone
}) {
  const tile =
    tone === 'live'
      ? 'bg-danger-soft text-danger'
      : tone === 'gold'
        ? 'bg-gold-soft text-gold'
        : tone === 'accent'
          ? 'bg-accent-soft text-accent'
          : 'bg-card-hover text-dim'
  return (
    <Link to={to} className="block min-w-0 transition-transform hover:-translate-y-0.5">
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-edge bg-card px-4 py-3.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tile}`}>{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-bold tracking-wider text-muted uppercase">{label}</span>
          <span className="block truncate text-lg leading-tight font-black tabular-nums">
            {formatNumber(value)}
            {unit}
          </span>
        </span>
      </div>
    </Link>
  )
}

function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-edge bg-card ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-edge-soft px-4 py-3">
        <h2 className="text-sm font-bold text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function more(to: string, label: string) {
  return (
    <Link to={to} className="shrink-0 text-[11px] font-bold text-accent transition-colors hover:text-accent-strong">
      {label}
    </Link>
  )
}

const th = 'px-3 py-2.5 text-left text-[11px] font-bold tracking-wider whitespace-nowrap text-muted uppercase'
const td = 'px-3 py-2.5 align-middle whitespace-nowrap'
const tr = 'border-b border-edge-soft transition-colors last:border-b-0 hover:bg-card-hover/40'

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-8 text-center text-sm text-dim">
        {text}
      </td>
    </tr>
  )
}

export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useApi<Dashboard>('/admin/dashboard')

  if (loading) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? '대시보드를 불러오지 못했습니다.'} onRetry={reload} />

  const pendingPosts = data.posts.pending
  const waiting = data.inquiries.waiting
  const reports = data.reports?.pending ?? 0
  const live = data.matches.live

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard to="/admin/users?range=all" icon={<IconUsers size={18} />} label="총 회원" value={data.users.total} unit="명" tone="accent" />
        <StatCard to="/admin/users" icon={<IconUserPlus size={18} />} label="오늘 가입" value={data.users.todaySignups} unit="명" />
        <StatCard to="/admin/posts?range=today&status=all" icon={<IconFile size={18} />} label="오늘 글" value={data.posts.today} unit="건" />
        <StatCard to="/admin/posts?tab=comments&range=today&status=all" icon={<IconChat size={18} />} label="오늘 댓글" value={data.comments.today} unit="건" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          to="/admin/posts?range=all&status=pending"
          icon={<IconClock size={18} />}
          label="승인 대기 글"
          value={pendingPosts}
          unit="건"
          tone={pendingPosts > 0 ? 'gold' : 'muted'}
        />
        <StatCard
          to="/admin/inquiries?range=all&status=waiting"
          icon={<IconHeadset size={18} />}
          label="미답변 문의"
          value={waiting}
          unit="건"
          tone={waiting > 0 ? 'gold' : 'muted'}
        />
        <StatCard
          to="/admin/reports?range=all&status=pending"
          icon={<IconFlag size={18} />}
          label="신고 대기"
          value={reports}
          unit="건"
          tone={reports > 0 ? 'live' : 'muted'}
        />
        <StatCard
          to="/admin/matches?status=live&range=all"
          icon={<IconLive size={18} />}
          label="라이브 경기"
          value={live}
          unit="건"
          tone={live > 0 ? 'live' : 'muted'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard to="/admin/matches?range=today" icon={<IconBall size={18} />} label="오늘 경기" value={data.matches.today} unit="건" />
        <StatCard
          to="/admin/users?range=all&status=blocked"
          icon={<IconBan size={18} />}
          label="차단 회원"
          value={data.users.blocked}
          unit="명"
          tone={data.users.blocked > 0 ? 'live' : 'muted'}
        />
        <StatCard
          to="/admin/posts?tab=comments&range=all&status=pending"
          icon={<IconChat size={18} />}
          label="승인 대기 댓글"
          value={data.comments.pending}
          unit="건"
          tone={data.comments.pending > 0 ? 'gold' : 'muted'}
        />
        <StatCard to="/live" icon={<IconLive size={18} />} label="오늘 응원방" value={data.chat?.today ?? 0} unit="건" />
        <StatCard to="/search?poll=open&range=all" icon={<IconTarget size={18} />} label="진행 중 투표" value={data.polls?.open ?? 0} unit="건" />
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-1">
        <Panel title="최근 글" action={more('/admin/posts?status=all&range=all', '게시글 자세히 보기 →')}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]" style={{ minWidth: 520 }}>
              <thead>
                <tr className="border-b border-edge">
                  <th className={th}>제목</th>
                  <th className={th}>작성자</th>
                  <th className={th}>상태</th>
                  <th className={`${th} text-right`}>작성</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPosts.length === 0 ? (
                  <EmptyRow cols={4} text="최근 글이 없습니다." />
                ) : (
                  data.recentPosts.map((post) => (
                    <tr key={post.id} className={tr}>
                      <td className={`${td} max-w-64`}>
                        <Link to={`/posts/${post.id}`} className="block truncate font-bold text-fg hover:text-accent">
                          {post.title}
                        </Link>
                      </td>
                      <td className={`${td} text-dim`}>{post.author.nickname}</td>
                      <td className={td}>
                        <ContentStatusPill status={post.status} />
                      </td>
                      <td className={`${td} text-right text-muted tabular-nums`}>{formatShort(post.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel title="최근 문의" action={more('/admin/inquiries?range=all', '문의 자세히 보기 →')}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]" style={{ minWidth: 480 }}>
              <thead>
                <tr className="border-b border-edge">
                  <th className={th}>제목</th>
                  <th className={th}>작성자</th>
                  <th className={th}>상태</th>
                  <th className={`${th} text-right`}>작성</th>
                </tr>
              </thead>
              <tbody>
                {data.recentInquiries.length === 0 ? (
                  <EmptyRow cols={4} text="최근 문의가 없습니다." />
                ) : (
                  data.recentInquiries.map((inq) => (
                    <tr key={inq.id} className={tr}>
                      <td className={`${td} max-w-56`}>
                        <Link to={`/admin/inquiries?id=${inq.id}`} className="block truncate font-bold text-fg hover:text-accent">
                          {inq.title}
                        </Link>
                      </td>
                      <td className={`${td} text-dim`}>{inq.user.nickname}</td>
                      <td className={td}>
                        <InquiryStatusPill status={inq.status} />
                      </td>
                      <td className={`${td} text-right text-muted tabular-nums`}>{formatShort(inq.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="최근 가입" action={more('/admin/users?range=all', '회원 자세히 보기 →')}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]" style={{ minWidth: 420 }}>
              <thead>
                <tr className="border-b border-edge">
                  <th className={th}>회원</th>
                  <th className={th}>상태</th>
                  <th className={`${th} text-right`}>가입</th>
                </tr>
              </thead>
              <tbody>
                {data.recentUsers.length === 0 ? (
                  <EmptyRow cols={3} text="최근 가입 회원이 없습니다." />
                ) : (
                  data.recentUsers.map((u) => (
                    <tr key={u.id} className={tr}>
                      <td className={td}>
                        <Link to={`/admin/users?open=${u.id}`} className="font-bold text-fg hover:text-accent">
                          {u.nickname}
                          <span className="font-normal text-muted">({u.username})</span>
                        </Link>
                      </td>
                      <td className={td}>
                        <AdminUserStatusPill status={u.status} />
                      </td>
                      <td className={`${td} text-right text-muted tabular-nums`}>{formatShort(u.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}
