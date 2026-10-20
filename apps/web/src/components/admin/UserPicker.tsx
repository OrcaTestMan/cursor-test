import { useState } from 'react'
import { buildQuery, useApi } from '../../lib/api'
import { btnSecondary, inputCls } from '../../lib/styles'
import type { AdminUser, Author, Paged } from '../../lib/types'
import { IconSearch } from '../icons'
import { Loading } from '../ui'

export function UserPicker({ onPick }: { onPick: (user: Author) => void }) {
  const [input, setInput] = useState('')
  const [q, setQ] = useState<string | null>(null)
  const result = useApi<Paged<AdminUser>>(q === null ? null : `/admin/users/lookup${buildQuery({ q, page: 1, pageSize: 20 })}`)

  return (
    <div className="rounded-lg border border-edge bg-panel p-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                setQ(input.trim())
              }
            }}
            placeholder="아이디 또는 닉네임으로 회원 검색"
            aria-label="회원 검색"
            className={`${inputCls} pl-9`}
          />
        </div>
        <button type="button" onClick={() => setQ(input.trim())} className={btnSecondary}>
          찾기
        </button>
      </div>
      {q !== null && (
        <div className="mt-2 max-h-56 overflow-y-auto">
          {result.loading ? (
            <Loading />
          ) : result.error ? (
            <p className="px-2 py-3 text-xs text-danger">{result.error}</p>
          ) : !result.data || result.data.items.length === 0 ? (
            <p className="px-2 py-3 text-xs text-dim">검색된 회원이 없습니다.</p>
          ) : (
            <>
            {result.data.items.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onPick({ id: u.id, nickname: u.nickname })}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-card-hover"
              >
                <span className="text-muted">#{u.id}</span>
                <span className="font-semibold">{u.nickname}</span>
                <span className="text-dim">({u.username})</span>
              </button>
            ))}
            {result.data.total > result.data.items.length && (
              <p className="px-2 py-2 text-xs text-dim">
                {result.data.total.toLocaleString('ko-KR')}명 중 {result.data.items.length}명만 표시했습니다. 검색어를 더 구체적으로 입력해 주세요.
              </p>
            )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
