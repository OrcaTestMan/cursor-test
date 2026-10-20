import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'
import { btnPrimary, btnSecondary } from '../lib/styles'
import { IconLock } from './icons'
import { Loading } from './ui'

function useLoginRedirect(): string {
  const location = useLocation()
  return `/login?next=${encodeURIComponent(location.pathname + location.search)}`
}

export function RequireAuth() {
  const { user, loading } = useAuth()
  const loginPath = useLoginRedirect()
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <Loading text="로그인 정보를 확인하는 중..." />
      </div>
    )
  if (!user) return <Navigate to={loginPath} replace />
  return <Outlet />
}

export function RequireAdmin() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const loginPath = `/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`
  if (loading)
    return (
      <div className="min-h-screen bg-bg pt-20">
        <Loading text="로그인 정보를 확인하는 중..." />
      </div>
    )
  if (!user) return <Navigate to={loginPath} replace />
  if (user.role !== 'admin') return <ForbiddenPage />
  return <Outlet />
}

export function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="grid place-items-center px-4 pt-16">
      <div className="w-full max-w-sm rounded-xl border border-edge bg-card p-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
          <IconLock size={20} />
        </div>
        <p className="text-sm font-semibold text-danger">403</p>
        <h1 className="mt-1 text-lg font-bold">관리자만 이용할 수 있습니다.</h1>
        <p className="mt-2 text-xs text-dim">운영 콘솔은 회원 사이트와 분리되어 있습니다. 관리자 계정으로 다시 로그인해 주세요.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/" className={btnPrimary}>
            회원 사이트로
          </Link>
          <Link to="/admin/login" className={btnSecondary}>
            관리자 로그인
          </Link>
        </div>
      </div>
      </div>
    </div>
  )
}
