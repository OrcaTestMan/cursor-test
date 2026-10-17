import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import type { AdminOutletContext } from '../lib/admin'
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
import { Avatar, CountBadge } from './ui'

type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean; badge?: 'posts' | 'inquiries' }

const NAV_GROUPS: NavItem[][] = [
  [{ to: '/admin', label: '대시보드', icon: <IconDashboard />, end: true }],
  [
    { to: '/admin/matches', label: '경기 관리', icon: <IconBall /> },
    { to: '/admin/leagues', label: '리그 관리', icon: <IconTrophy /> },
  ],
  [
    { to: '/admin/posts', label: '회원게시글 관리', icon: <IconFile />, badge: 'posts' },
    { to: '/admin/inquiries', label: '1:1 문의 관리', icon: <IconHeadset />, badge: 'inquiries' },
  ],
  [
    { to: '/admin/users', label: '회원 관리', icon: <IconUsers /> },
    { to: '/admin/blacklist', label: '블랙리스트', icon: <IconBan /> },
  ],
  [
    { to: '/admin/messages', label: '쪽지 발송', icon: <IconSend /> },
    { to: '/admin/settings', label: '설정', icon: <IconSettings /> },
  ],
]

const PAGE_TITLES: [string, string][] = [
  ['/admin/matches', '경기 관리'],
  ['/admin/leagues', '리그 관리'],
  ['/admin/posts', '회원게시글 관리'],
  ['/admin/inquiries', '1:1 문의 관리'],
  ['/admin/users', '회원 관리'],
  ['/admin/blacklist', '블랙리스트'],
  ['/admin/messages', '쪽지 발송'],
  ['/admin/settings', '설정'],
]

function pageTitle(pathname: string): string {
  return PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? '대시보드'
}

function AdminSidebar({
  counts,
  onNavigate,
}: {
  counts: { posts: number; inquiries: number }
  onNavigate?: () => void
}) {
  const { settings } = useSettings()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const itemCls = 'flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors'

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 px-4">
        <Link to="/admin" onClick={onNavigate} className="truncate text-base font-bold">
          {settings.siteName}
        </Link>
        <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-accent">ADMIN</span>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group, i) => (
          <div key={group[0].to} className={i > 0 ? 'mt-2 border-t border-edge-soft pt-2' : ''}>
            {group.map((item) => {
              const badge = item.badge ? counts[item.badge] : 0
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `${itemCls} ${isActive ? 'bg-accent-soft text-accent' : 'text-fg/90 hover:bg-card-hover'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? 'text-accent' : 'text-dim'}>{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      <CountBadge count={badge} tone="gold" />
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-edge-soft px-3 py-3">
        <Link to="/" className={`${itemCls} text-fg/90 hover:bg-card-hover`}>
          <IconExternal className="text-dim" />
          사용자 사이트 보기
        </Link>
        <button
          type="button"
          onClick={() => void logout().then(() => navigate('/'))}
          className={`${itemCls} w-full text-fg/90 hover:bg-card-hover`}
        >
          <IconLogout className="text-dim" />
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
  const counts = {
    posts: dashboard.data ? dashboard.data.posts.pending + dashboard.data.comments.pending : 0,
    inquiries: dashboard.data?.inquiries.waiting ?? 0,
  }
  const context: AdminOutletContext = { refreshCounts: dashboard.reload }

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-edge-soft bg-panel lg:block">
        <AdminSidebar counts={counts} />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="메뉴 닫기" className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-edge-soft bg-panel">
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
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-edge bg-panel/90 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="메뉴 열기"
            className="rounded-lg p-1.5 text-dim hover:bg-card-hover hover:text-fg lg:hidden"
          >
            <IconMenu size={20} />
          </button>
          <p className="min-w-0 truncate text-sm">
            <span className="text-dim">운영 콘솔</span>
            <span className="px-1.5 text-muted">/</span>
            <span className="font-bold">{pageTitle(location.pathname)}</span>
          </p>
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/admin/messages"
              aria-label="쪽지 발송"
              className="grid size-9 place-items-center rounded-lg text-dim hover:bg-card-hover hover:text-fg"
            >
              <IconMail size={18} />
            </Link>
            {user && (
              <div className="flex items-center gap-2">
                <Avatar name="AD" size="sm" />
                <span className="hidden text-sm font-semibold sm:inline">
                  {user.nickname}
                  <span className="font-normal text-dim">({user.username})</span>
                </span>
              </div>
            )}
          </div>
        </header>
        <main className="px-4 py-6 lg:px-6">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  )
}
