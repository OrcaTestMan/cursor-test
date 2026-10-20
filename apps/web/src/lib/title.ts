import { useEffect } from 'react'
import { useSettings } from './settings'

/** `document.title`을 `{페이지} · {사이트 이름}`으로 맞춘다. 페이지가 없으면 사이트 이름만 쓴다. */
export function useTitle(page?: string | null) {
  const { settings } = useSettings()
  const siteName = settings.siteName
  useEffect(() => {
    document.title = page ? `${page} · ${siteName}` : siteName
  }, [page, siteName])
}
