import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { buildQuery, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatShort, todayKst } from '../lib/format'
import { useSettings } from '../lib/settings'
import { btnPrimary, btnSecondary, linkAccent } from '../lib/styles'
import type { Match, Paged, PostSummary } from '../lib/types'
import {
  IconBall,
  IconChat,
  IconChevronDown,
  IconClose,
  IconDashboard,
  IconGrid,
  IconHeadset,
  IconHome,
  IconLive,
  IconLogout,
  IconMail,
  IconMegaphone,
  IconMenu,
  IconUser,
} from './icons'
import { MiniMatchRow } from './matches'
import { Avatar, CountBadge, Loading } from './ui'

type SideItem = { to: string; label: string; icon: ReactNode; end?: boolean }

const SIDE_SECTIONS: { title: string; items: SideItem[] }[] = [
  {
    title: '스포츠',
    items: [
      { to: '/', label: '홈', icon: <IconHome />, end: true },
      { to: '/live', label: '라이브', icon: <IconLive /> },
      { to: '/matches', label: '전체 경기', icon: <IconGrid /> },
    ],
  },
  {
    title: '커뮤니티',
    items: [
      { to: '/board/notice', label: '공지사항', icon: <IconMegaphone /> },
      { to: '/board/free', label: '자유게시판', icon: <IconChat /> },
      { to: '/board/match', label: '경기 이야기', icon: <IconBall /> },
    ],
  },
  {
    title: '내 계정',
    items: [
      { to: '/me', label: '내 정보', icon: <IconUser /> },
      { to: '/messages', label: '쪽지함', icon: <IconMail /> },
      { to: '/inquiries', label: '1:1 문의', icon: <IconHeadset /> },
    ],
  },
]

