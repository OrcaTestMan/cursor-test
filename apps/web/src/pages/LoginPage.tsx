import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { BrandMark } from '../components/brand'
import { BackButton, Field, FormError, Loading } from '../components/ui'
import { errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { safeAdminNext, safeNext } from '../lib/format'
import { btnPrimary, btnSecondary, cardCls, inputCls } from '../lib/styles'
import { loadLastUsername, saveLastUsername } from '../lib/prefs'
import { useSettings } from '../lib/settings'

export default function LoginPage({ variant = 'member' }: { variant?: 'member' | 'admin' }) {
  const admin = variant === 'admin'
  const { user, loading, login, logout } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = admin ? safeAdminNext(params.get('next')) : safeNext(params.get('next'))
  const [username, setUsername] = useState(loadLastUsername)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  if (loading) {
    return (
      <AuthShell siteName={settings.siteName} admin={admin}>
        <Loading text="로그인 정보를 확인하는 중..." />
      </AuthShell>
    )
  }

  if (user && !sending) {
    if (admin) {
      if (user.role === 'admin') return <Navigate to={next} replace />
      return (
        <AuthShell siteName={settings.siteName} admin>
          <h1 className="text-center text-xl font-bold">회원 계정입니다</h1>
          <p className="mt-2 text-center text-sm text-dim">
            {user.nickname}님은 회원으로 로그인되어 있습니다. 운영 콘솔은 관리자 계정으로만 들어갈 수 있습니다.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/" className={btnPrimary}>
              회원 사이트로
            </Link>
            <button type="button" className={btnSecondary} onClick={() => void logout()}>
              로그아웃
            </button>
          </div>
        </AuthShell>
      )
    }
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    return (
      <AuthShell siteName={settings.siteName}>
        <h1 className="text-center text-xl font-bold">이미 로그인되어 있습니다</h1>
        <p className="mt-2 text-center text-sm text-dim">{user.nickname}님으로 접속 중입니다.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to={next} className={btnPrimary}>
            계속하기
          </Link>
          <button type="button" className={btnSecondary} onClick={() => void logout()}>
            로그아웃
          </button>
        </div>
      </AuthShell>
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return setError('아이디와 비밀번호를 입력해 주세요.')
    setSending(true)
    setError(null)
    try {
      const name = username.trim()
      const logged = await login(name, password)
      saveLastUsername(name)
      if (admin) {
        if (logged.role !== 'admin') {
          await logout()
          setError('관리자 계정이 아닙니다. 회원 로그인에서 들어가 주세요.')
          setSending(false)
          return
        }
        navigate(next, { replace: true })
        return
      }
      if (logged.role === 'admin') {
        navigate('/admin', { replace: true })
        return
      }
      navigate(next, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setSending(false)
    }
  }

  const form = (
    <form onSubmit={onSubmit} className={`${cardCls} mt-6 space-y-4 p-6`} noValidate>
      <Field label="아이디">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus={!username}
          className={inputCls}
        />
      </Field>
      <Field label="비밀번호">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus={!!username}
          className={inputCls}
        />
      </Field>
      <FormError message={error} />
      <button type="submit" disabled={sending} className={`${btnPrimary} w-full`}>
        {sending ? '로그인 중...' : admin ? '관리자 로그인' : '로그인'}
      </button>
      {admin ? (
        <p className="text-center text-xs text-dim">
          회원 사이트는{' '}
          <Link to="/login" className="font-semibold text-accent hover:text-accent-strong">
            회원 로그인
          </Link>
          으로 들어갑니다.
        </p>
      ) : (
        <p className="text-center text-xs text-dim">
          아직 회원이 아니신가요?{' '}
          <Link to={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-accent hover:text-accent-strong">
            회원가입
          </Link>
        </p>
      )}
    </form>
  )

  if (admin) {
    return (
      <AuthShell siteName={settings.siteName} admin>
        <h1 className="text-center text-xl font-bold">관리자 로그인</h1>
        <p className="mt-1 text-center text-xs text-dim">운영 콘솔은 회원 사이트와 분리되어 있습니다.</p>
        {form}
      </AuthShell>
    )
  }

  return (
    <AuthShell siteName={settings.siteName}>
      <h1 className="text-center text-xl font-bold">회원 로그인</h1>
      <p className="mt-1 text-center text-xs text-dim">로그인해야 사이트를 이용할 수 있습니다.</p>
      <p className="mt-1 text-center text-xs text-dim">테스트 계정 아이디/비밀번호: test</p>
      {form}
    </AuthShell>
  )
}

export function AuthShell({
  siteName,
  admin,
  children,
}: {
  siteName: string
  admin?: boolean
  children: ReactNode
}) {
  return (
    <div className="home-hero min-h-screen">
      <div className="flex h-[4.5rem] items-center gap-3 px-4">
        <BrandMark stacked={false} />
        {admin && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold tracking-[0.12em] text-accent">
            ADMIN
          </span>
        )}
      </div>
      <div className="grid place-items-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-4 flex justify-end">
            <BackButton fallback={admin ? '/admin/login' : '/login'} />
          </div>
          <p className="home-eyebrow mb-2 text-center">{admin ? 'Admin Console' : 'Member Access'}</p>
          <p className="mb-2 text-center font-display text-3xl">{siteName}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
