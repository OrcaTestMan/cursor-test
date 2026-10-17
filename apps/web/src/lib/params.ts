import { useSearchParams } from 'react-router'
import { toPageSize, toPositiveInt } from './format'

export type ParamPatch = Record<string, string | number | null>

/** 목록 화면의 필터·페이지 상태를 주소 쿼리로 관리한다. 필터를 바꾸면 페이지는 1로 돌아간다. */
export function useQueryState() {
  const [params, setParams] = useSearchParams()

  const update = (patch: ParamPatch, keepPage = false) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, String(value))
    }
    if (!keepPage && !('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  return {
    get: (key: string) => params.get(key) ?? '',
    page: toPositiveInt(params.get('page')) ?? 1,
    pageSize: toPageSize(params.get('pageSize')),
    update,
  }
}
