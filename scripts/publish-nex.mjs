import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const source = path.join(root, '넥스복사')
const outDir = path.join(root, 'apps', 'web', 'public', 'nex')

const pages = [
  ['대시보드.html', '대시보드_files', 'dashboard.html', 'dashboard_files'],
  ['정산 통계.html', '정산 통계_files', 'finance.html', 'finance_files'],
  ['리스크 모니터링.html', '리스크 모니터링_files', 'risk.html', 'risk_files'],
  ['정산 전 검수.html', '정산 전 검수_files', 'review.html', 'review_files'],
  ['머니내역.html', '머니내역_files', 'transactions.html', 'transactions_files'],
  ['입출금관리.html', '입출금관리_files', 'cash.html', 'cash_files'],
  ['회원게시글 관리.html', '회원게시글 관리_files', 'board.html', 'board_files'],
  ['총판관리.html', '총판관리_files', 'dist.html', 'dist_files'],
  ['카지노내역.html', '카지노내역_files', 'casino-points.html', 'casino_points_files'],
  ['환경설정.html', '환경설정_files', 'settings.html', 'settings_files'],
  ['고객문의.html', '고객문의_files', 'support.html', 'support_files'],
  ['슬롯게임.html', '슬롯게임_files', 'casino-mini.html', 'casino_mini_files'],
  ['전체경기.html', '전체경기_files', 'casino-live.html', 'casino_live_files'],
]

const historyMenu = `<div data-submenu><a class="flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-bold transition-colors pl-9 pr-3 text-dim hover:text-fg hover:bg-card" href="https://demo.nex-game.com/admin/transactions">머니 내역</a><a class="flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-bold transition-colors pl-9 pr-3 text-dim hover:text-fg hover:bg-card" href="https://demo.nex-game.com/admin/points">포인트 내역</a><a class="flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-bold transition-colors pl-9 pr-3 text-dim hover:text-fg hover:bg-card" href="https://demo.nex-game.com/admin/casino">카지노 내역</a><a class="flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-bold transition-colors pl-9 pr-3 text-dim hover:text-fg hover:bg-card" href="https://demo.nex-game.com/admin/casino-points">카지노 내역(포인트)</a><a class="flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-bold transition-colors pl-9 pr-3 text-dim hover:text-fg hover:bg-card" href="https://demo.nex-game.com/admin/logs">활동 로그</a><a class="flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-bold transition-colors pl-9 pr-3 text-dim hover:text-fg hover:bg-card" href="https://demo.nex-game.com/admin/settle-audit">정산 대조 점검</a></div>`

const settingsMenu = `<div data-submenu><a class="flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-bold transition-colors pl-9 pr-3 text-dim hover:text-fg hover:bg-card" href="https://demo.nex-game.com/admin/wallet">USDT 설정</a><a class="flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-bold transition-colors pl-9 pr-3 text-dim hover:text-fg hover:bg-card" href="https://demo.nex-game.com/admin/banners">팝업/배너 설정</a><a class="flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-bold transition-colors pl-9 pr-3 text-dim hover:text-fg hover:bg-card" href="https://demo.nex-game.com/admin/settings">환경설정</a></div>`

