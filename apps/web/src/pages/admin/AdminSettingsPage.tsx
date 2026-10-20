import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { IconClose, IconPlus, IconSettings } from '../../components/icons'
import { ErrorBox, Field, FormError, FormSuccess, Loading, PageHeader, Toggle } from '../../components/ui'
import { TAG_MAX_COUNT, TAG_MAX_LENGTH } from '../../lib/admin'
import { apiFetch, errorMessage, useApi } from '../../lib/api'
import { useSettings } from '../../lib/settings'
import { btnPrimary, btnSmSecondary, cardCls, inputCls } from '../../lib/styles'
import type { Settings } from '../../lib/types'

export default function AdminSettingsPage() {
  const { data, loading, error, reload } = useApi<Settings>('/admin/settings')
  return (
    <div>
      <PageHeader icon={<IconSettings size={20} />} title="설정" subtitle="사이트, 게시판, 운영 안전 정책을 정합니다." />
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

function inRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max
}

function SettingsForm({ initial }: { initial: Settings }) {
  const { reload: reloadPublic } = useSettings()
  const [form, setForm] = useState<Settings>({
    ...initial,
    freeTags: initial.freeTags ?? [],
    matchTags: initial.matchTags ?? [],
    humorTags: initial.humorTags ?? [],
    reviewTags: initial.reviewTags ?? [],
    newsTags: initial.newsTags ?? [],
    bestThreshold: initial.bestThreshold ?? 5,
    reportHideThreshold: initial.reportHideThreshold ?? 5,
    postCooldownSec: initial.postCooldownSec ?? 30,
    commentCooldownSec: initial.commentCooldownSec ?? 10,
  })
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
    if (!inRange(form.bestThreshold, 1, 100)) return setError('인기글 기준은 1~100으로 입력해 주세요.')
    if (!inRange(form.reportHideThreshold, 1, 100)) return setError('신고 자동 숨김 기준은 1~100으로 입력해 주세요.')
    if (!inRange(form.postCooldownSec, 0, 600)) return setError('글 작성 간격은 0~600초로 입력해 주세요.')
    if (!inRange(form.commentCooldownSec, 0, 600)) return setError('댓글 작성 간격은 0~600초로 입력해 주세요.')
    const allTags = [...form.freeTags, ...form.matchTags, ...form.humorTags, ...form.reviewTags, ...form.newsTags]
    if (
      form.freeTags.length > TAG_MAX_COUNT ||
      form.matchTags.length > TAG_MAX_COUNT ||
      form.humorTags.length > TAG_MAX_COUNT ||
      form.reviewTags.length > TAG_MAX_COUNT ||
      form.newsTags.length > TAG_MAX_COUNT
    ) {
      return setError(`말머리는 각 ${TAG_MAX_COUNT}개까지 등록할 수 있습니다.`)
    }
    if (allTags.some((tag) => tag.length < 1 || tag.length > TAG_MAX_LENGTH)) {
      return setError(`말머리는 1~${TAG_MAX_LENGTH}자로 입력해 주세요.`)
    }
    setSending(true)
    setError(null)
    try {
      const saved = await apiFetch<Settings>('/admin/settings', {
        method: 'PUT',
        body: { ...form, siteName, noticeBanner },
      })
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
    <form onSubmit={onSubmit} className={`${cardCls} max-w-2xl space-y-6 p-5`} noValidate>
      <section className="space-y-4">
        <h2 className="text-sm font-bold">사이트</h2>
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
      </section>

      <section className="space-y-4 border-t border-edge-soft pt-5">
        <h2 className="text-sm font-bold">게시판</h2>
        <Field label="인기글 기준" hint="추천이 이 수 이상이면 인기글이 됩니다. (1~100)">
          <input
            type="number"
            min={1}
            max={100}
            value={form.bestThreshold}
            onChange={(e) => set('bestThreshold', Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <TagEditor
          label="자유게시판 말머리"
          hint={`최대 ${TAG_MAX_COUNT}개, 각 1~${TAG_MAX_LENGTH}자`}
          tags={form.freeTags}
          onChange={(tags) => set('freeTags', tags)}
        />
        <TagEditor
          label="경기 이야기 말머리"
          hint={`최대 ${TAG_MAX_COUNT}개, 각 1~${TAG_MAX_LENGTH}자`}
          tags={form.matchTags}
          onChange={(tags) => set('matchTags', tags)}
        />
        <TagEditor
          label="유머 말머리"
          hint={`최대 ${TAG_MAX_COUNT}개, 각 1~${TAG_MAX_LENGTH}자`}
          tags={form.humorTags}
          onChange={(tags) => set('humorTags', tags)}
        />
        <TagEditor
          label="직관·후기 말머리"
          hint={`최대 ${TAG_MAX_COUNT}개, 각 1~${TAG_MAX_LENGTH}자`}
          tags={form.reviewTags}
          onChange={(tags) => set('reviewTags', tags)}
        />
        <TagEditor
          label="뉴스·소식 말머리"
          hint={`최대 ${TAG_MAX_COUNT}개, 각 1~${TAG_MAX_LENGTH}자`}
          tags={form.newsTags}
          onChange={(tags) => set('newsTags', tags)}
        />
      </section>

      <section className="space-y-4 border-t border-edge-soft pt-5">
        <h2 className="text-sm font-bold">운영 안전</h2>
        <Field label="신고 자동 숨김" hint="처리 대기 신고가 이 수에 도달하면 글·댓글을 숨깁니다. (1~100)">
          <input
            type="number"
            min={1}
            max={100}
            value={form.reportHideThreshold}
            onChange={(e) => set('reportHideThreshold', Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="글 작성 간격(초)" hint="일반 회원이 글을 쓴 뒤 다시 쓸 수 있을 때까지의 초입니다. (0~600)">
          <input
            type="number"
            min={0}
            max={600}
            value={form.postCooldownSec}
            onChange={(e) => set('postCooldownSec', Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="댓글 작성 간격(초)" hint="일반 회원이 댓글을 쓴 뒤 다시 쓸 수 있을 때까지의 초입니다. (0~600)">
          <input
            type="number"
            min={0}
            max={600}
            value={form.commentCooldownSec}
            onChange={(e) => set('commentCooldownSec', Number(e.target.value))}
            className={inputCls}
          />
        </Field>
      </section>

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

function TagEditor({
  label,
  hint,
  tags,
  onChange,
}: {
  label: string
  hint: string
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [value, setValue] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const add = () => {
    const text = value.trim()
    if (!text || text.length > TAG_MAX_LENGTH) {
      setLocalError(`말머리는 1~${TAG_MAX_LENGTH}자로 입력해 주세요.`)
      return
    }
    if (tags.length >= TAG_MAX_COUNT) {
      setLocalError(`말머리는 ${TAG_MAX_COUNT}개까지 등록할 수 있습니다.`)
      return
    }
    if (tags.some((tag) => tag.toLowerCase() === text.toLowerCase())) {
      setLocalError('이미 있는 말머리입니다.')
      return
    }
    onChange([...tags, text])
    setValue('')
    setLocalError(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-dim">{label}</span>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={TAG_MAX_LENGTH}
          placeholder="추가할 말머리"
          aria-label={label}
          className={inputCls}
        />
        <button type="button" onClick={add} className={btnSmSecondary}>
          <IconPlus size={14} /> 추가
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        {hint} ({tags.length}/{TAG_MAX_COUNT})
      </p>
      {localError && <p className="mt-1 text-xs text-danger">{localError}</p>}
      {tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag} className="inline-flex h-8 items-center gap-1 rounded-lg border border-edge bg-input pr-1 pl-3 text-sm">
              {tag}
              <button
                type="button"
                aria-label={`${tag} 삭제`}
                onClick={() => onChange(tags.filter((item) => item !== tag))}
                className="grid size-6 place-items-center rounded-md text-dim hover:bg-danger-soft hover:text-danger"
              >
                <IconClose size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
