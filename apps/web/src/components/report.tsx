import { useState, type FormEvent } from 'react'
import { apiFetch, errorMessage } from '../lib/api'
import { REPORT_REASON_LABELS } from '../lib/format'
import { btnPrimary, btnSecondary, textareaCls } from '../lib/styles'
import type { ReportReason, ReportTarget } from '../lib/types'
import { FormError, FormSuccess, Modal } from './ui'

const REASONS = Object.keys(REPORT_REASON_LABELS) as ReportReason[]

export function ReportModal({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ReportTarget
  targetId: number
  onClose: () => void
}) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!reason) return setError('신고 사유를 골라 주세요.')
    const text = detail.trim()
    if (text.length > 300) return setError('자세한 내용은 300자까지 쓸 수 있습니다.')
    setSending(true)
    setError(null)
    try {
      await apiFetch<{ id: number }>('/reports', {
        method: 'POST',
        body: { targetType, targetId, reason, ...(text ? { detail: text } : {}) },
      })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal title={targetType === 'post' ? '게시글 신고' : '댓글 신고'} onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <FormSuccess message="신고가 접수되었습니다. 운영진이 확인한 뒤 알림으로 결과를 알려 드립니다." />
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={btnPrimary}>
              확인
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-dim">신고 사유</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${
                    reason === r ? 'border-accent/60 bg-accent-soft text-accent' : 'border-edge bg-card hover:bg-card-hover'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-accent"
                  />
                  {REPORT_REASON_LABELS[r]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-dim">자세한 내용 (선택)</span>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="운영진이 참고할 내용을 적어 주세요."
              className={textareaCls}
            />
            <span className="mt-1 block text-right text-xs text-muted">{detail.length}/300</span>
          </label>
          <FormError message={error} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={btnSecondary}>
              취소
            </button>
            <button type="submit" disabled={sending} className={btnPrimary}>
              {sending ? '보내는 중...' : '신고하기'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
