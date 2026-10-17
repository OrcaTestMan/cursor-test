import { useCallback, useEffect, useState } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL

type ErrorBody = {
  statusCode: number
  message: string | string[]
  error: string
}

function isErrorBody(value: unknown): value is ErrorBody {
  if (typeof value !== 'object' || value === null || !('message' in value)) return false
  const { message } = value
  return typeof message === 'string' || Array.isArray(message)
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다.')
  }

  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null)
    const message = isErrorBody(data)
      ? Array.isArray(data.message)
        ? data.message.join('\n')
        : data.message
      : `요청에 실패했습니다. (${res.status})`
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
}

export function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

type Result<T> = { key: string; data?: T; error?: string }

export function useApi<T>(path: string | null, refreshKey: string | number = '') {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<Result<T> | null>(null)
  const key = `${path ?? ''}#${version}#${refreshKey}`

  useEffect(() => {
    if (path === null) return
    let cancelled = false
    apiFetch<T>(path).then(
      (data) => {
        if (!cancelled) setResult({ key, data })
      },
      (error: unknown) => {
        if (!cancelled) setResult({ key, error: errorMessage(error) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [path, key])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const current = result?.key === key ? result : null
  return {
    data: current?.data,
    error: current?.error,
    loading: path !== null && current === null,
    reload,
  }
}
