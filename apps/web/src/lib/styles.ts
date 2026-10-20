const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-full font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export const btnPrimary = `${btnBase} h-11 px-5 bg-accent-fill text-on-accent hover:bg-accent-fill-hover`
export const btnSecondary = `${btnBase} h-11 px-5 border border-edge bg-transparent text-fg hover:bg-white/10`
export const btnDanger = `${btnBase} h-11 px-5 bg-danger-soft text-danger hover:bg-danger hover:text-fg`
export const btnGhost = `${btnBase} h-11 px-4 text-dim hover:bg-white/10 hover:text-fg`

export const btnSmPrimary = `${btnBase} h-9 px-4 text-sm bg-accent-fill text-on-accent hover:bg-accent-fill-hover`
export const btnSmSecondary = `${btnBase} h-9 px-4 text-sm border border-edge bg-transparent text-fg hover:bg-white/10`
export const btnSmDanger = `${btnBase} h-9 px-4 text-sm bg-danger-soft text-danger hover:bg-danger hover:text-fg`
export const btnSmGold = `${btnBase} h-9 px-4 text-sm bg-gold-soft text-gold hover:bg-gold hover:text-on-accent`

export const inputCls =
  'h-11 w-full rounded-2xl border border-edge bg-input px-3.5 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-60'
export const dateInputCls =
  'filter-date relative h-9 w-[8.75rem] min-w-[8.75rem] rounded-xl border border-edge bg-input text-center text-[13px] leading-9 text-fg focus:border-accent focus:outline-none disabled:opacity-60'
export const filterSearchCls =
  'h-9 w-full rounded-xl border border-edge bg-input px-3 text-[13px] leading-9 text-fg placeholder:text-muted focus:border-accent focus:outline-none'
export const selectCls =
  'h-11 rounded-2xl border border-edge bg-input px-3 text-sm text-fg focus:border-accent focus:outline-none'
export const filterSelectCls =
  'h-9 rounded-xl border border-edge bg-input px-3 text-[13px] text-fg focus:border-accent focus:outline-none'
export const textareaCls =
  'w-full rounded-2xl border border-edge bg-input px-3.5 py-2.5 text-sm leading-relaxed text-fg placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-60'

export const cardCls = 'rounded-[16px] border border-edge-soft bg-card'
export const linkAccent = 'text-xs font-bold tracking-wide text-accent hover:text-accent-strong'

export function chipCls(active: boolean): string {
  return `h-8 shrink-0 rounded-full border px-3 text-xs font-bold transition-colors ${
    active ? 'border-accent/50 bg-accent-soft text-accent' : 'border-edge bg-transparent text-dim hover:text-fg'
  }`
}

export const thCls = 'h-11 px-3 text-left text-xs font-medium text-dim whitespace-nowrap'
export const tdCls = 'h-11 px-3 whitespace-nowrap'
export const trCls = 'border-b border-edge-soft last:border-b-0 hover:bg-card-hover'
