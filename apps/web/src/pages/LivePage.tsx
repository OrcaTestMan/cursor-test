import { Link } from 'react-router'
import { IconLive } from '../components/icons'
import { MatchCard } from '../components/matches'
import { EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { todayKst } from '../lib/format'
import { btnPrimary, btnSecondary } from '../lib/styles'
import type { Match } from '../lib/types'

export default function LivePage() {
  const { data, loading, error, reload } = useApi<Match[]>(`/matches${buildQuery({ date: todayKst(), status: 'live' })}`)

  return (
    <div>
      <PageHeader
        icon={<IconLive size={20} />}
        title="라이브"
        subtitle="지금 진행 중인 오늘의 경기입니다."
        action={
          <button type="button" onClick={reload} className={btnSecondary}>
            새로고침
          </button>
        }
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<IconLive size={20} />}
          title="지금 진행 중인 경기가 없습니다"
          description="오늘의 다른 경기 일정을 확인해 보세요."
          action={
            <Link to="/matches" className={btnPrimary}>
              경기 일정 보기
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {data.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  )
}