const routes = [
  ['https://demo.nex-game.com/admin/board-moderation', '/nex/board.html'],
  ['https://demo.nex-game.com/admin/casino-points', '/nex/casino-points.html'],
  ['https://demo.nex-game.com/admin/settle-audit', '/nex/settle-audit.html'],
  ['https://demo.nex-game.com/admin/transactions', '/nex/transactions.html'],
  ['https://demo.nex-game.com/admin/blacklist', '/nex/blacklist.html'],
  ['https://demo.nex-game.com/admin/inquiries', '/nex/inquiries.html'],
  ['https://demo.nex-game.com/admin/finance', '/nex/finance.html'],
  ['https://demo.nex-game.com/admin/matches', '/nex/matches.html'],
  ['https://demo.nex-game.com/admin/banners', '/nex/banners.html'],
  ['https://demo.nex-game.com/admin/settings', '/nex/settings.html'],
  ['https://demo.nex-game.com/admin/review', '/nex/review.html'],
  ['https://demo.nex-game.com/admin/wallet', '/nex/wallet.html'],
  ['https://demo.nex-game.com/admin/points', '/nex/points.html'],
  ['https://demo.nex-game.com/admin/casino', '/nex/casino.html'],
  ['https://demo.nex-game.com/admin/users/3', '/nex/users.html'],
  ['https://demo.nex-game.com/admin/users', '/nex/users.html'],
  ['https://demo.nex-game.com/admin/bets?status=pending', '/nex/bets.html'],
  ['https://demo.nex-game.com/admin/bets', '/nex/bets.html'],
  ['https://demo.nex-game.com/admin/logs', '/nex/logs.html'],
  ['https://demo.nex-game.com/admin/risk', '/nex/risk.html'],
  ['https://demo.nex-game.com/admin/cash', '/nex/cash.html'],
  ['https://demo.nex-game.com/admin/dist', '/nex/dist.html'],
  ['https://demo.nex-game.com/admin', '/nex/dashboard.html'],
  ['https://demo.nex-game.com/casino?cat=live', '/nex/casino-live.html'],
  ['https://demo.nex-game.com/casino?cat=slots', '/nex/casino-slots.html'],
  ['https://demo.nex-game.com/casino?cat=mini', '/nex/casino-mini.html'],
  ['https://demo.nex-game.com/my-bets', '/nex/my-bets.html'],
  ['https://demo.nex-game.com/support', '/nex/support.html'],
  ['https://demo.nex-game.com/account', '/nex/account.html'],
  ['https://demo.nex-game.com/messages', '/nex/messages.html'],
  ['https://demo.nex-game.com/board/1', '/nex/board-1.html'],
  ['https://demo.nex-game.com/board/2', '/nex/board-2.html'],
  ['https://demo.nex-game.com/board/3', '/nex/board-3.html'],
  ['https://demo.nex-game.com/live', '/nex/live.html'],
  ['https://demo.nex-game.com/cash', '/nex/user-cash.html'],
  ['https://demo.nex-game.com/all', '/nex/all.html'],
  ['https://demo.nex-game.com/', '/nex/home.html'],
]

const behavior = `<script>
document.querySelectorAll('nav button[aria-expanded]').forEach((btn) => {
  const panel = btn.nextElementSibling
  if (!panel || !panel.dataset || panel.dataset.submenu === undefined) return
  const sync = () => {
    const open = btn.getAttribute('aria-expanded') === 'true'
    panel.hidden = !open
    const icon = btn.querySelector('svg.ml-auto')
    if (icon) icon.classList.toggle('rotate-90', open)
  }
  sync()
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true'
    btn.setAttribute('aria-expanded', open ? 'false' : 'true')
    sync()
  })
})
document.querySelectorAll('[role="group"]').forEach((group) => {
  const buttons = [...group.querySelectorAll('button[aria-pressed]')]
  if (buttons.length < 2) return
  const onClass = buttons.find((button) => button.getAttribute('aria-pressed') === 'true')?.className
  const offClass = buttons.find((button) => button.getAttribute('aria-pressed') === 'false')?.className
  if (!onClass || !offClass) return
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((item) => {
        const selected = item === button
        item.setAttribute('aria-pressed', selected ? 'true' : 'false')
        item.className = selected ? onClass : offClass
      })
    })
  })
})
document.querySelectorAll('main').forEach((main) => {
  main.addEventListener('click', (event) => {
    const button = event.target.closest('button')
    if (!button || !main.contains(button)) return
    const group = button.parentElement
    if (!group) return
    const buttons = [...group.children].filter((node) => node.tagName === 'BUTTON')
    if (buttons.length < 2) return
    const on = buttons.find((node) => node.className.includes('bg-accent'))
    const off = buttons.find((node) => !node.className.includes('bg-accent'))
    if (!on || !off || on.className === off.className) return
    buttons.forEach((node) => {
      node.className = node === button ? on.className : off.className
    })
  })
})
</script>`

function insertMenu(html, label, menu, already) {
  if (html.includes(already)) return html
  const token = `>${label}<svg`
  const at = html.indexOf(token)
  if (at < 0) return html
  const end = html.indexOf('</button>', at)
  if (end < 0) return html
  return html.slice(0, end + 9) + menu + html.slice(end + 9)
}

function rewrite(html) {
  let next = html
  for (const [from, to] of routes) next = next.split(from).join(to)
  next = next.replace(/<script\s+src="[^"]*"[^>]*>\s*<\/script>/g, '')
  next = next.replace(/<link[^>]+as="script"[^>]*>/g, '')
  if (!next.includes('data-nex-behavior')) {
    next = next.replace(
      '</body>',
      behavior.replace('<script>', '<script data-nex-behavior>') + '<script src="/nex/nex-behavior.js?v=140"></script></body>',
    )
  }
  return next
}

