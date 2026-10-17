import { useState, type FormEvent } from 'react'
import { IconSettings } from '../../components/icons'
import { ErrorBox, Field, FormError, FormSuccess, Loading, PageHeader, Toggle } from '../../components/ui'
import { apiFetch, errorMessage, useApi } from '../../lib/api'
import { useSettings } from '../../lib/settings'
import { btnPrimary, cardCls, inputCls } from '../../lib/styles'
import type { Settings } from '../../lib/types'

export default function AdminSettingsPage() {
  const { data, loading, error, reload } = useApi<Settings>('/admin/settings')
  return (
    <div>
      <PageHeader icon={<IconSettings size={20} />} title="설정" subtitle="사이트 이름, 공지 배너, 가입·승인 정책을 정합니다." />
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox message={error ?? '설정을 불러오지 못했습니다.'} onRetry={reload} />
      ) : (
        <SettingsForm initial={data} />
      )}
    </div>
  )
}

function SettingsForm({ initial }: { initial: Settings }) {
  const { reload: reloadPublic } = useSettings()
  const [form, setForm] = useState<Settings>(initial)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setDone(null)
    const siteName = form.siteName.trim()
    const noticeBanner = form.noticeBanner.trim()
    if (!siteName || siteName.length > 30) return setError('사이트 이름은 1~30자로 입력해 주세요.')
    if (noticeBanner.length > 200) return setError('공지 배너는 200자까지 쓸 수 있습니다.')
    setSending(true)
    setError(null)
    try {
      const saved = await apiFetch<Settings>('/admin/settings', { method: 'PUT', body: { ...form, siteName, noticeBanner } })
      setForm(saved)
      setDone('설정을 저장했습니다.')
      reloadPublic()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${cardCls} max-w-2xl space-y-4 p-5`} noValidate>
      <Field label="사이트 이름" hint="1~30자">
        <input value={form.siteName} onChange={(e) => set('siteName', e.target.value)} maxLength={30} className={inputCls} />
      </Field>
      <Field label="공지 배너" hint={`비워 두면 배너를 숨깁니다. (${form.noticeBanner.length}/200)`}>
        <input value={form.noticeBanner} onChange={(e) => set('noticeBanner', e.target.value)} maxLength={200} className={inputCls} />
      </Field>
      <div className="divide-y divide-edge-soft border-y border-edge-soft">
        <Toggle
          label="회원가입 받기"
          description="끄면 새 회원가입을 막습니다."
          checked={form.signupEnabled}
          onChange={(v) => set('signupEnabled', v)}
        />
        <Toggle
          label="글·댓글 승인제"
          description="켜면 일반 회원의 글과 댓글이 관리자 승인 후 보입니다."
          checked={form.postApprovalRequired}
          onChange={(v) => set('postApprovalRequired', v)}
        />
      </div>
      <FormError message={error} />
      <FormSuccess message={done} />
      <div className="flex justify-end">
        <button type="submit" disabled={sending} className={btnPrimary}>
          {sending ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </form>
  )
}
