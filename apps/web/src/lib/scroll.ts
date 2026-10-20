import { useEffect } from 'react'
import { useLocation } from 'react-router'

function keyOf(pathname: string, search: string) {
  return `${pathname}${search}`
}

export function useScrollMemory() {
  const location = useLocation()
  const key = keyOf(location.pathname, location.search)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`scroll:${key}`)
      window.scrollTo(0, saved ? Number(saved) : 0)
    } catch {
      window.scrollTo(0, 0)
    }
    const onScroll = () => {
      try {
        sessionStorage.setItem(`scroll:${key}`, String(window.scrollY))
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      onScroll()
      window.removeEventListener('scroll', onScroll)
    }
  }, [key])
}
