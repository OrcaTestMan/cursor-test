import { useSearchParams } from 'react-router'
import { toPageSize, toPositiveInt } from './format'

export type ParamPatch = Record<string, string | number | null>

type UpdateOptions = { keepPage?: boolean; replace?: boolean }

/** 목록 화면의 필터·페이지 상태를 주소 쿼리로 관리한다. 필터를 바꾸면 페이지는 1로 돌아간다. */
export function useQueryState() {
  const [params, setParams] = useSearchParams()

  const update = (patch: ParamPatch, keepPageOrOptions: boolean | UpdateOptions = false) => {
    const options: UpdateOptions = typeof keepPageOrOptions === 'boolean' ? { keepPage: keepPageOrOptions } : keepPageOrOptions
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, String(value))
    }
    if (!options.keepPage && !('page' in patch)) next.delete('page')
    setParams(next, { replace: options.replace ?? false })
  }

  return {
    get: (key: string) => params.get(key) ?? '',
    has: (key: string) => params.has(key),
    params,
    page: toPositiveInt(params.get('page')) ?? 1,
    pageSize: toPageSize(params.get('pageSize')),
    update,
  }
}
