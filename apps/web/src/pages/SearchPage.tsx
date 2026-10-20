import { useEffect, useState } from 'react'
import { EmptyFilterActions, FilterChoice, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { IconSearch } from '../components/icons'
import { PostTable } from '../components/posts'
import { EmptyState, ErrorBox, Field, Loading, PageHeader, Pagination } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { dateFilterQuery, emptyDateFilter, optionalIntError, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { inputCls } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { Paged, PostSummary, Team } from '../lib/types'

type Extra = {
  sort: string
  teamId: string
  authorId: string
  tag: string
  best: '' | 'true'
  hasImage: '' | 'true' | 'false'
  hasComments: '' | 'true' | 'false'
  minLikes: string
  minCommentCount: string
  poll: '' | 'none' | 'open' | 'closed'
}

const EMPTY_EXTRA: Extra = {
  sort: 'latest',
  teamId: '',
  authorId: '',
  tag: '',
  best: '',
  hasImage: '',
  hasComments: '',
  minLikes: '',
  minCommentCount: '',
  poll: '',
}

function extraFromParams(get: (key: string) => string): Extra {
  const hasImage = get('hasImage')
  const hasComments = get('hasComments')
  const poll = get('poll')
  return {
    sort: get('sort') === 'likes' ? 'likes' : 'latest',
    teamId: get('teamId'),
    authorId: get('authorId'),
    tag: get('tag'),
    best: get('best') === 'true' ? 'true' : '',
    hasImage: hasImage === 'true' || hasImage === 'false' ? hasImage : '',
    hasComments: hasComments === 'true' || hasComments === 'false' ? hasComments : '',
    minLikes: get('minLikes'),
    minCommentCount: get('minCommentCount'),
    poll: poll === 'none' || poll === 'open' || poll === 'closed' ? poll : '',
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    sort: extra.sort === 'likes' ? 'likes' : null,
    teamId: extra.teamId || null,
    authorId: extra.authorId || null,
    tag: extra.tag || null,
    best: extra.best || null,
    hasImage: extra.hasImage || null,
    hasComments: extra.hasComments || null,
    minLikes: extra.minLikes || null,
    minCommentCount: extra.minCommentCount || null,
    poll: extra.poll || null,
  }
}

function advancedCountOf(extra: Extra) {
  return [extra.teamId, extra.authorId, extra.tag, extra.best, extra.minLikes, extra.minCommentCount, extra.poll].filter(Boolean).length
}

export default function SearchPage() {
  useTitle('검색')
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'today', {
    keys: ['minLikes', 'minCommentCount'],
  })
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const [filterAlert, setFilterAlert] = useState<string | null>(null)
  const teams = useApi<Team[]>('/teams')

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const { data, loading, error, reload } = useApi<Paged<PostSummary>>(
    `/posts${buildQuery({
      includeNotice: 'true',
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const apply = (dates = draft, nextExtra = extra) => {
    setFilterAlert(null)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(nextExtra) })
  }
  const submit = () => {
    const message = optionalIntError(extra.minLikes, '추천 수') || optionalIntError(extra.minCommentCount, '댓글 수')
    if (message) {
      setFilterAlert(message)
      return
    }
    apply()
  }
  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(EMPTY_EXTRA) }, { replace: true })
  }

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.sort === 'likes') {
    chips.push({ key: 'sort', label: '정렬: 추천순', onRemove: () => apply(appliedDates, { ...appliedExtra, sort: 'latest' }) })
  }
  if (appliedExtra.teamId) {
    const name = (teams.data ?? []).find((team) => String(team.id) === appliedExtra.teamId)?.name ?? appliedExtra.teamId
    chips.push({ key: 'teamId', label: `팀: ${name}`, onRemove: () => apply(appliedDates, { ...appliedExtra, teamId: '' }) })
  }
  if (appliedExtra.hasImage) {
    chips.push({
      key: 'hasImage',
      label: appliedExtra.hasImage === 'true' ? '이미지 있음' : '이미지 없음',
      onRemove: () => apply(appliedDates, { ...appliedExtra, hasImage: '' }),
    })
  }
  if (appliedExtra.hasComments) {
    chips.push({
      key: 'hasComments',
      label: appliedExtra.hasComments === 'true' ? '댓글 있음' : '댓글 없음',
      onRemove: () => apply(appliedDates, { ...appliedExtra, hasComments: '' }),
    })
  }
  if (appliedExtra.minLikes) {
    chips.push({ key: 'minLikes', label: `추천 ${appliedExtra.minLikes}개 이상`, onRemove: () => apply(appliedDates, { ...appliedExtra, minLikes: '' }) })
  }
  if (appliedExtra.minCommentCount) {
    chips.push({
      key: 'minCommentCount',
      label: `댓글 ${appliedExtra.minCommentCount}개 이상`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, minCommentCount: '' }),
    })
  }
  if (appliedExtra.best) {
    chips.push({ key: 'best', label: '인기글', onRemove: () => apply(appliedDates, { ...appliedExtra, best: '' }) })
  }

  const total = data?.total ?? 0

  return (
    <div>
      <PageHeader icon={<IconSearch size={20} />} title="검색" subtitle="제목, 본문, 작성자, 팀으로 글을 찾습니다." />
      <ListFilterBar
        dateLabel="작성일 기준"
        searchPlaceholder="제목, 내용, 작성자 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={submit}
        onReset={reset}
        restoreNotice={restoreNotice}
        alert={filterAlert}
        advancedCount={advancedCountOf(appliedExtra)}
        chips={chips}
        basic={
          <>
            <FilterChoice
              label="정렬"
              value={extra.sort}
              onChange={(value) => setExtra({ ...extra, sort: value || 'latest' })}
              items={[
                { value: 'latest', label: '최신순' },
                { value: 'likes', label: '추천순' },
              ]}
            />
            <OptionButtons
              label="이미지"
              value={extra.hasImage}
              onChange={(value) => setExtra({ ...extra, hasImage: value })}
              items={[
                { value: '', label: '이미지 전체' },
                { value: 'true', label: '있음' },
                { value: 'false', label: '없음' },
              ]}
            />
            <OptionButtons
              label="댓글"
              value={extra.hasComments}
              onChange={(value) => setExtra({ ...extra, hasComments: value })}
              items={[
                { value: '', label: '댓글 전체' },
                { value: 'true', label: '있음' },
                { value: 'false', label: '없음' },
              ]}
            />
          </>
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="팀">
              <FilterChoice
                label="팀"
                value={extra.teamId}
                onChange={(value) => setExtra({ ...extra, teamId: value })}
                items={[{ value: '', label: '전체 팀' }, ...(teams.data ?? []).map((team) => ({ value: String(team.id), label: team.name }))]}
              />
            </Field>
            <Field label="작성자 회원번호">
              <input value={extra.authorId} onChange={(e) => setExtra({ ...extra, authorId: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 12" />
            </Field>
            <Field label="말머리">
              <input value={extra.tag} onChange={(e) => setExtra({ ...extra, tag: e.target.value })} className={inputCls} placeholder="말머리" />
            </Field>
            <Field label="추천 수 이상">
              <input value={extra.minLikes} onChange={(e) => setExtra({ ...extra, minLikes: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 5" />
            </Field>
            <Field label="댓글 수 이상">
              <input value={extra.minCommentCount} onChange={(e) => setExtra({ ...extra, minCommentCount: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 3" />
            </Field>
            <Field label="투표">
              <FilterChoice
                label="투표"
                value={extra.poll}
                onChange={(value) => setExtra({ ...extra, poll: value })}
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'none', label: '없음' },
                  { value: 'open', label: '진행 중' },
                  { value: 'closed', label: '마감' },
                ]}
              />
            </Field>
            <OptionButtons
              label="인기글"
              value={extra.best}
              onChange={(value) => setExtra({ ...extra, best: value })}
              items={[
                { value: '', label: '전체' },
                { value: 'true', label: '인기글만' },
              ]}
            />
          </div>
        }
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '건')}</p>}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconSearch size={20} />}
          title="선택한 작성일 기간과 검색어에 맞는 글이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
        />
      ) : (
        <>
          <PostTable posts={data.items} showCategory />
          <Pagination
            page={qs.page}
            pageSize={qs.pageSize}
            total={data.total}
            onPage={(p) => qs.update({ page: p }, true)}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}
    </div>
  )
}
