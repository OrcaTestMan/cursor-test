import type { ReactNode } from 'react'

export type IconProps = { size?: number; className?: string }

function Svg({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </Svg>
  )
}

export function IconLive(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4" />
      <path d="M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5" />
    </Svg>
  )
}

export function IconGrid(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Svg>
  )
}

export function IconCalendar(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  )
}

export function IconMegaphone(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
      <path d="M8 14v5" />
    </Svg>
  )
}

export function IconChat(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </Svg>
  )
}

export function IconBall(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 4 3-1.5 4.5h-5L8 10Z" />
      <path d="M12 7V3M16 10l4-1.5M14.5 14.5 17 18M9.5 14.5 7 18M8 10 4 8.5" />
    </Svg>
  )
}

export function IconUser(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  )
}

export function IconUsers(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </Svg>
  )
}

export function IconUserPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10" cy="8" r="4" />
      <path d="M2 21a8 8 0 0 1 13.5-5.8" />
      <path d="M19 14v6M16 17h6" />
    </Svg>
  )
}

export function IconMail(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </Svg>
  )
}

export function IconHeadset(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
      <path d="M19 20a3 3 0 0 1-3 2h-3" />
    </Svg>
  )
}

export function IconDashboard(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  )
}

export function IconTrophy(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
      <path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4" />
      <path d="M12 13v4M8 21h8M9 17h6v4H9z" />
    </Svg>
  )
}

export function IconFile(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </Svg>
  )
}

export function IconBan(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </Svg>
  )
}

export function IconSend(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 3 10 14" />
      <path d="m21 3-7 18-4-7-7-4Z" />
    </Svg>
  )
}

export function IconSettings(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </Svg>
  )
}

export function IconLogout(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Svg>
  )
}

export function IconExternal(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Svg>
  )
}

export function IconChevronLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  )
}

export function IconChevronRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  )
}

export function IconChevronDown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function IconChevronUp(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6 15 6-6 6 6" />
    </Svg>
  )
}

export function IconMenu(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  )
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  )
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  )
}

export function IconImage(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m21 16-5-5-8 8" />
    </Svg>
  )
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function IconPencil(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h4L19 9l-4-4L4 16Z" />
      <path d="m13.5 6.5 4 4" />
    </Svg>
  )
}

export function IconTrash(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Svg>
  )
}

export function IconClock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

export function IconAlert(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 2 20h20Z" />
      <path d="M12 10v4M12 17h.01" />
    </Svg>
  )
}

export function IconLock(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  )
}

export function IconEye(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function IconBell(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Svg>
  )
}

export function IconThumbUp(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
      <path d="M7 10l4-7a2.5 2.5 0 0 1 3 2.5V9h5a2 2 0 0 1 2 2.3l-1.3 7.6A2.5 2.5 0 0 1 17.2 21H7" />
    </Svg>
  )
}

export function IconBookmark(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3h12v18l-6-4-6 4Z" />
    </Svg>
  )
}

export function IconFlag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </Svg>
  )
}

export function IconLink(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </Svg>
  )
}

export function IconShare(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M8.6 10.5l6.8-4" />
    </Svg>
  )
}

export function IconReply(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 4v7a4 4 0 0 0 4 4h10" />
      <path d="m15 11 4 4-4 4" />
    </Svg>
  )
}

export function IconFire(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3s5 4.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 1.5-4s.5 2 2 2.5C10 8 12 3 12 3Z" />
    </Svg>
  )
}

export function IconTable(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M3 14h18M9 9v11" />
    </Svg>
  )
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m5 12 5 5 9-10" />
    </Svg>
  )
}

export function IconTarget(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </Svg>
  )
}

export function IconInbox(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5 5h14l2 8v6H3v-6Z" />
    </Svg>
  )
}

export function IconSmile(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10h.01M16 10h.01" />
      <path d="M8.5 15c1.2 1.3 2.6 2 3.5 2s2.3-.7 3.5-2" />
    </Svg>
  )
}

export function IconTicket(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
      <path d="M12 6v12" />
    </Svg>
  )
}

export function IconNews(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 5h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2Z" />
      <path d="M18 7h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8" />
      <path d="M8 10h6M8 14h4" />
    </Svg>
  )
}