function Sidebar({ todayCount, onNavigate }: { todayCount: number | null; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-1 px-3 py-4">
      {SIDE_SECTIONS.map((section, i) => (
        <div key={section.title} className={i > 0 ? 'mt-2 border-t border-edge-soft pt-3' : ''}>
          <p className="mb-1 px-3 text-xs font-medium text-muted">{section.title}</p>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent-soft text-accent' : 'text-fg/90 hover:bg-card-hover'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-accent' : 'text-dim'}>{item.icon}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
      <div className="mt-auto pt-4">
        <div className="rounded-xl border border-accent/40 bg-accent-soft/40 p-4">
          <p className="text-sm font-bold text-accent">오늘의 경기 {todayCount ?? '-'}건</p>
          <p className="mt-1 text-xs text-dim">경기를 보고 이야기를 나눠 보세요.</p>
          <Link to="/matches" onClick={onNavigate} className={`mt-2 inline-block ${linkAccent}`}>
            경기 일정 보기 →
          </Link>
        </div>
      </div>
    </div>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  if (!user) return null

  const item = 'flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm text-fg hover:bg-card-hover'
  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg border border-edge bg-card pr-2 pl-1 hover:bg-card-hover"
        aria-expanded={open}
      >
        <Avatar name={user.nickname} size="sm" />
        <span className="hidden max-w-28 truncate text-sm font-semibold sm:inline">{user.nickname}</span>
        <IconChevronDown size={14} className="text-dim" />
      </button>
      {open && (
        <>
          <button type="button" aria-label="메뉴 닫기" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute top-11 right-0 z-50 w-52 rounded-xl border border-edge bg-panel p-1.5 shadow-2xl">
            <div className="border-b border-edge-soft px-3 pt-1.5 pb-2.5">
              <p className="truncate font-semibold">{user.nickname}</p>
              <p className="truncate text-xs text-dim">{user.username}</p>
            </div>
            <div className="pt-1">
              <button type="button" className={item} onClick={() => go('/me')}>
                <IconUser className="text-dim" /> 내 정보
              </button>
              <button type="button" className={item} onClick={() => go('/messages')}>
                <IconMail className="text-dim" /> 쪽지함
              </button>
              <button type="button" className={item} onClick={() => go('/inquiries')}>
                <IconHeadset className="text-dim" /> 1:1 문의
              </button>
              {user.role === 'admin' && (
                <button type="button" className={item} onClick={() => go('/admin')}>
                  <IconDashboard className="text-dim" /> 관리자 콘솔
                </button>
              )}
              <button
                type="button"
                className={`${item} text-danger`}
                onClick={() => {
                  setOpen(false)
                  void logout().then(() => navigate('/'))
                }}
              >
                <IconLogout /> 로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Header({ hasLive, onMenu }: { hasLive: boolean; onMenu: () => void }) {
  const { settings } = useSettings()
  const { user, loading, unreadCount } = useAuth()
  const location = useLocation()
  const next = encodeURIComponent(location.pathname + location.search)

  const topNav = ({ isActive }: { isActive: boolean }) =>
    `relative flex h-9 items-center rounded-lg px-3 text-sm font-semibold transition-colors ${
      isActive ? 'text-fg' : 'text-dim hover:text-fg'
    }`
  const sideLink = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-2.5 py-1.5 text-sm font-medium ${isActive ? 'text-fg' : 'text-dim hover:text-fg'}`

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-edge bg-panel/90 backdrop-blur">
      <div className="flex h-full items-center gap-3 px-4">
        <button
          type="button"
          onClick={onMenu}
          aria-label="메뉴 열기"
          className="rounded-lg p-1.5 text-dim hover:bg-card-hover hover:text-fg lg:hidden"
        >
          <IconMenu size={20} />
        </button>
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-on-accent">
            <IconBall size={18} />
          </span>
          <span className="max-w-40 truncate text-base font-bold">{settings.siteName}</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={topNav}>
            홈
          </NavLink>
          <NavLink to="/live" className={topNav}>
            라이브
            {hasLive && <span className="ml-1 size-1.5 animate-pulse rounded-full bg-danger" aria-label="진행 중인 경기 있음" />}
          </NavLink>
          <NavLink to="/matches" className={topNav}>
            경기 일정
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <nav className="mr-2 hidden items-center gap-1 xl:flex">
            <NavLink to="/board/notice" className={sideLink}>
              공지사항
            </NavLink>
            <NavLink to="/board/free" className={sideLink}>
              자유게시판
            </NavLink>
            <NavLink to="/board/match" className={sideLink}>
              경기 이야기
            </NavLink>
          </nav>
          {loading ? null : user ? (
            <>
              <Link
                to="/messages"
                aria-label={`쪽지함${unreadCount > 0 ? `, 읽지 않은 쪽지 ${unreadCount}개` : ''}`}
                className="relative grid size-9 place-items-center rounded-lg border border-edge bg-card text-dim hover:bg-card-hover hover:text-fg"
              >
                <IconMail />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5">
                    <CountBadge count={unreadCount} tone="red" />
                  </span>
                )}
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link to={`/login?next=${next}`} className={`${btnSecondary} h-8 px-3`}>
                로그인
              </Link>
              <Link to="/signup" className={`${btnPrimary} h-8 px-3`}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function RightRail({ today, todayLoading, todayError }: { today: Match[] | undefined; todayLoading: boolean; todayError?: string }) {
  const notices = useApi<Paged<PostSummary>>(`/posts${buildQuery({ category: 'notice', page: 1, pageSize: 20 })}`)
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-edge bg-card">
        <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
          <h2 className="font-bold">오늘의 경기</h2>
          <Link to="/matches" className={linkAccent}>
            전체 →
          </Link>
        </div>
        <div className="p-2">
          {todayLoading ? (
            <Loading />
          ) : todayError ? (
            <p className="px-2 py-4 text-xs text-danger">{todayError}</p>
          ) : !today || today.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-dim">오늘 예정된 경기가 없습니다.</p>
          ) : (
            today.slice(0, 6).map((m) => <MiniMatchRow key={m.id} match={m} />)
          )}
        </div>
      </section>
      <section className="rounded-xl border border-edge bg-card">
        <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
          <h2 className="font-bold">최근 공지</h2>
          <Link to="/board/notice" className={linkAccent}>
            더보기 →
          </Link>
        </div>
        <div className="p-2">
          {notices.loading ? (
            <Loading />
          ) : notices.error ? (
            <p className="px-2 py-4 text-xs text-danger">{notices.error}</p>
          ) : !notices.data || notices.data.items.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-dim">등록된 공지가 없습니다.</p>
          ) : (
            notices.data.items.slice(0, 5).map((post) => (
              <Link key={post.id} to={`/posts/${post.id}`} className="block rounded-lg px-2 py-2 hover:bg-card-hover">
                <p className="truncate text-sm">{post.title}</p>
                <p className="mt-0.5 text-xs text-muted">{formatShort(post.createdAt)}</p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default function UserLayout() {
  const { settings } = useSettings()
  const [drawer, setDrawer] = useState(false)
  const today = useApi<Match[]>(`/matches${buildQuery({ date: todayKst() })}`)
  const hasLive = today.data?.some((m) => m.status === 'live') ?? false
  const todayCount = today.data ? today.data.length : null

  return (
    <div className="min-h-screen bg-bg">
      <Header hasLive={hasLive} onMenu={() => setDrawer(true)} />
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-edge-soft bg-panel lg:block">
          <Sidebar todayCount={todayCount} />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">
          {settings.noticeBanner.trim() && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-gold/30 bg-gold-soft px-4 py-2 text-sm text-gold">
              <IconMegaphone className="shrink-0" />
              <span className="min-w-0 truncate">{settings.noticeBanner}</span>
            </div>
          )}
          <div className="flex gap-6">
            <div className="min-w-0 flex-1">
              <Outlet />
            </div>
            <aside className="hidden w-72 shrink-0 xl:block">
              <RightRail today={today.data} todayLoading={today.loading} todayError={today.error} />
            </aside>
          </div>
        </main>
      </div>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="메뉴 닫기" className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-edge-soft bg-panel">
            <div className="flex h-14 items-center justify-between border-b border-edge px-4">
              <span className="font-bold">{settings.siteName}</span>
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={() => setDrawer(false)}
                className="rounded-lg p-1.5 text-dim hover:bg-card-hover hover:text-fg"
              >
                <IconClose size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Sidebar todayCount={todayCount} onNavigate={() => setDrawer(false)} />
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}