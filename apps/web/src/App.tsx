import { useEffect } from 'react'
import { useLocation } from 'react-router'

const pages: Record<string, string> = {
  '/': '/nex/dashboard.html',
  '/admin': '/nex/dashboard.html',
  '/admin/finance': '/nex/finance.html',
  '/admin/risk': '/nex/risk.html',
  '/admin/review': '/nex/review.html',
  '/admin/matches': '/nex/matches.html',
  '/admin/bets': '/nex/bets.html',
  '/admin/cash': '/nex/cash.html',
  '/admin/inquiries': '/nex/inquiries.html',
  '/admin/board-moderation': '/nex/board.html',
  '/admin/users': '/nex/users.html',
  '/admin/blacklist': '/nex/blacklist.html',
  '/admin/dist': '/nex/dist.html',
  '/admin/transactions': '/nex/transactions.html',
  '/admin/points': '/nex/points.html',
  '/admin/casino': '/nex/casino.html',
  '/admin/casino-points': '/nex/casino-points.html',
  '/admin/logs': '/nex/logs.html',
  '/admin/settle-audit': '/nex/settle-audit.html',
  '/admin/wallet': '/nex/wallet.html',
  '/admin/banners': '/nex/banners.html',
  '/admin/settings': '/nex/settings.html',
  '/support': '/nex/support.html',
  '/live': '/nex/live.html',
  '/my-bets': '/nex/my-bets.html',
  '/account': '/nex/account.html',
  '/cash': '/nex/user-cash.html',
  '/messages': '/nex/messages.html',
  '/all': '/nex/all.html',
}

export default function App() {
  const location = useLocation()
  useEffect(() => {
    const path = location.pathname.length > 1 ? location.pathname.replace(/\/$/, '') : location.pathname
    const query = path === '/casino' ? location.search : ''
    const casino =
      query === '?cat=live'
        ? '/nex/casino-live.html'
        : query === '?cat=mini'
          ? '/nex/casino-mini.html'
          : query === '?cat=slots'
            ? '/nex/casino-slots.html'
            : ''
    const board = path.startsWith('/board/') ? `/nex/board-${path.slice('/board/'.length)}.html` : ''
    const target = casino || board || pages[path] || '/nex/dashboard.html'
    window.location.replace(target)
  }, [location])
  return null
}
