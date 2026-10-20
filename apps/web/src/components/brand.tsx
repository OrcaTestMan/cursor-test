import { Link } from 'react-router'
import { useSettings } from '../lib/settings'
import { IconBall } from './icons'

export function BrandMark({
  to = '/',
  stacked = true,
  en = 'COMMUNITY',
}: {
  to?: string
  stacked?: boolean
  en?: string
}) {
  const { settings } = useSettings()
  return (
    <Link to={to} className="flex shrink-0 items-center gap-3 text-fg">
      <span className="grid size-9 place-items-center rounded-[10px] bg-accent-fill text-on-accent">
        <IconBall size={18} />
      </span>
      <span className="min-w-0 leading-none">
        <span className="block max-w-48 truncate text-[19px] font-black tracking-tight">{settings.siteName}</span>
        {stacked && (
          <span className="mt-1 block text-[10px] font-bold tracking-[0.26em] text-white/90 uppercase">{en}</span>
        )}
      </span>
    </Link>
  )
}
