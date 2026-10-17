import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Field, FormError } from '../components/ui'
import { errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { safeNext } from '../lib/format'
import { btnPrimary, cardCls, inputCls } from '../lib/styles'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  if (user && !sending) return <Navigate to={next} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return setError('아이디와 비밀번호를 입력해 주세요.')
    setSending(true)
    setError(null)
    try {
      await login(username.trim(), password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-center text-xl font-bold">로그인</h1>
      <p className="mt-1 text-center text-xs text-dim">스포츠 이야기에 함께해 주세요.</p>
      <form onSubmit={onSubmit} className={`${cardCls} mt-6 space-y-4 p-6`} noValidate>
        <Field label="아이디">
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className={inputCls} />
        </Field>
        <Field label="비밀번호">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={inputCls}
          />
        </Field>
        <FormError message={error} />
        <button type="submit" disabled={sending} className={`${btnPrimary} w-full`}>
          {sending ? '로그인 중...' : '로그인'}
        </button>
        <p className="text-center text-xs text-dim">
          아직 회원이 아니신가요?{' '}
          <Link to={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-accent hover:text-accent-strong">
            회원가입
          </Link>
        </p>
      </form>
    </div>
  )
}
