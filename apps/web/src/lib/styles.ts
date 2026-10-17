const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export const btnPrimary = `${btnBase} h-9 px-4 bg-accent text-on-accent hover:bg-accent-strong`
export const btnSecondary = `${btnBase} h-9 px-4 border border-edge bg-card text-fg hover:bg-card-hover`
export const btnDanger = `${btnBase} h-9 px-4 bg-danger-soft text-danger hover:bg-danger hover:text-fg`
export const btnGhost = `${btnBase} h-9 px-3 text-dim hover:bg-card-hover hover:text-fg`

export const btnSmPrimary = `${btnBase} h-7 px-2.5 text-xs bg-accent text-on-accent hover:bg-accent-strong`
export const btnSmSecondary = `${btnBase} h-7 px-2.5 text-xs border border-edge bg-card text-fg hover:bg-card-hover`
export const btnSmDanger = `${btnBase} h-7 px-2.5 text-xs bg-danger-soft text-danger hover:bg-danger hover:text-fg`
export const btnSmGold = `${btnBase} h-7 px-2.5 text-xs bg-gold-soft text-gold hover:bg-gold hover:text-on-accent`

export const inputCls =
  'h-9 w-full rounded-lg border border-edge bg-input px-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-60'
export const selectCls =
  'h-9 rounded-lg border border-edge bg-input px-3 text-sm text-fg focus:border-accent focus:outline-none'
export const textareaCls =
  'w-full rounded-lg border border-edge bg-input px-3 py-2 text-sm leading-relaxed text-fg placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-60'

export const cardCls = 'rounded-xl border border-edge bg-card'
export const linkAccent = 'text-xs font-semibold text-accent hover:text-accent-strong'

export const thCls = 'h-10 px-3 text-left text-xs font-medium text-dim whitespace-nowrap'
export const tdCls = 'h-10 px-3 whitespace-nowrap'
export const trCls = 'border-b border-edge-soft last:border-b-0 hover:bg-card-hover'