function replaceMain(html, inner) {
  const start = html.indexOf('<main')
  const open = html.indexOf('>', start)
  const end = html.lastIndexOf('</main>')
  if (start < 0 || end < 0) return html
  return html.slice(0, open + 1) + inner + html.slice(end)
}

function activate(html, href) {
  let next = html
    .replace('px-3 bg-accent-soft text-accent" href="/nex/dashboard.html"', 'px-3 text-dim hover:text-fg hover:bg-card" href="/nex/dashboard.html"')
    .replace('pl-9 pr-3 bg-accent-soft text-accent"', 'pl-9 pr-3 text-dim hover:text-fg hover:bg-card"')
  next = next.replace(
    `text-dim hover:text-fg hover:bg-card" href="${href}"`,
    `bg-accent-soft text-accent" href="${href}"`,
  )
  return next
}

function placeholder(title) {
  return `<div class="space-y-4"><section class="bg-card border border-edge rounded-xl overflow-hidden"><div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-edge-soft"><h2 class="text-sm font-bold text-fg">${title}</h2></div><div class="px-4 py-10 text-center text-sm text-dim">이 화면은 저장된 원본에 없습니다.</div></section></div>`
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

for (const [file, assetDir, outFile, outAsset] of pages) {
  const assetFrom = path.join(source, assetDir)
  const assetTo = path.join(outDir, outAsset)
  if (fs.existsSync(assetFrom)) fs.cpSync(assetFrom, assetTo, { recursive: true })
  let html = fs.readFileSync(path.join(source, file), 'utf8')
  html = html.split(`./${assetDir}/`).join(`./${outAsset}/`)
  html = insertMenu(html, '내역', historyMenu, '/admin/transactions')
  html = insertMenu(html, '설정', settingsMenu, '/admin/wallet')
  html = rewrite(html)
  fs.writeFileSync(path.join(outDir, outFile), html)
}

const dashboard = fs.readFileSync(path.join(outDir, 'dashboard.html'), 'utf8')
const adminMissing = [
  ['matches.html', '경기 관리', '/nex/matches.html'],
  ['bets.html', '스포츠베팅 내역', '/nex/bets.html'],
  ['inquiries.html', '1:1 문의 관리', '/nex/inquiries.html'],
  ['users.html', '회원 관리', '/nex/users.html'],
  ['blacklist.html', '블랙리스트', '/nex/blacklist.html'],
  ['points.html', '포인트 내역', '/nex/points.html'],
  ['casino.html', '카지노 내역', '/nex/casino.html'],
  ['logs.html', '활동 로그', '/nex/logs.html'],
  ['settle-audit.html', '정산 대조 점검', '/nex/settle-audit.html'],
  ['wallet.html', 'USDT 설정', '/nex/wallet.html'],
  ['banners.html', '팝업/배너 설정', '/nex/banners.html'],
]
for (const [file, title, href] of adminMissing) {
  let html = activate(dashboard, href)
  html = html.replace('>대시보드</span>', `>${title}</span>`)
  html = replaceMain(html, placeholder(title))
  fs.writeFileSync(path.join(outDir, file), html)
}

const userShell = fs.readFileSync(path.join(outDir, 'casino-live.html'), 'utf8')
const userMissing = [
  ['home.html', '홈', '/nex/home.html'],
  ['live.html', '라이브', '/nex/live.html'],
  ['my-bets.html', '베팅 내역', '/nex/my-bets.html'],
  ['board-1.html', '공지사항', '/nex/board-1.html'],
  ['board-2.html', '이벤트 게시판', '/nex/board-2.html'],
  ['board-3.html', '자유게시판', '/nex/board-3.html'],
  ['account.html', '내 정보', '/nex/account.html'],
  ['user-cash.html', '입출금', '/nex/user-cash.html'],
  ['messages.html', '쪽지함', '/nex/messages.html'],
  ['all.html', '전체 경기', '/nex/all.html'],
  ['casino-slots.html', '슬롯', '/nex/casino-slots.html'],
]
for (const [file, title, href] of userMissing) {
  let html = activate(userShell, href)
  html = replaceMain(html, placeholder(title))
  fs.writeFileSync(path.join(outDir, file), html)
}

console.log('published', fs.readdirSync(outDir).filter((name) => name.endsWith('.html')).length, 'pages')
