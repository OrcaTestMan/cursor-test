import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { apiFetch, buildQuery, errorMessage, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { addDays, formatRelative, formatShort, todayKst } from '../lib/format'
import { isTypingTarget, lastWritePath, loadRecentPosts, onRecentPostsChange, type RecentPost } from '../lib/prefs'
import { useScrollMemory } from '../lib/scroll'
import { useSettings } from '../lib/settings'
import { btnGhost, btnPrimary, btnSecondary, linkAccent } from '../lib/styles'
import type { Match, Notification, NotificationList, Paged, PostSummary, Team } from '../lib/types'
import {
  IconBall,
  IconBell,
  IconChat,
  IconChevronDown,
  IconClose,
  IconFire,
  IconGrid,
  IconHeadset,
  IconHome,
  IconLive,
  IconLogout,
  IconMail,
  IconMegaphone,
  IconMenu,
  IconNews,
  IconPencil,
  IconSearch,
  IconSmile,
  IconTarget,
  IconTicket,
  IconTrophy,
  IconUser,
  IconUsers,
} from './icons'
import { MiniMatchRow } from './matches'
import { BrandMark } from './brand'
import { Avatar, CountBadge, Loading, ScrollTop } from './ui'

type SideItem = { to: string; label: string; icon: ReactNode; end?: boolean }

const SIDE_SECTIONS: { title: string; items: SideItem[] }[] = [
  {
    title: '스포츠',
    items: [
      { to: '/', label: '홈', icon: <IconHome />, end: true },
      { to: '/live', label: '라이브', icon: <IconLive /> },
      { to: '/matches', label: '전체 경기', icon: <IconGrid /> },
      { to: '/standings', label: '순위', icon: <IconTrophy /> },
      { to: '/ranking', label: '예측 랭킹', icon: <IconTarget /> },
    ],
  },
  {
    title: '커뮤니티',
    items: [
      { to: '/search', label: '검색', icon: <IconSearch /> },
      { to: '/board/notice', label: '공지사항', icon: <IconMegaphone /> },
      { to: '/best', label: '인기글', icon: <IconFire /> },
      { to: '/board/free', label: '자유게시판', icon: <IconChat /> },
      { to: '/board/match', label: '경기 이야기', icon: <IconBall /> },
      { to: '/board/review', label: '직관·후기', icon: <IconTicket /> },
      { to: '/board/humor', label: '유머', icon: <IconSmile /> },
      { to: '/board/news', label: '뉴스·소식', icon: <IconNews /> },
    ],
  },
  {
    title: '내 계정',
    items: [
      { to: '/me', label: '내 정보', icon: <IconUser /> },
      { to: '/following', label: '팔로우', icon: <IconUsers /> },
      { to: '/notifications', label: '알림', icon: <IconBell /> },
      { to: '/messages', label: '쪽지함', icon: <IconMail /> },
      { to: '/inquiries', label: '1:1 문의', icon: <IconHeadset /> },
    ],
  },
]

function MyTeams({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const teams = useApi<Team[]>(user ? '/me/teams' : null)
  if (!user || !teams.data || teams.data.length === 0) return null
  return (
    <div className="mb-2">
      <p className="mb-1 px-3 text-xs font-medium text-muted">내 응원팀</p>
      {teams.data.map((team) => (
        <NavLink
          key={team.id}
          to={`/teams/${team.id}`}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex h-9 items-center gap-2.5 rounded-full px-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-accent-soft text-accent' : 'text-fg/90 hover:bg-card-hover'
            }`
          }
        >
          {team.name}
        </NavLink>
      ))}
    </div>
  )
}

function Sidebar({ todayCount, onNavigate }: { todayCount: number | null; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-1 px-3 py-4">
      <MyTeams onNavigate={onNavigate} />
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
                `flex h-9 items-center gap-2.5 rounded-full px-3 text-sm font-medium transition-colors ${
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
        <div className="rounded-[16px] border border-accent/40 bg-accent-soft/40 p-4">
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

function NotificationBell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [tick, setTick] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const locKey = `${location.pathname}${location.search}${location.hash}`
  const list = useApi<NotificationList>('/notifications?page=1&pageSize=10', `${locKey}#${tick}`)

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const unread = list.data?.unreadCount ?? 0

  const openItem = async (item: Notification) => {
    if (item.available === false) {
      setActionError('삭제되었거나 볼 수 없는 글입니다.')
      if (!item.readAt) {
        try {
          await apiFetch<Notification>(`/notifications/${item.id}/read`, { method: 'POST' })
          list.reload()
        } catch (err) {
          setActionError(errorMessage(err))
        }
      }
      return
    }
    if (!item.readAt) {
      try {
        await apiFetch<Notification>(`/notifications/${item.id}/read`, { method: 'POST' })
        list.reload()
      } catch (err) {
        setActionError(errorMessage(err))
        return
      }
    }
    setOpen(false)
    navigate(item.link)
  }

  const onReadAll = async () => {
    setBusy(true)
    setActionError(null)
    try {
      await apiFetch<void>('/notifications/read-all', { method: 'POST' })
      list.reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`알림${unread > 0 ? `, 읽지 않은 알림 ${unread}개` : ''}`}
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-full border border-edge bg-transparent text-dim hover:bg-white/10 hover:text-fg"
      >
        <IconBell />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5">
            <CountBadge count={unread} tone="red" />
          </span>
        )}
      </button>
      {open && (
        <>
          <button type="button" aria-label="알림 닫기" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute top-12 right-0 z-50 w-80 rounded-[16px] border border-edge bg-panel shadow-2xl">
            <div className="flex items-center justify-between border-b border-edge-soft px-3 py-2.5">
              <p className="text-sm font-bold">알림</p>
              <button type="button" disabled={busy || unread === 0} onClick={() => void onReadAll()} className={btnGhost}>
                모두 읽음
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {list.loading && !list.data ? (
                <Loading />
              ) : list.error && !list.data ? (
                <p className="px-3 py-4 text-xs text-danger">{list.error}</p>
              ) : !list.data || list.data.items.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-dim">받은 알림이 없습니다.</p>
              ) : (
                list.data.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void openItem(item)}
                    className="flex w-full items-start gap-2.5 border-b border-edge-soft px-3 py-2.5 text-left last:border-b-0 hover:bg-card-hover"
                  >
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-accent'}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${item.readAt ? 'text-dim' : 'font-semibold'}`}>{item.text}</span>
                      <span className="mt-0.5 block text-xs text-muted">{formatRelative(item.createdAt)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
            {actionError && <p className="border-t border-edge-soft px-3 py-2 text-xs text-danger">{actionError}</p>}
            <div className="border-t border-edge-soft px-3 py-2">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-semibold text-accent hover:text-accent-strong"
              >
                전체 보기
              </Link>
            </div>
          </div>
        </>
      )}
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
        className="flex h-10 items-center gap-2 rounded-full border border-edge bg-transparent pr-3 pl-1 hover:bg-white/10"
        aria-expanded={open}
      >
        <Avatar name={user.nickname} uploadId={user.avatarUploadId} size="sm" />
        <span className="hidden max-w-28 truncate text-sm font-semibold sm:inline">{user.nickname}</span>
        <IconChevronDown size={14} className="text-dim" />
      </button>
      {open && (
        <>
          <button type="button" aria-label="메뉴 닫기" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute top-12 right-0 z-50 w-52 rounded-[16px] border border-edge bg-panel p-1.5 shadow-2xl">
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

const iconBtn =
  'grid size-10 place-items-center rounded-full border border-edge bg-transparent text-dim hover:bg-white/10 hover:text-fg'

function Header({ hasLive, onMenu }: { hasLive: boolean; onMenu: () => void }) {
  const { user, loading, unreadCount } = useAuth()
  const location = useLocation()
  const next = encodeURIComponent(location.pathname + location.search)

  const topNav = ({ isActive }: { isActive: boolean }) =>
    `relative flex h-[4.5rem] items-center px-3 text-[15px] font-semibold transition-colors after:absolute after:right-3 after:bottom-0 after:left-3 after:h-[2px] after:bg-accent ${
      isActive ? 'text-fg after:opacity-100' : 'text-dim after:opacity-0 hover:text-fg'
    }`

  return (
    <div className="sticky top-0 z-30">
      {user?.role === 'admin' && (
        <div className="flex h-9 items-center justify-center gap-3 border-b border-accent/30 bg-accent-soft px-4 text-xs font-semibold text-accent">
          <span>관리자 미리보기 · 여기는 회원 사이트입니다.</span>
          <Link to="/admin" className="underline hover:text-accent-strong">
            운영 콘솔로
          </Link>
        </div>
      )}
      <header className="h-[4.5rem] border-b border-white/10 bg-[#0e1116]/92 backdrop-blur">
        <div className="flex h-full items-center gap-3 px-4 lg:px-6">
          <button
            type="button"
            onClick={onMenu}
            aria-label="메뉴 열기"
            className="rounded-full p-1.5 text-dim hover:bg-white/10 hover:text-fg lg:hidden"
          >
            <IconMenu size={20} />
          </button>
          <BrandMark />
          <nav className="ml-6 hidden items-center self-stretch md:flex">
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
            <NavLink to="/board/free" className={(state) => `${topNav(state)} hidden xl:flex`}>
              게시판
            </NavLink>
            <NavLink to="/ranking" className={(state) => `${topNav(state)} hidden xl:flex`}>
              랭킹
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/search" aria-label="검색" title="검색 (/)" className={iconBtn}>
              <IconSearch />
            </Link>
            {user && !location.pathname.startsWith('/write') && (
              <Link to={lastWritePath()} aria-label="글쓰기" className={iconBtn}>
                <IconPencil />
              </Link>
            )}
            {loading ? null : user ? (
              <>
                <NotificationBell />
                <Link
                  to="/messages"
                  aria-label={`쪽지함${unreadCount > 0 ? `, 읽지 않은 쪽지 ${unreadCount}개` : ''}`}
                  className={`relative ${iconBtn}`}
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
                <Link to={`/login?next=${next}`} className={`${btnSecondary} h-10 px-4`}>
                  로그인
                </Link>
                <Link to="/signup" className={`${btnPrimary} h-10 px-4`}>
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </div>
  )
}

function RightRail({ today, todayLoading, todayError }: { today: Match[] | undefined; todayLoading: boolean; todayError?: string }) {
  const day = todayKst()
  const weekFrom = addDays(day, -6)
  const notices = useApi<Paged<PostSummary>>(`/posts${buildQuery({ category: 'notice', range: 'all', page: 1, pageSize: 20 })}`)
  const popular = useApi<Paged<PostSummary>>(`/posts${buildQuery({ sort: 'likes', range: 'custom', from: weekFrom, to: day, page: 1, pageSize: 20 })}`)
  const [recent, setRecent] = useState<RecentPost[]>(() => loadRecentPosts())
  useEffect(() => onRecentPostsChange(() => setRecent(loadRecentPosts())), [])
  return (
    <div className="space-y-4">
      <section className="rounded-[16px] border border-white/10 bg-panel">
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
      <section className="rounded-[16px] border border-white/10 bg-panel">
        <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
          <h2 className="font-bold">실시간 인기</h2>
          <Link to="/best" className={linkAccent}>
            더보기 →
          </Link>
        </div>
        <div className="p-2">
          {popular.loading ? (
            <Loading />
          ) : popular.error ? (
            <p className="px-2 py-4 text-xs text-danger">{popular.error}</p>
          ) : !popular.data || popular.data.items.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-dim">이번 주 추천 글이 없습니다.</p>
          ) : (
            popular.data.items.slice(0, 8).map((post, index) => (
              <Link key={post.id} to={`/posts/${post.id}`} className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-card-hover">
                <span className={`w-4 shrink-0 text-xs font-bold tabular-nums ${index < 3 ? 'text-accent' : 'text-muted'}`}>{index + 1}</span>
                <span className="min-w-0">
                  <p className="truncate text-sm">{post.title}</p>
                  <p className="mt-0.5 text-xs text-muted">추천 {post.likeCount}</p>
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
      <section className="rounded-[16px] border border-white/10 bg-panel">
        <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
          <h2 className="font-bold">최근 본 글</h2>
        </div>
        <div className="p-2">
          {recent.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-dim">아직 본 글이 없습니다.</p>
          ) : (
            recent.slice(0, 8).map((post) => (
              <Link key={post.id} to={`/posts/${post.id}`} className="block rounded-lg px-2 py-2 hover:bg-card-hover">
                <p className="truncate text-sm">{post.title}</p>
              </Link>
            ))
          )}
        </div>
      </section>
      <section className="rounded-[16px] border border-white/10 bg-panel">
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

function SiteFooter() {
  const { settings } = useSettings()
  return (
    <footer className="border-t border-white/10 bg-[#0a0d12] px-4 py-12 lg:px-8">
      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandMark to="/" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-dim">
            응원팀 경기와 게시판을 한곳에서 이어 가는 팬 커뮤니티입니다. 집계는 실제 기록만 사용합니다.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-accent uppercase">Explore</p>
          <nav className="mt-4 flex flex-col gap-2 text-sm text-dim">
            <Link to="/matches" className="hover:text-fg">
              경기 일정
            </Link>
            <Link to="/board/free" className="hover:text-fg">
              자유게시판
            </Link>
            <Link to="/best" className="hover:text-fg">
              인기글
            </Link>
            <Link to="/ranking" className="hover:text-fg">
              예측 랭킹
            </Link>
          </nav>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-accent uppercase">Support</p>
          <nav className="mt-4 flex flex-col gap-2 text-sm text-dim">
            <Link to="/board/notice" className="hover:text-fg">
              공지사항
            </Link>
            <Link to="/inquiries" className="hover:text-fg">
              1:1 문의
            </Link>
            <Link to="/me" className="hover:text-fg">
              내 정보
            </Link>
          </nav>
        </div>
      </div>
      <p className="mt-10 border-t border-white/8 pt-5 text-xs text-muted">
        © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
      </p>
    </footer>
  )
}

export default function UserLayout() {
  const { settings } = useSettings()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const today = useApi<Match[]>(`/matches${buildQuery({ date: todayKst() })}`)
  const hasLive = today.data?.some((m) => m.status === 'live') ?? false
  const todayCount = today.data ? today.data.length : null
  const isHome = location.pathname === '/'
  const asideCls = user?.role === 'admin'
    ? 'sticky top-[6.75rem] hidden h-[calc(100vh-6.75rem)] w-60 shrink-0 overflow-y-auto border-r border-white/8 bg-[#0e1116] lg:block'
    : 'sticky top-[4.5rem] hidden h-[calc(100vh-4.5rem)] w-60 shrink-0 overflow-y-auto border-r border-white/8 bg-[#0e1116] lg:block'
  useScrollMemory()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false)
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault()
        navigate('/search')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="min-h-screen bg-bg">
      <Header hasLive={hasLive} onMenu={() => setDrawer(true)} />
      <div className="flex">
        <aside className={asideCls}>
          <Sidebar todayCount={todayCount} />
        </aside>
        <main className={`min-w-0 flex-1 overflow-x-hidden ${isHome ? '' : 'px-4 py-6 lg:px-6'}`}>
          {settings.noticeBanner.trim() && (
            <div
              className={`flex items-center gap-2 rounded-[16px] border border-gold/30 bg-gold-soft px-4 py-2 text-sm text-gold ${
                isHome ? 'mx-4 mt-4 mb-0 lg:mx-8' : 'mb-5'
              }`}
            >
              <IconMegaphone className="shrink-0" />
              <span className="min-w-0 truncate">{settings.noticeBanner}</span>
            </div>
          )}
          <div className="flex gap-6">
            <div className="min-w-0 flex-1">
              <Outlet />
            </div>
            {!isHome && (
              <aside className="hidden w-72 shrink-0 xl:block">
                <RightRail today={today.data} todayLoading={today.loading} todayError={today.error} />
              </aside>
            )}
          </div>
        </main>
      </div>
      <SiteFooter />
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="메뉴 닫기" className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-edge-soft bg-[#0e1116]">
            <div className="flex h-[4.5rem] items-center justify-between border-b border-white/10 px-4">
              <BrandMark stacked={false} />
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={() => setDrawer(false)}
                className="rounded-full p-1.5 text-dim hover:bg-white/10 hover:text-fg"
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
      <ScrollTop />
    </div>
  )
}
