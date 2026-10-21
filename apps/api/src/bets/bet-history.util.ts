export const BET_STATUS_LABEL = {
  '진행 중': '진행',
  적중: '적중',
  미적중: '낙첨',
  적특: '적특',
  취소: '취소',
} as const

export type BetDbStatus = keyof typeof BET_STATUS_LABEL

export const BET_STATUS_FILTER: Record<string, BetDbStatus> = {
  진행: '진행 중',
  '진행 중': '진행 중',
  적중: '적중',
  낙첨: '미적중',
  미적중: '미적중',
  적특: '적특',
  취소: '취소',
}

export function statusLabel(status: string) {
  return BET_STATUS_LABEL[status as BetDbStatus] || status
}

export function parseStatusFilter(value?: string) {
  if (!value) return undefined
  return BET_STATUS_FILTER[value]
}

export function paidAmount(
  status: string,
  stake: number,
  potentialPayout: number,
) {
  if (status === '적중') return potentialPayout
  if (status === '취소' || status === '적특') return stake
  return 0
}

export function folderLabel(kind: string, legCount = 0) {
  if (kind === 'multi' || legCount >= 2) return '다폴더'
  return '단폴더'
}

export function liveLabel(live: boolean, whenLabel?: string) {
  if (live || whenLabel === '실시간') return '라이브'
  return '일반'
}

export function ledgerKind(refType: string, amount: number) {
  if (refType === 'bet_place') return '차감'
  if (refType === 'bet_win') return '지급'
  if (refType === 'bet_cancel' || refType === 'bet_push') return '환불'
  if (refType === 'bet_win_reverse') return '지급회수'
  if (refType === 'bet_cancel_reverse') return '환불회수'
  return amount < 0 ? '차감' : '지급'
}

export function encodeCursor(placedAt: Date, id: number) {
  return `${placedAt.toISOString()}_${id}`
}

export function decodeCursor(cursor?: string) {
  if (!cursor) return undefined
  const idx = cursor.lastIndexOf('_')
  if (idx <= 0) return undefined
  const placedAt = new Date(cursor.slice(0, idx))
  const id = Number(cursor.slice(idx + 1))
  if (Number.isNaN(placedAt.getTime()) || !Number.isInteger(id) || id < 1) {
    return undefined
  }
  return { placedAt, id }
}
