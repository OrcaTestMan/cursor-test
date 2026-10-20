import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAdminTitle, type AdminOutletContext } from '../lib/admin'
import { useScrollMemory } from '../lib/scroll'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSettings } from '../lib/settings'
import type { Dashboard } from '../lib/types'
import {
  IconBan,
  IconBall,
  IconClose,
  IconDashboard,
  IconExternal,
  IconFile,
  IconHeadset,
  IconLogout,
  IconMail,
  IconMenu,
  IconSend,
  IconSettings,
  IconTrophy,
  IconUsers,
} from './icons'
import { IconFilterWord, IconFlag, IconHistory } from './admin/AdminUi'
import { Avatar, CountBadge, ScrollTop } from './ui'

type BadgeKey = 'posts' | 'inquiries' | 'reports'
type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean; badge?: BadgeKey }
type NavGroup = { items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  { items: [{ to: '/admin', label: '대시보드', icon: <IconDashboard size={17} />, end: true }] },
  {
    items: [
      { to: '/admin/matches', label: '경기 관리', icon: <IconBall size={17} /> },
      { to: '/admin/leagues', label: '리그 관리', icon: <IconTrophy size={17} /> },
      { to: '/admin/teams', label: '팀 관리', icon: <IconTrophy size={17} /> },
    ],
  },
  {
    items: [
      { to: '/admin/inquiries', label: '1:1 문의 관리', icon: <IconHeadset size={17} />, badge: 'inquiries' },
      { to: '/admin/posts', label: '회원게시글 관리', icon: <IconFile size={17} />, badge: 'posts' },
      { to: '/admin/reports', label: '신고 처리', icon: <IconFlag size={17} />, badge: 'reports' },
    ],
  },
  {
    items: [
      { to: '/admin/users', label: '회원 관리', icon: <IconUsers size={17} /> },
      { to: '/admin/blacklist', label: '블랙리스트', icon: <IconBan size={17} /> },
    ],
  },
  {
    items: [
      { to: '/admin/messages', label: '쪽지 발송', icon: <IconSend size={17} /> },
      { to: '/admin/settings', label: '설정', icon: <IconSettings size={17} /> },
      { to: '/admin/words', label: '금칙어', icon: <IconFilterWord size={17} /> },
      { to: '/admin/logs', label: '관리 이력', icon: <IconHistory size={17} /> },
    ],
  },
]

const PAGE_TITLES: [string, string][] = [
  ['/admin/matches', '경기 관리'],
  ['/admin/leagues', '리그 관리'],
  ['/admin/teams', '팀 관리'],
  ['/admin/posts', '회원게시글 관리'],
  ['/admin/reports', '신고 처리'],
  ['/admin/inquiries', '1:1 문의 관리'],
  ['/admin/users', '회원 관리'],
  ['/admin/blacklist', '블랙리스트'],
  ['/admin/messages', '쪽지 발송'],
  ['/admin/settings', '설정'],
  ['/admin/words', '금칙어'],
  ['/admin/logs', '관리 이력'],
]

function pageTitle(pathname: string): string {
  return PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? '대시보드'
}

const itemCls = 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors'

function AdminSidebar({
  counts,
  onNavigate,
}: {
  counts: Record<BadgeKey, number>
  onNavigate?: () => void
}) {
  const { settings } = useSettings()
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-edge-soft px-4">
        <Link to="/admin" onClick={onNavigate} className="flex min-w-0 items-center gap-2">
          <span className="truncate text-lg font-black tracking-tight text-fg">{settings.siteName}</span>
          <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-black tracking-widest text-accent">ADMIN</span>
        </Link>
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.items[0].to}>
            {i > 0 && <div className="mx-2 my-2 h-px bg-edge-soft" />}
            {group.items.map((item) => {
              const badge = item.badge ? counts[item.badge] : 0
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `${itemCls} ${isActive ? 'bg-accent-soft text-accent' : 'text-dim hover:bg-card hover:text-fg'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? 'text-accent' : 'text-muted'}>{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <CountBadge count={badge} tone={item.badge === 'reports' ? 'red' : 'gold'} />
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="shrink-0 space-y-0.5 border-t border-edge-soft px-2.5 py-3">
        <Link to="/" target="_blank" rel="noopener" className={`${itemCls} text-dim hover:bg-card hover:text-fg`}>
          <IconExternal size={16} className="text-muted" />
          회원 사이트 보기
        </Link>
        <button
          type="button"
          onClick={() => void logout().then(() => navigate('/admin/login'))}
          className={`${itemCls} group w-full text-dim hover:bg-card hover:text-danger`}
        >
          <IconLogout size={16} className="text-muted group-hover:text-danger" />
          로그아웃
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  const dashboard = useApi<Dashboard>('/admin/dashboard', location.pathname)
  const counts: Record<BadgeKey, number> = {
    posts: dashboard.data ? dashboard.data.posts.pending + dashboard.data.comments.pending : 0,
    inquiries: dashboard.data?.inquiries.waiting ?? 0,
    reports: dashboard.data?.reports?.pending ?? 0,
  }
  const context: AdminOutletContext = { refreshCounts: dashboard.reload }
  const title = pageTitle(location.pathname)
  useAdminTitle(title)
  useScrollMemory()

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-edge bg-panel lg:block">
        <AdminSidebar counts={counts} />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="메뉴 닫기" className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-56 border-r border-edge bg-panel">
            <button
              type="button"
              aria-label="메뉴 닫기"
              onClick={() => setDrawer(false)}
              className="absolute top-3.5 right-3 rounded-lg p-1 text-dim hover:bg-card-hover hover:text-fg"
            >
              <IconClose size={18} />
            </button>
            <AdminSidebar counts={counts} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-edge bg-panel/80 px-4 backdrop-blur lg:px-5">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="메뉴 열기"
              className="rounded-lg p-1.5 text-dim hover:bg-card hover:text-fg lg:hidden"
            >
              <IconMenu size={20} />
            </button>
            <span className="shrink-0 font-bold text-muted">운영 콘솔</span>
            <span className="text-muted">/</span>
            <span className="truncate font-black text-fg">{title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              to="/admin/messages"
              aria-label="쪽지 발송"
              title="쪽지 발송"
              className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card hover:text-fg"
            >
              <IconMail size={18} />
            </Link>
            {user && (
              <>
                <Avatar name={user.nickname} size="sm" />
                <span className="hidden max-w-40 truncate text-[13px] font-bold text-dim sm:inline">
                  {user.nickname}
                  <span className="font-normal text-muted">({user.username})</span>
                </span>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-5">
          <Outlet context={context} />
        </main>
      </div>
      <ScrollTop />
    </div>
  )
}
