import { Link, useParams } from 'react-router'
import { IconHeadset } from '../components/icons'
import { ErrorBox, InquiryStatusPill, Loading, PageHeader } from '../components/ui'
import { useApi } from '../lib/api'
import { formatDateTime, toPositiveInt } from '../lib/format'
import { btnSecondary, cardCls } from '../lib/styles'
import type { Inquiry } from '../lib/types'

export default function InquiryDetailPage() {
  const id = toPositiveInt(useParams().id)
  const { data, loading, error, reload } = useApi<Inquiry>(id ? `/inquiries/${id}` : null)

  const back = (
    <Link to="/inquiries" className={btnSecondary}>
      목록으로
    </Link>
  )

  return (
    <div>
      <PageHeader icon={<IconHeadset size={20} />} title="1:1 문의" subtitle="문의 내용과 답변입니다." action={back} />
      {!id ? (
        <ErrorBox message="문의를 찾을 수 없습니다." />
      ) : loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox message={error ?? '문의를 찾을 수 없습니다.'} onRetry={reload} />
      ) : (
        <div className="space-y-4">
          <section className={`${cardCls} p-5`}>
            <div className="mb-2 flex items-center gap-2">
              <InquiryStatusPill status={data.status} />
              <span className="text-xs text-muted">{formatDateTime(data.createdAt)}</span>
            </div>
            <h2 className="text-lg font-bold break-words">{data.title}</h2>
            <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-wrap">{data.body}</p>
          </section>
          <section className={`rounded-xl border p-5 ${data.answer ? 'border-accent/40 bg-accent-soft/30' : 'border-dashed border-edge bg-panel'}`}>
            <p className="mb-2 text-sm font-bold text-accent">운영진 답변</p>
            {data.answer ? (
              <>
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{data.answer}</p>
                {data.answeredAt && <p className="mt-3 text-xs text-muted">{formatDateTime(data.answeredAt)}</p>}
              </>
            ) : (
              <p className="text-sm text-dim">아직 답변이 등록되지 않았습니다. 조금만 기다려 주세요.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
