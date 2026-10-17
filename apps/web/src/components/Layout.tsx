import { Link, NavLink, Outlet } from 'react-router'

const NAV_ITEMS = [
  { to: '/', label: '홈', end: true },
  { to: '/matches', label: '경기 일정', end: false },
  { to: '/board', label: '게시판', end: false },
  { to: '/admin', label: '관리', end: false },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="text-lg font-bold text-blue-700">
            스포츠 커뮤니티
          </Link>
          <nav className="flex gap-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded px-3 py-1.5 ${isActive ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
