import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { IconHeadset, IconPlus } from '../components/icons'
import { EmptyState, ErrorBox, Field, FormError, InquiryStatusPill, Loading, PageHeader, Pagination } from '../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../lib/api'
import { formatShort } from '../lib/format'
import { btnPrimary, btnSecondary, cardCls, inputCls, textareaCls } from '../lib/styles'
import type { Inquiry, Paged } from '../lib/types'

export default function InquiriesPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [writing, setWriting] = useState(false)
  const { data, loading, error, reload } = useApi<Paged<Inquiry>>(`/inquiries${buildQuery({ page, pageSize })}`)

  const openForm = () => setWriting(true)

  return (
    <div>
      <PageHeader
        icon={<IconHeadset size={20} />}
        title="1:1 문의"
        subtitle="궁금한 점을 남겨주시면 운영진이 답변해 드립니다."
        action={
          !writing && (
            <button type="button" onClick={openForm} className={btnPrimary}>
              <IconPlus /> 문의하기
            </button>
          )
        }
      />
      {writing && (
        <InquiryForm
          onCancel={() => setWriting(false)}
          onCreated={() => {
            setWriting(false)
            setPage(1)
            reload()
          }}
        />
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        !writing && (
          <EmptyState
            icon={<IconHeadset size={20} />}
            title="문의 내역이 없습니다"
            description="궁금한 점이 있으면 언제든 문의해주세요."
            action={
              <button type="button" onClick={openForm} className={btnPrimary}>
                문의하기
              </button>
            }
          />
        )
      ) : (
        <>
          <ul className={`${cardCls} overflow-hidden`}>
            {data.items.map((inq) => (
              <li key={inq.id} className="border-b border-edge-soft last:border-b-0">
                <Link to={`/inquiries/${inq.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-card-hover">
                  <span className="w-12 shrink-0 text-muted">#{inq.id}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{inq.title}</span>
                  <InquiryStatusPill status={inq.status} />
                  <span className="shrink-0 text-xs text-muted tabular-nums">{formatShort(inq.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </>
      )}
    </div>
  )
}

function InquiryForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    const b = body.trim()
    const next: { title?: string; body?: string } = {}
    if (!t) next.title = '제목을 입력해 주세요.'
    else if (t.length > 100) next.title = '제목은 100자까지 쓸 수 있습니다.'
    if (!b) next.body = '내용을 입력해 주세요.'
    else if (b.length > 2000) next.body = '내용은 2000자까지 쓸 수 있습니다.'
    setErrors(next)
    if (next.title || next.body) return
    setSending(true)
    setServerError(null)
    try {
      await apiFetch<Inquiry>('/inquiries', { method: 'POST', body: { title: t, body: b } })
      onCreated()
    } catch (err) {
      setServerError(errorMessage(err))
      setSending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${cardCls} mb-5 space-y-4 p-5`} noValidate>
      <h2 className="font-bold">새 문의</h2>
      <Field label="제목" error={errors.title}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className={inputCls} />
      </Field>
      <Field label="내용" error={errors.body} hint={`${body.length}/2000`}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={2000} className={textareaCls} />
      </Field>
      <FormError message={serverError} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnSecondary}>
          취소
        </button>
        <button type="submit" disabled={sending} className={btnPrimary}>
          {sending ? '보내는 중...' : '문의 등록'}
        </button>
      </div>
    </form>
  )
}
