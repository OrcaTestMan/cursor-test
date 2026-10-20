import { useState, type ReactNode } from 'react'
import { ADMIN_USER_STATUS_LABELS } from '../../lib/admin'
import { btnSmSecondary } from '../../lib/styles'
import type { UserStatus } from '../../lib/types'
import type { IconProps } from '../icons'
import { Pill, type Tone } from '../ui'

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

export function IconFlag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </Svg>
  )
}

export function IconFilterWord(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6h16M4 12h10M4 18h7" />
      <circle cx="18" cy="17" r="3.5" />
      <path d="m15.5 19.5 5-5" />
    </Svg>
  )
}

export function IconHistory(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

export function IconKey(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8.7-8.7M16 7l3 3M14 9l2 2" />
    </Svg>
  )
}

const USER_STATUS_TONES: Record<UserStatus, Tone> = { active: 'green', blocked: 'red', deleted: 'gray' }

export function AdminUserStatusPill({ status }: { status: UserStatus }) {
  return <Pill tone={USER_STATUS_TONES[status]}>{ADMIN_USER_STATUS_LABELS[status]}</Pill>
}

export function TempPasswordBox({ password }: { password: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = () => {
    void navigator.clipboard.writeText(password).then(
      () => setCopied(true),
      () => setCopied(false),
    )
  }
  return (
    <div className="space-y-2 rounded-lg border border-gold/40 bg-gold-soft px-4 py-3">
      <p className="text-xs font-semibold text-gold">임시 비밀번호는 지금 한 번만 보여 줍니다. 닫기 전에 복사해서 회원에게 전달하세요.</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 rounded-md bg-input px-3 py-1.5 font-mono text-sm tracking-wider select-all">{password}</code>
        <button type="button" onClick={onCopy} className={btnSmSecondary}>
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
    </div>
  )
}
