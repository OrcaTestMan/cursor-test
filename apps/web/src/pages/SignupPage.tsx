import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CenteredMessage, Field, FormError, Loading } from '../components/ui'
import { errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { safeNext } from '../lib/format'
import { useSettings } from '../lib/settings'
import { btnPrimary, btnSecondary, cardCls, inputCls } from '../lib/styles'
import { AuthShell } from './LoginPage'

type Errors = { username?: string; nickname?: string; password?: string; confirm?: string }

function validate(username: string, nickname: string, password: string, confirm: string): Errors {
  const errors: Errors = {}
  if (!/^[a-z0-9_]{4,20}$/.test(username)) errors.username = '아이디는 4~20자의 영문 소문자, 숫자, _만 쓸 수 있습니다.'
  const nick = nickname.trim()
  if (nick.length < 2 || nick.length > 12) errors.nickname = '닉네임은 2~12자로 입력해 주세요.'
  if (password.length < 8 || password.length > 64) errors.password = '비밀번호는 8~64자로 입력해 주세요.'
  if (confirm !== password) errors.confirm = '비밀번호가 서로 다릅니다.'
  return errors
}

export default function SignupPage() {
  const { user, signup } = useAuth()
  const { settings, loading: settingsLoading } = useSettings()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  if (user && !sending) {
    return (
      <AuthShell siteName={settings.siteName}>
        <h1 className="text-center text-xl font-bold">이미 로그인되어 있습니다</h1>
        <p className="mt-2 text-center text-sm text-dim">
          {user.nickname}님으로 접속 중입니다. 가입 화면은 로그아웃 후에 이용할 수 있습니다.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to={next} className={btnPrimary}>
            계속하기
          </Link>
          <Link to="/" className={btnSecondary}>
            홈으로
          </Link>
        </div>
      </AuthShell>
    )
  }
  if (settingsLoading)
    return (
      <AuthShell siteName={settings.siteName}>
        <Loading />
      </AuthShell>
    )
  if (!settings.signupEnabled)
    return (
      <AuthShell siteName={settings.siteName}>
        <CenteredMessage
          title="현재 회원가입을 받지 않습니다."
          description="나중에 다시 시도해 주세요."
          action={
            <Link to="/login" className={btnSecondary}>
              로그인
            </Link>
          }
        />
      </AuthShell>
    )

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(username, nickname, password, confirm)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSending(true)
    setServerError(null)
    try {
      await signup({ username, nickname: nickname.trim(), password })
      navigate(next === '/' ? '/me?setup=teams' : next, { replace: true })
    } catch (err) {
      setServerError(errorMessage(err))
      setSending(false)
    }
  }

  return (
    <AuthShell siteName={settings.siteName}>
      <h1 className="text-center text-xl font-bold">회원가입</h1>
      <p className="mt-1 text-center text-xs text-dim">가입하면 바로 로그인됩니다.</p>
      <form onSubmit={onSubmit} className={`${cardCls} mt-6 space-y-4 p-6`} noValidate>
        <Field label="아이디" error={errors.username} hint="4~20자, 영문 소문자·숫자·_">
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className={inputCls} />
        </Field>
        <Field label="닉네임" error={errors.nickname} hint="2~12자">
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="nickname" className={inputCls} />
        </Field>
        <Field label="비밀번호" error={errors.password} hint="8~64자">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={inputCls}
          />
        </Field>
        <Field label="비밀번호 확인" error={errors.confirm}>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={inputCls}
          />
        </Field>
        <FormError message={serverError} />
        <button type="submit" disabled={sending} className={`${btnPrimary} w-full`}>
          {sending ? '가입 중...' : '가입하기'}
        </button>
        <p className="text-center text-xs text-dim">
          이미 회원이신가요?{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-accent hover:text-accent-strong">
            로그인
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
