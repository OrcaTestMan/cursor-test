const STORE_KEY = 'nex-demo-state-v1'
const TEST_MARK = ' (t)'

function testTag(text) {
  const value = String(text ?? '')
  if (!value) return value
  if (/\s*\(t\)\s*$/.test(value)) return value.replace(/\s*\(t\)\s*$/, TEST_MARK)
  return value + TEST_MARK
}

const STATUS_CLASS = {
  승인: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-accent-soft text-accent',
  거절: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-danger-soft text-danger',
  대기: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-gold-soft text-gold',
  '지급 실패': 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-danger-soft text-danger',
  '진행 중': 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-info/15 text-info',
  적중: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-accent-soft text-accent',
  미적중: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-danger-soft text-danger',
  예정: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-card-hover text-dim',
  라이브: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-danger-soft text-danger',
  종료: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-card-hover text-dim',
}

const GAMES = {
  live: ['에볼루션', '프라그마틱 라이브', '마이크로게이밍', '아시아게이밍', '드림게이밍', '섹시게이밍'],
  slots: ['프라그마틱', '하바네로', '플레이앤고', '넷엔트', '부운고', '노리밋시티'],
  mini: ['파워볼', '스피드키노', '사다리', '바카라', '주사위', '그래프'],
}

const REAL_GAMES = [
  { league: 'MLB ALCS', when: '10/19 06:08', name: '탬파베이 레이스 vs 클리블랜드 가디언스', score: '경기 전', note: '5차전 · 원정 탬파베이 · 시리즈 2승 2패', status: '예정', picks: [['탬파베이', '1.96'], ['클리블랜드', '1.86']] },
  { league: 'MLB ALCS', when: '10/20 09:08', name: '클리블랜드 가디언스 vs 탬파베이 레이스', score: '경기 전', note: '6차전 · 한국시간 · 5차전 뒤 진행', status: '예정', picks: [['클리블랜드', '1.91'], ['탬파베이', '1.91']] },
  { league: 'KBO 준플레이오프', when: '10/20', name: 'KIA 타이거즈 vs LG 트윈스', score: '경기 전', note: '3차전 · KIA 2승', status: '예정', picks: [['KIA', '1.72'], ['LG', '2.15']] },
  { league: 'KBO 준플레이오프', when: '10/18 14:00', name: 'LG 트윈스 vs KIA 타이거즈', score: '3 : 6', note: '2차전 · 광주 · 종료', status: '종료' },
  { league: 'KBO 준플레이오프', when: '10/17 14:00', name: 'LG 트윈스 vs KIA 타이거즈', score: '1 : 5', note: '1차전 · 종료', status: '종료' },
  { league: 'KBO 와일드카드', when: '10/14 18:30', name: '두산 베어스 vs LG 트윈스', score: '1 : 4', note: '1차전 · LG 진출', status: '종료' },
  { league: 'MLB ALCS', when: '10/17', name: '탬파베이 레이스 vs 클리블랜드 가디언스', score: '7 : 3', note: '4차전 · 시리즈 동률', status: '종료' },
  { league: 'MLB NLCS', when: '10/15', name: '밀워키 브루어스 vs LA 다저스', score: '6 : 4', note: '4차전 · 밀워키 4승으로 시리즈 종료', status: '종료' },
]

const MATCHES = [
  ['호주 NSW NPL', '시드니 올림픽 vs 시드니 유나이티드 58', 3, 25000],
  ['호주 NSW NPL', '맨리 유나이티드 vs NWS 스피릿', 3, 25000],
  ['MLB', '샌디에이고 파드리스 vs 워싱턴 내셔널스', 1, 10000],
  ['MLB', '밀워키 브루어스 vs 시카고 컵스', 2, 30000],
  ['MLB', '디트로이트 타이거스 vs 미네소타 트윈스', 2, 17000],
  ['EPL (t)', '맨체스터 시티 vs 아스널 (t)', 2, 26000],
  ['NBA (t)', '보스턴 셀틱스 vs 뉴욕 닉스 (t)', 1, 12000],
  ['NBA (t)', 'LA 레이커스 vs 골든스테이트 (t)', 1, 8000],
  ['EPL (t)', '토트넘 vs 첼시 (t)', 1, 9000],
]

const BETS = [
  ['test', '테스트유저 (t)', '밀워키 브루어스 vs 시카고 컵스', 10000, '4.127', 42504, '진행 중'],
  ['test', '테스트유저 (t)', '디트로이트 타이거스 vs 미네소타 트윈스', 10000, '9.024', 92943, '진행 중'],
  ['test', '테스트유저 (t)', '시드니 올림픽 vs 시드니 유나이티드 58', 10000, '10.088', 100879, '미적중'],
  ['test', '테스트유저 (t)', '시드니 올림픽 vs 시드니 유나이티드 58', 5000, '12.774', 66424, '적중'],
  ['test123', '테스트용 (t)', '맨체스터 시티 vs 아스널 (t)', 15000, '2.150', 32250, '진행 중'],
  ['user03', '회원03 (t)', '보스턴 셀틱스 vs 뉴욕 닉스 (t)', 12000, '1.900', 22800, '진행 중'],
  ['user05', '회원05 (t)', 'LA 레이커스 vs 골든스테이트 (t)', 8000, '1.850', 14800, '진행 중'],
  ['test', '테스트유저 (t)', '토트넘 vs 첼시 (t)', 9000, '3.200', 28800, '진행 중'],
  ['user03', '회원03 (t)', '밀워키 브루어스 vs 시카고 컵스', 20000, '1.750', 35000, '진행 중'],
  ['test123', '테스트용 (t)', '디트로이트 타이거스 vs 미네소타 트윈스', 7000, '2.450', 17150, '진행 중'],
  ['user05', '회원05 (t)', '맨체스터 시티 vs 아스널 (t)', 11000, '1.950', 21450, '진행 중'],
]

const BET_MARKETS = {
  '4.127': { market: '승무패', line: '승', when: '일반' },
  '9.024': { market: '핸디캡', line: '-1.5', when: '실시간' },
  '10.088': { market: '언더오버', line: '2.5', when: '일반' },
  '12.774': { market: '승무패', line: '무', when: '실시간' },
  '2.150': { market: '핸디캡', line: '-0.5', when: '실시간' },
  '1.900': { market: '언더오버', line: '215.5', when: '일반' },
  '1.850': { market: '핸디캡', line: '+3.5', when: '실시간' },
  '3.200': { market: '승무패', line: '무', when: '일반' },
  '1.750': { market: '승무패', line: '승', when: '일반' },
  '2.450': { market: '언더오버', line: '8.5', when: '일반' },
  '1.950': { market: '승무패', line: '승', when: '실시간' },
}

const BASE_USERS = {
  test: { nick: '테스트유저 (t)', money: 66924, points: 0, blocked: false },
  test123: { nick: '테스트용 (t)', money: 10000, points: 0, blocked: false },
  user03: { nick: '회원03 (t)', money: 18500, points: 200, blocked: false },
  user04: { nick: '회원04 (t)', money: 12400, points: 0, blocked: true, blockReason: '중복 계정 (t)' },
  user05: { nick: '회원05 (t)', money: 8600, points: 50, blocked: false },
}

const CAPTURED_CASH = {
  9: { login: 'test123', type: '입금', amount: 10000, status: '승인' },
  8: { login: 'test', type: '출금', amount: 20000, status: '지급 실패' },
  7: { login: 'test', type: '출금', amount: 20000, status: '지급 실패' },
  6: { login: 'test', type: '출금', amount: 20000, status: '지급 실패' },
  5: { login: 'test', type: '입금', amount: 20000, status: '거절' },
  4: { login: 'test', type: '입금', amount: 10000, status: '승인' },
  3: { login: 'test', type: '입금', amount: 10000, status: '거절' },
  2: { login: 'test', type: '입금', amount: 10000, status: '거절' },
  1: { login: 'admin', type: '입금', amount: 10000, status: '거절' },
}

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

function cashEffect(type, status, amount) {
  if (status !== '승인') return 0
  return type === '출금' ? -Number(amount) : Number(amount)
}

function paidWin(status, win) {
  return status === '적중' ? win : 0
}

function deriveUsers(data) {
  const saved = data.users || {}
  const users = {}
  Object.entries(BASE_USERS).forEach(([login, base]) => {
    const current = saved[login] || {}
    users[login] = {
      nick: testTag(current.nick || base.nick),
      blocked: current.blocked != null ? Boolean(current.blocked) : Boolean(base.blocked),
      blockReason: testTag(current.blockReason || base.blockReason || '') || '',
      money: base.money,
      points: base.points,
    }
  })
  Object.entries(saved).forEach(([login, current]) => {
    if (!users[login]) users[login] = { nick: current.nick || login, blocked: Boolean(current.blocked), blockReason: current.blockReason || '', money: 0, points: 0 }
  })
  Object.entries(CAPTURED_CASH).forEach(([id, row]) => {
    const status = data.cashStatus[id] || row.status
    const delta = cashEffect(row.type, status, row.amount) - cashEffect(row.type, row.status, row.amount)
    if (users[row.login]) users[row.login].money += delta
  })
  data.cashExtra.forEach((item) => {
    if (users[item.login]) users[item.login].money += cashEffect(item.type, item.status, item.amount)
  })
  BETS.forEach((bet, index) => {
    const current = data.betStatus[index] || bet[6]
    const delta = paidWin(current, bet[5]) - paidWin(bet[6], bet[5])
    if (users[bet[0]]) users[bet[0]].money += delta
  })
  ;(data.pointMoves || []).forEach((move) => {
    if (users[move.login]) users[move.login].points += Number(move.amount)
  })
  ;(data.placedBets || []).forEach((bet) => {
    const user = users[bet.login]
    if (!user) return
    user.money -= Number(bet.stake)
    if (bet.status === '적중') user.money += Math.round(Number(bet.stake) * Number(bet.odds))
  })
  data.users = users
}

function store() {
  const data = loadStore()
  const storedUsers = data.users
  data.users ||= structuredClone(BASE_USERS)
  data.cashStatus ||= {}
  data.cashExtra ||= []
  data.inquiries ||= []
  data.messages ||= []
  data.logs ||= []
  data.settings ||= {}
  data.banners ||= []
  data.wallet ||= { address: '', note: '' }
  data.matchStatus ||= {}
  data.betStatus ||= {}
  data.betSettledAt ||= {}
  data.adjustedAt ||= {}
  data.boardHidden ||= []
  data.placedBets ||= []
  data.slip ||= []
  data.casinoVisits ||= []
  data.casinoBets ||= []
  data.distSettles ||= []
  if (data.distBalance == null && !Array.isArray(data.distSettles)) data.distBalance = 48200
  data.boardPosts ||= [
    { board: '1', title: '준플레이오프 안내 (t)', body: '10월 20일 KIA 대 LG 3차전 일정이 잡혀 있습니다. 시작 시각은 아직 비어 있습니다. (t)' },
    { board: '2', title: '입금 반영 안내 (t)', body: '승인된 입금은 회원 머니와 머니 내역에 같이 반영됩니다. (t)' },
    { board: '3', title: '광주 2차전 (t)', body: 'LG 3:6 KIA로 끝났고, 시리즈는 KIA가 2승입니다. (t)' },
  ]
  data.nextId ||= 100
  let migrated = false
  if (!Array.isArray(data.pointMoves)) {
    data.pointMoves = []
    Object.entries(BASE_USERS).forEach(([login, base]) => {
      const had = storedUsers?.[login]?.points
      if (typeof had === 'number' && had !== base.points) data.pointMoves.push({ login, amount: had - base.points, at: '', reason: '지급' })
    })
    migrated = true
  }
  if (data.testMarkApplied !== 1) {
    const now = stamp()
    data.boardPosts = (data.boardPosts || []).map((post) => ({
      ...post,
      title: testTag(post.title),
      body: testTag(post.body),
    }))
    if (!data.inquiries.length) {
      data.inquiries = [
        { id: 't-inq-1', title: '입금 미반영 문의 (t)', body: '오전에 입금했는데 아직 안 들어왔습니다. (t)', status: '대기', answer: '' },
        { id: 't-inq-2', title: '출금 지연 문의 (t)', body: '출금 심사 상태입니다. (t)', status: '답변', answer: '심사 후 지급 예정입니다. (t)' },
      ]
    } else {
      data.inquiries = data.inquiries.map((item) => ({
        ...item,
        title: testTag(item.title),
        body: testTag(item.body),
        answer: item.answer ? testTag(item.answer) : item.answer,
      }))
    }
    if (!data.banners.length) {
      data.banners = [
        { title: '첫 입금 이벤트 (t)', on: true },
        { title: '주말 보너스 (t)', on: false },
      ]
    } else {
      data.banners = data.banners.map((item) => ({ ...item, title: testTag(item.title) }))
    }
    if (!data.messages.length) {
      data.messages = [
        { title: '입금 안내 (t)', body: '최소 입금은 1만원입니다. (t)', read: false, at: now },
        { title: '이벤트 공지 (t)', body: '주말 보너스가 진행 중입니다. (t)', read: true, at: now },
      ]
    } else {
      data.messages = data.messages.map((item) => ({ ...item, title: testTag(item.title), body: testTag(item.body) }))
    }
    if (!data.logs.length) {
      data.logs = [
        { at: now, text: '테스트 관리자 로그인 (t)' },
        { at: now, text: '테스트 입금 승인 처리 (t)' },
        { at: now, text: '테스트 배너 노출 변경 (t)' },
      ]
    } else {
      data.logs = data.logs.map((item) => ({ ...item, text: testTag(item.text) }))
    }
    if (!data.pointMoves.length) {
      data.pointMoves = [
        { login: 'test', amount: 1000, at: now, reason: '지급' },
        { login: 'test123', amount: 500, at: now, reason: '지급' },
        { login: 'user05', amount: 50, at: now, reason: '지급' },
      ]
    }
    if (!data.cashExtra.length) {
      data.cashExtra = [
        { id: 't-cash-1', login: 'test', nick: '테스트유저 (t)', type: '입금', amount: 50000, status: '승인', memo: '계좌이체 (t)', requestedAt: now, processedAt: now },
        { id: 't-cash-2', login: 'test123', nick: '테스트용 (t)', type: '출금', amount: 20000, status: '대기', memo: 'USDT (t)', requestedAt: now },
        { id: 't-cash-3', login: 'user03', nick: '회원03 (t)', type: '입금', amount: 30000, status: '승인', memo: 'P2P (t)', requestedAt: now, processedAt: now },
      ]
    } else {
      data.cashExtra = data.cashExtra.map((item) => ({
        ...item,
        nick: item.nick ? testTag(item.nick) : item.nick,
        memo: item.memo ? testTag(item.memo) : item.memo,
      }))
    }
    if (!data.casinoVisits.length) {
      data.casinoVisits = [
        { name: '에볼루션 (t)', at: now },
        { name: '프라그마틱 (t)', at: now },
        { name: '파워볼 (t)', at: now },
      ]
    } else {
      data.casinoVisits = data.casinoVisits.map((item) => ({ ...item, name: testTag(item.name) }))
    }
    if (!data.casinoBets.length) {
      data.casinoBets = [
        { login: 'test', nick: '테스트유저 (t)', status: '적중', stake: 10000, payout: 19500, name: '에볼루션 바카라 (t)' },
        { login: 'test123', nick: '테스트용 (t)', status: '미적중', stake: 5000, payout: 0, name: '프라그마틱 슬롯 (t)' },
        { login: 'test', nick: '테스트유저 (t)', status: '진행 중', stake: 8000, payout: 16000, name: '파워볼 (t)' },
        { login: 'user03', nick: '회원03 (t)', status: '진행 중', stake: 12000, payout: 24000, name: '에볼루션 바카라 (t)' },
        { login: 'user05', nick: '회원05 (t)', status: '진행 중', stake: 5000, payout: 9500, name: '프라그마틱 슬롯 (t)' },
      ]
    }
    if (!data.distSettles.length) {
      data.distSettles = [
        { when: now, accrued: 12000, balance: 48200, line: 'A라인 (t)' },
        { when: now, accrued: 8000, balance: 36000, line: 'B라인 (t)' },
      ]
      if (data.distBalance == null) data.distBalance = 48200
    }
    data.testMarkApplied = 1
    migrated = true
  }
  if (data.riskSeedApplied !== 1) {
    data.matchStatus['맨체스터 시티 vs 아스널 (t)'] = '라이브'
    data.riskSeedApplied = 1
    migrated = true
  }
  if (data.casinoMemberSeed !== 1) {
    if (!(data.casinoBets || []).every((bet) => bet.login)) {
      data.casinoBets = [
        { login: 'test', nick: '테스트유저 (t)', status: '적중', stake: 10000, payout: 19500, name: '에볼루션 바카라 (t)' },
        { login: 'test123', nick: '테스트용 (t)', status: '미적중', stake: 5000, payout: 0, name: '프라그마틱 슬롯 (t)' },
        { login: 'test', nick: '테스트유저 (t)', status: '진행 중', stake: 8000, payout: 16000, name: '파워볼 (t)' },
        { login: 'user03', nick: '회원03 (t)', status: '진행 중', stake: 12000, payout: 24000, name: '에볼루션 바카라 (t)' },
        { login: 'user05', nick: '회원05 (t)', status: '진행 중', stake: 5000, payout: 9500, name: '프라그마틱 슬롯 (t)' },
      ]
    }
    data.casinoMemberSeed = 1
    migrated = true
  }
  deriveUsers(data)
  Object.keys(data.betStatus).forEach((id) => {
    if (!data.betSettledAt[id]) {
      data.betSettledAt[id] = stamp()
      migrated = true
    }
  })
  Object.keys(data.cashStatus).forEach((id) => {
    if (!data.adjustedAt[id]) {
      data.adjustedAt[id] = stamp()
      migrated = true
    }
  })
  if (migrated) saveStore(data)
  return data
}

function commit(data) {
  saveStore(data)
}

function toast(message) {
  let node = document.querySelector('[data-nex-toast]')
  if (!node) {
    node = document.createElement('div')
    node.dataset.nexToast = '1'
    node.className = 'fixed bottom-5 right-5 z-[80] rounded-lg border border-edge bg-card px-4 py-3 text-sm font-bold text-fg shadow-card'
    document.body.appendChild(node)
  }
  node.textContent = message
  node.hidden = false
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => {
    node.hidden = true
  }, 1800)
}

function logAction(data, text) {
  const now = new Date()
  const stamp = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  data.logs.unshift({ at: stamp, text })
  data.logs = data.logs.slice(0, 50)
}

function money(value) {
  const number = Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(number) ? number : 0
}

function labelOf(button) {
  const textNode = [...button.childNodes].find((node) => node.nodeType === 3 && node.textContent.trim())
  if (textNode) return textNode.textContent.trim()
  const text = button.innerText.split('\n')[0].trim()
  return text || button.getAttribute('aria-label') || ''
}

function selected(button) {
  return button.className.includes('bg-accent') || button.getAttribute('aria-pressed') === 'true'
}

function parseDate(text) {
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const short = text.match(/(\d{1,2})[-/](\d{1,2})/)
  if (!short) return null
  const now = new Date()
  return new Date(now.getFullYear(), Number(short[1]) - 1, Number(short[2]))
}

function inPeriod(date, label) {
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  const diff = (today - day) / 86400000
  if (label === '오늘') return diff === 0
  if (label === '금월') return day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear()
  if (label === '전월') {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return day.getMonth() === prev.getMonth() && day.getFullYear() === prev.getFullYear()
  }
  const days = Number(label.replace('일', ''))
  if (!days) return true
  return diff >= 0 && diff < days
}

function controlsFor(table) {
  const main = table.closest('main')
  if (!main) return []
  const tables = [...main.querySelectorAll('table')]
  const previous = tables[tables.indexOf(table) - 1]
  return [...main.querySelectorAll('button, input, select')].filter((node) => {
    if (table.contains(node) || node.closest('thead')) return false
    const afterPrevious = !previous || Boolean(previous.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)
    const beforeTable = Boolean(node.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING)
    return afterPrevious && beforeTable
  })
}

function rowAmount(row) {
  const cells = [...row.cells].map((cell) => cell.innerText.replace(/\s+/g, ''))
  const pure = cells.find((text) => /^[+-]?[\d,]+$/.test(text))
  if (pure) return Math.abs(money(pure))
  const signed = cells.find((text) => /[+-][\d,]+/.test(text))
  return signed ? Math.abs(money(signed.match(/[+-][\d,]+/)[0])) : 0
}

function applyTable(table, page = 0) {
  const body = table.tBodies[0]
  if (!body) return
  if (table.closest('[data-settle-ledger]')) {
    ;[...body.rows].forEach((row) => { row.hidden = Boolean(row.dataset.empty) })
    return
  }
  const controls = controlsFor(table)
  const labels = controls
    .filter((node) => node.tagName === 'BUTTON' && selected(node))
    .map(labelOf)
    .filter((label) => label && !['전체', '전부', '전체 유형', '종류 전체'].includes(label))
  const search = controls
    .filter((node) => node.tagName === 'INPUT' && node.type !== 'number')
    .map((node) => node.value.trim().toLowerCase())
    .filter(Boolean)
  const minInput = controls.find((node) => node.tagName === 'INPUT' && node.placeholder === '최소')
  const maxInput = controls.find((node) => node.tagName === 'INPUT' && node.placeholder === '최대')
  const min = minInput && minInput.value !== '' ? Number(minInput.value) : null
  const max = maxInput && maxInput.value !== '' ? Number(maxInput.value) : null
  const dateInputs = controls.filter((node) => node.tagName === 'INPUT' && node.type === 'date')
  const rangeStart = dateInputs[0]?.value ? parseDate(dateInputs[0].value) : null
  const rangeEnd = dateInputs[1]?.value ? parseDate(dateInputs[1].value) : null
  if (rangeEnd) rangeEnd.setHours(23, 59, 59, 999)
  const sort = controls.find((node) => node.tagName === 'SELECT' && /순/.test(node.selectedOptions[0]?.textContent || ''))
  const sizeSelect = controls.find((node) => node.tagName === 'SELECT' && /개씩/.test(node.selectedOptions[0]?.textContent || ''))
  const pageSize = sizeSelect ? Number(sizeSelect.selectedOptions[0].textContent) || 30 : 100
  let rows = [...body.rows].filter((row) => !row.dataset.empty)
  if (sort) {
    const mode = sort.selectedOptions[0].textContent
    rows.sort((a, b) => {
      if (mode.includes('금액 높은')) return rowAmount(b) - rowAmount(a)
      if (mode.includes('금액 낮은')) return rowAmount(a) - rowAmount(b)
      const order = (row) => row.dataset.linkedAt ? Number(row.dataset.linkedAt) : 1000000000 - row.rowIndex
      if (mode.includes('오래')) return order(a) - order(b)
      return order(b) - order(a)
    })
    rows.forEach((row) => body.appendChild(row))
  }
  const matched = rows.filter((row) => {
    const text = row.innerText.replace(/\s+/g, ' ')
    if (search.some((query) => !text.toLowerCase().includes(query))) return false
    const amount = rowAmount(row)
    if (min !== null && amount < min) return false
    if (max !== null && amount > max) return false
    if (rangeStart || rangeEnd) {
      const date = parseDate(text)
      if (!date) return false
      if (rangeStart && date < rangeStart) return false
      if (rangeEnd && date > rangeEnd) return false
    }
    return labels.every((label) => {
      if (/오늘|금일|금월|전월|\d+일/.test(label)) {
        const date = parseDate(text)
        return inPeriod(date, label === '금일' ? '오늘' : label)
      }
      if (STATUSES.includes(label)) return statusOf(row) === label
      return text.includes(label)
    })
  })
  const start = page * pageSize
  const visible = new Set(matched.slice(start, start + pageSize))
  rows.forEach((row) => {
    row.hidden = !visible.has(row)
  })
  let empty = body.querySelector('[data-empty]')
  if (!matched.length) {
    if (!empty) {
      empty = document.createElement('tr')
      empty.dataset.empty = '1'
      const cell = document.createElement('td')
      cell.colSpan = body.rows[0]?.cells.length || 1
      cell.className = 'px-3 py-8 text-center text-sm text-dim'
      cell.textContent = '조건에 맞는 내역이 없습니다.'
      empty.appendChild(cell)
      body.appendChild(empty)
    }
    empty.hidden = false
  } else if (empty) empty.hidden = true
  table.dataset.page = String(page)
  table.dataset.pages = String(Math.max(1, Math.ceil(matched.length / pageSize)))
}

function num(value) {
  return Number(value).toLocaleString('ko-KR')
}

function countText(count, unit) {
  return `${Number(count || 0).toLocaleString('ko-KR')}${unit}`
}

function filledPeople(count) {
  const n = Number(count) || 0
  return countText(n === 0 ? 1000 : n, '명')
}

function filledMoney(amount) {
  const n = Number(amount) || 0
  return `${n === 0 ? '100,000,000' : num(n)}원`
}

function selectedPeriod() {
  const button = [...document.querySelectorAll('main button')].find((item) => selected(item) && /오늘|금일|금월|전월|\d+일/.test(labelOf(item)))
  if (!button) return ''
  const label = labelOf(button)
  return label === '금일' ? '오늘' : label
}

function happened(text, label) {
  const date = text ? parseDate(text) : new Date()
  if (!date) return false
  return inPeriod(date, label)
}

function sportRows(data) {
  const saved = BETS.map((bet, index) => ({
    status: data.betStatus[index] || bet[6],
    stake: Number(bet[3]),
    payout: Number(bet[5]),
  }))
  const placed = (data.placedBets || []).map((bet) => ({
    status: bet.status,
    stake: Number(bet.stake),
    payout: Math.round(Number(bet.stake) * Number(bet.odds)),
  }))
  return saved.concat(placed)
}

function casinoRows(data) {
  return (data.casinoBets || []).map((bet) => ({
    status: bet.status,
    stake: Number(bet.stake) || 0,
    payout: Number(bet.payout) || Math.round((Number(bet.stake) || 0) * (Number(bet.odds) || 0)),
  }))
}

function betSummary(rows) {
  const won = rows.filter((bet) => bet.status === '적중')
  const lost = rows.filter((bet) => bet.status === '미적중')
  const settledStake = won.concat(lost).reduce((sum, bet) => sum + bet.stake, 0)
  const winPay = won.reduce((sum, bet) => sum + bet.payout, 0)
  return {
    totalCount: rows.length,
    openCount: rows.filter((bet) => bet.status === '진행 중').length,
    doneCount: won.length + lost.length,
    totalStake: rows.reduce((sum, bet) => sum + bet.stake, 0),
    winPay,
    loseStake: lost.reduce((sum, bet) => sum + bet.stake, 0),
    profit: settledStake - winPay,
  }
}

function wonText(amount) {
  return `${Number(amount || 0).toLocaleString('ko-KR')}원`
}

function manText(amount) {
  const man = Number(amount || 0) / 10000
  return `${man.toLocaleString('ko-KR', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}만`
}

function pieceText(amount) {
  return `${Number(amount || 0).toLocaleString('ko-KR')}개`
}

function setLabelIn(root, label, value) {
  if (!root) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    if (node.textContent.trim() !== label) continue
    writeValue(node.parentElement?.nextElementSibling, value)
  }
}

function paintBetZone(tone, rows) {
  const section = document.querySelector(`[data-status-zones] [data-tone="${tone}"]`)
  if (!section) return
  const summary = betSummary(rows)
  setLabelIn(section, '총 배팅 건수', countText(summary.totalCount, '건'))
  setLabelIn(section, '정산 전 건수', countText(summary.openCount, '건'))
  setLabelIn(section, '정산 완료 건수', countText(summary.doneCount, '건'))
  setLabelIn(section, '총 배팅 금액', wonText(summary.totalStake))
  setLabelIn(section, '당첨 금액', wonText(summary.winPay))
  setLabelIn(section, '낙첨 금액', wonText(summary.loseStake))
  setLabelIn(section, '수익', wonText(summary.profit))
}

function paintWaitZone(tone, rows) {
  const section = document.querySelector(`[data-status-zones] [data-tone="${tone}"]`)
  if (!section) return
  const amount = rows.reduce((sum, item) => sum + Number(item.amount), 0)
  setLabelIn(section, '대기 건수', countText(rows.length, '건'))
  setLabelIn(section, '대기 금액', filledMoney(amount))
}

function paintDistZone(data) {
  const section = document.querySelector('[data-status-zones] [data-tone="dist"]')
  if (!section) return
  const rows = Array.isArray(data.distSettles) ? data.distSettles : []
  const accrued = rows.filter((row) => {
    const when = row.when || row.at
    return when && happened(when, '오늘')
  }).reduce((sum, row) => sum + Number(row.accrued ?? row.amount ?? 0), 0)
  const current = data.distBalance != null
    ? Number(data.distBalance)
    : rows.reduce((sum, row) => sum + Number(row.balance ?? row.current ?? 0), 0)
  setLabelIn(section, '지금 금액', wonText(current))
  setLabelIn(section, '적립 금액', wonText(accrued))
}

function paintFlowZone(tone, moves, useAbs) {
  const section = document.querySelector(`[data-status-zones] [data-tone="${tone}"]`)
  if (!section) return
  const people = new Set(moves.map((move) => move.login)).size
  const amount = moves.reduce((sum, move) => sum + (useAbs ? Math.abs(move.amount) : move.amount), 0)
  setLabelIn(section, '회원', filledPeople(people))
  setLabelIn(section, '건수', countText(moves.length, '건'))
  setLabelIn(section, '완료 금액', filledMoney(amount))
}

function waitingRows(data, type) {
  const extra = data.cashExtra.filter((item) => item.type === type && item.status === '대기')
  const captured = Object.entries(CAPTURED_CASH).filter(([id, row]) => row.type === type && (data.cashStatus[id] || row.status) === '대기').map(([, row]) => row)
  return extra.concat(captured)
}

function cashChannel(memo) {
  const text = String(memo || '')
  if (/USDT/i.test(text)) return 'USDT'
  if (/P2P/i.test(text)) return 'P2P'
  return '자체 처리'
}

function cashInQuery(when) {
  const fromValue = document.querySelector('[data-settle-from]')?.value
  const toValue = document.querySelector('[data-settle-to]')?.value
  const from = fromValue ? parseDate(fromValue) : null
  const to = toValue ? parseDate(toValue) : null
  const date = when ? parseDate(String(when)) : null
  if (from || to) {
    if (!date) return false
    if (from && date < from) return false
    if (to) {
      const end = new Date(to)
      end.setHours(23, 59, 59, 999)
      if (date > end) return false
    }
    return true
  }
  const label = selectedPeriod()
  if (!label) return true
  if (!date) return false
  return inPeriod(date, label)
}

function cashLines(data) {
  const lines = []
  ;(data.cashExtra || []).forEach((item) => {
    if (item.status !== '승인') return
    lines.push({
      type: item.type,
      amount: Number(item.amount) || 0,
      channel: cashChannel(item.memo),
      when: item.processedAt || item.requestedAt || '',
    })
  })
  Object.entries(CAPTURED_CASH).forEach(([id, row]) => {
    const status = data.cashStatus?.[id] || row.status
    if (status !== '승인') return
    lines.push({
      type: row.type,
      amount: Number(row.amount) || 0,
      channel: '자체 처리',
      when: data.adjustedAt?.[id] || '',
    })
  })
  return lines.filter((line) => cashInQuery(line.when))
}

function paintCashDetail() {
  const root = document.querySelector('[data-cash-detail]')
  if (!root) return
  const lines = cashLines(store())
  root.textContent = ''
  ;['자체 처리', 'USDT', 'P2P'].forEach((kind) => {
    const rows = lines.filter((line) => line.channel === kind)
    const inn = rows.filter((line) => line.type === '입금').reduce((sum, line) => sum + line.amount, 0)
    const out = rows.filter((line) => line.type === '출금').reduce((sum, line) => sum + line.amount, 0)
    const block = document.createElement('section')
    block.dataset.cashKind = kind
    const title = document.createElement('h3')
    title.textContent = kind
    block.append(title)
    ;[
      ['입금', inn],
      ['출금', out],
      [`${kind} 차액`, inn - out],
    ].forEach(([label, value], index) => {
      const row = document.createElement('div')
      if (index === 2) row.dataset.cashProfit = '1'
      const name = document.createElement('span')
      name.textContent = label
      const amount = document.createElement('b')
      amount.textContent = kind === 'USDT' ? pieceText(value) : wonText(value)
      row.append(name, amount)
      block.append(row)
    })
    root.append(block)
  })
}

function settleSizeOf(title) {
  const sizes = loadStore().settleSizes || {}
  const value = Number(sizes[title])
  if (!Number.isFinite(value)) return 5
  return Math.min(10, Math.max(1, Math.round(value)))
}

function setSettleSize(title, value) {
  const store = loadStore()
  store.settleSizes = store.settleSizes || {}
  store.settleSizes[title] = Math.min(10, Math.max(1, Math.round(Number(value) || 5)))
  saveStore(store)
}

function settleSectionOf(title) {
  const heading = [...document.querySelectorAll('[data-settle-board] h2')].find((node) => node.textContent.trim() === title)
  return heading?.closest('section') || heading?.closest('[data-settle-tone]') || null
}

function ensureSettleSizeControl(section, title) {
  if (!section) return
  const head = section.querySelector('h2')?.parentElement || section
  let wrap = head.querySelector('[data-settle-size]')
  if (!wrap) {
    wrap = document.createElement('label')
    wrap.dataset.settleSize = '1'
    wrap.innerHTML = '표시<select></select>'
    const select = wrap.querySelector('select')
    for (let i = 1; i <= 10; i += 1) {
      const option = document.createElement('option')
      option.value = String(i)
      option.textContent = `${i}개`
      select.append(option)
    }
    select.addEventListener('change', () => {
      setSettleSize(title, select.value)
      paintSettleSamples()
    })
    head.append(wrap)
  }
  const select = wrap.querySelector('select')
  select.value = String(settleSizeOf(title))
}

function settleSectionBody(title, options = {}) {
  const section = settleSectionOf(title)
  if (!section) return null
  if (options.size === false) section.querySelector('[data-settle-size]')?.remove()
  else ensureSettleSizeControl(section, title)
  let body = section.querySelector('[data-settle-sample]')
  if (!body) {
    const host = section.querySelector('.p-4') || section
    ;[...host.children].forEach((node) => {
      if (node.dataset?.settleSample) return
      if (node.tagName === 'P' && /정산 기준/.test(node.textContent)) return
      node.remove()
    })
    body = document.createElement('div')
    body.dataset.settleSample = '1'
    host.append(body)
  }
  return body
}

const SETTLE_MIX_COLORS = ['#3b82f6', '#f0b439', '#a78bfa', '#34d399', '#f87171']

function paintSettleMixChart(title, rows, centerLabel) {
  const body = settleSectionBody(title, { size: false })
  if (!body) return
  body.textContent = ''
  body.dataset.settleMix = '1'
  const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0)
  const wrap = document.createElement('div')
  wrap.dataset.settleMixWrap = '1'
  const chart = document.createElement('div')
  chart.dataset.settleMixChart = '1'
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('width', '150')
  svg.setAttribute('height', '150')
  svg.setAttribute('viewBox', '0 0 150 150')
  svg.setAttribute('role', 'img')
  const radius = 56
  const ring = 2 * Math.PI * radius
  const bg = document.createElementNS(svgNS, 'circle')
  bg.setAttribute('cx', '75')
  bg.setAttribute('cy', '75')
  bg.setAttribute('r', String(radius))
  bg.setAttribute('fill', 'none')
  bg.setAttribute('stroke', '#1d2738')
  bg.setAttribute('stroke-width', '22')
  svg.append(bg)
  let offset = 0
  rows.forEach((row, index) => {
    const value = Number(row.value) || 0
    const length = total ? (value / total) * ring : 0
    if (length <= 0) return
    const slice = document.createElementNS(svgNS, 'circle')
    slice.setAttribute('cx', '75')
    slice.setAttribute('cy', '75')
    slice.setAttribute('r', String(radius))
    slice.setAttribute('fill', 'none')
    slice.setAttribute('stroke', SETTLE_MIX_COLORS[index % SETTLE_MIX_COLORS.length])
    slice.setAttribute('stroke-width', '22')
    slice.setAttribute('stroke-dasharray', `${length} ${Math.max(0, ring - length)}`)
    slice.setAttribute('stroke-dashoffset', String(-offset))
    slice.setAttribute('transform', 'rotate(-90 75 75)')
    svg.append(slice)
    offset += length
  })
  const center = document.createElement('div')
  center.dataset.settleMixCenter = '1'
  const centerName = document.createElement('span')
  centerName.textContent = centerLabel
  const centerValue = document.createElement('b')
  centerValue.textContent = num(total)
  center.append(centerName, centerValue)
  chart.append(svg, center)
  const legend = document.createElement('div')
  legend.dataset.settleMixLegend = '1'
  rows.forEach((row, index) => {
    const value = Number(row.value) || 0
    const pct = total ? Math.round((value / total) * 100) : 0
    const line = document.createElement('div')
    line.dataset.settleMixRow = '1'
    const swatch = document.createElement('i')
    swatch.style.background = SETTLE_MIX_COLORS[index % SETTLE_MIX_COLORS.length]
    const name = document.createElement('span')
    name.textContent = testTag(row.label)
    const ratio = document.createElement('em')
    ratio.textContent = `${pct}%`
    const amount = document.createElement('b')
    amount.textContent = num(value)
    line.append(swatch, name, ratio, amount)
    legend.append(line)
  })
  wrap.append(chart, legend)
  body.append(wrap)
}

function paintSettleSampleRows(title, rows, options = {}) {
  const body = settleSectionBody(title, options)
  if (!body) return
  body.textContent = ''
  delete body.dataset.settleMix
  body.dataset.settleList = '1'
  const limit = Number(options.limit)
  const shown = Number.isFinite(limit) && limit > 0
    ? rows.slice(0, limit)
    : options.size === false
      ? rows.slice()
      : rows.slice(0, settleSizeOf(title))
  if (!shown.length) {
    const empty = document.createElement('p')
    empty.textContent = '기간 내 데이터가 없습니다'
    body.append(empty)
    return
  }
  const showRank = options.rank !== false
  const hasMeta = options.meta !== false && shown.some((row) => Boolean(row.sub))
  const amountOf = options.amountUnit === '만' ? manText : wonText
  const head = document.createElement('div')
  head.dataset.settleListHead = '1'
  if (hasMeta) head.dataset.withMeta = '1'
  if (!showRank) head.dataset.plain = '1'
  const labels = []
  if (showRank) labels.push('순위')
  labels.push('항목')
  if (hasMeta) labels.push('건수')
  labels.push('금액')
  labels.forEach((label) => {
    const cell = document.createElement('span')
    cell.textContent = label
    head.append(cell)
  })
  body.append(head)
  shown.forEach((row, index) => {
    const item = document.createElement('div')
    item.dataset.settleListRow = '1'
    if (hasMeta) item.dataset.withMeta = '1'
    if (!showRank) item.dataset.plain = '1'
    if (showRank) {
      const rank = document.createElement('em')
      rank.textContent = String(index + 1).padStart(2, '0')
      item.append(rank)
    }
    const name = document.createElement('span')
    name.textContent = testTag(row.label)
    item.append(name)
    if (hasMeta) {
      const meta = document.createElement('i')
      meta.textContent = row.sub || '-'
      item.append(meta)
    }
    const amount = document.createElement('b')
    amount.textContent = amountOf(row.value)
    item.append(amount)
    body.append(item)
  })
}

function paintSettleSamples() {
  if (!document.querySelector('[data-settle-board]')) return
  paintSettleMixChart('입금 경로 구분', [
    { label: '계좌이체', value: 420000 },
    { label: '테더 (USDT)', value: 280000 },
    { label: 'AXpay', value: 105000 },
  ], '입금')
  paintSettleMixChart('출금 경로 구분', [
    { label: '계좌이체', value: 310000 },
    { label: '테더 (USDT)', value: 240000 },
    { label: 'AXpay', value: 98000 },
  ], '출금')
  paintSettleSampleRows('종목 비중', [
    { label: '야구', value: 45000, sub: '3건' },
    { label: '축구', value: 28000, sub: '2건' },
    { label: '농구', value: 12000, sub: '1건' },
    { label: '배구', value: 11000, sub: '1건' },
    { label: '하키', value: 9800, sub: '1건' },
    { label: '테니스', value: 8600, sub: '1건' },
    { label: '골프', value: 7400, sub: '1건' },
    { label: 'e스포츠', value: 6200, sub: '1건' },
    { label: '미식축구', value: 5100, sub: '1건' },
    { label: '격투기', value: 4300, sub: '1건' },
  ], { size: false, limit: 5 })
  paintSettleSampleRows('유형 비중', [
    { label: '승무패', value: 38000, sub: '4건' },
    { label: '핸디캡', value: 26000, sub: '3건' },
    { label: '언더오버', value: 21000, sub: '2건' },
    { label: '스페셜', value: 14000, sub: '1건' },
    { label: '기타', value: 9000, sub: '1건' },
    { label: '라이브', value: 8200, sub: '1건' },
    { label: '코너', value: 7100, sub: '1건' },
    { label: '카드', value: 6400, sub: '1건' },
    { label: '선수', value: 5800, sub: '1건' },
    { label: '세트', value: 4500, sub: '1건' },
  ], { size: false, limit: 5 })
  const edgeList = { size: false, rank: false, meta: false, amountUnit: '만' }
  paintSettleSampleRows('흑자 종목', [
    { label: '야구', value: 28600 },
    { label: '축구', value: 19200 },
    { label: '농구', value: 12400 },
    { label: '배구', value: 8600 },
    { label: '테니스', value: 5400 },
  ], edgeList)
  paintSettleSampleRows('적자 종목', [
    { label: '하키', value: 24800 },
    { label: 'e스포츠', value: 17600 },
    { label: '골프', value: 13200 },
    { label: '미식축구', value: 9800 },
    { label: '격투기', value: 7200 },
  ], edgeList)
  paintSettleSampleRows('적자 유형', [
    { label: '언더오버', value: 26400 },
    { label: '핸디캡', value: 18800 },
    { label: '라이브', value: 14200 },
    { label: '스페셜', value: 9600 },
    { label: '카드', value: 6100 },
  ], edgeList)
  paintSettleSampleRows('흑자 유형', [
    { label: '승무패', value: 31200 },
    { label: '핸디캡', value: 15600 },
    { label: '기타', value: 10800 },
    { label: '코너', value: 7400 },
    { label: '세트', value: 4900 },
  ], edgeList)
  paintSettleMixChart('카지노 & 스포츠 & 미니게임 비중', [
    { label: '스포츠', value: 85000 },
    { label: '카지노', value: 55000 },
    { label: '미니게임', value: 32000 },
  ], '배팅')
  paintSettleSampleRows('총판 라인별 충전 합계', [
    { label: 'A라인', value: 300000, sub: '4건' },
    { label: 'B라인', value: 150000, sub: '2건' },
    { label: 'C라인', value: 50000, sub: '1건' },
    { label: 'D라인', value: 42000, sub: '1건' },
    { label: 'E라인', value: 36000, sub: '1건' },
    { label: 'F라인', value: 28000, sub: '1건' },
    { label: 'G라인', value: 21000, sub: '1건' },
    { label: 'H라인', value: 16000, sub: '1건' },
    { label: 'I라인', value: 12000, sub: '1건' },
    { label: 'J라인', value: 8000, sub: '1건' },
  ])
  paintSettleSampleRows('총판 라인별 환전 합계', [
    { label: 'A라인', value: 120000, sub: '3건' },
    { label: 'B라인', value: 80000, sub: '1건' },
    { label: 'C라인', value: 45000, sub: '1건' },
    { label: 'D라인', value: 38000, sub: '1건' },
    { label: 'E라인', value: 30000, sub: '1건' },
    { label: 'F라인', value: 24000, sub: '1건' },
    { label: 'G라인', value: 18000, sub: '1건' },
    { label: 'H라인', value: 14000, sub: '1건' },
    { label: 'I라인', value: 10000, sub: '1건' },
    { label: 'J라인', value: 7000, sub: '1건' },
  ])
  paintSettleSampleRows('적자 회원', [
    { label: '테스트유저 (test)', value: 61424, sub: '' },
    { label: '테스트용 (test123)', value: 22000, sub: '' },
    { label: '회원03 (user03)', value: 18500, sub: '' },
    { label: '회원04 (user04)', value: 16200, sub: '' },
    { label: '회원05 (user05)', value: 14800, sub: '' },
    { label: '회원06 (user06)', value: 12100, sub: '' },
    { label: '회원07 (user07)', value: 9800, sub: '' },
    { label: '회원08 (user08)', value: 8600, sub: '' },
    { label: '회원09 (user09)', value: 7200, sub: '' },
    { label: '회원10 (user10)', value: 5400, sub: '' },
  ])
  paintSettleSampleRows('흑자 회원', [
    { label: '테스트유저 (test)', value: 10000, sub: '' },
    { label: '관리자 (admin)', value: 5000, sub: '' },
    { label: '회원03 (user03)', value: 4600, sub: '' },
    { label: '회원04 (user04)', value: 4200, sub: '' },
    { label: '회원05 (user05)', value: 3900, sub: '' },
    { label: '회원06 (user06)', value: 3500, sub: '' },
    { label: '회원07 (user07)', value: 3100, sub: '' },
    { label: '회원08 (user08)', value: 2700, sub: '' },
    { label: '회원09 (user09)', value: 2300, sub: '' },
    { label: '회원10 (user10)', value: 1900, sub: '' },
  ])
}

function flowOf(list) {
  const inn = list.filter((move) => move.type === '입금').reduce((sum, move) => sum + move.amount, 0)
  const out = list.filter((move) => move.type === '출금').reduce((sum, move) => sum + Math.abs(move.amount), 0)
  const settled = list.filter((move) => move.settled)
  const stake = settled.reduce((sum, move) => sum + move.stake, 0)
  const payout = settled.reduce((sum, move) => sum + move.payout, 0)
  return { inn, out, diff: inn - out, stake, payout, profit: stake - payout, count: settled.length }
}

function collectMoves(data) {
  const moves = []
  data.cashExtra.forEach((item) => {
    if (item.status !== '승인') return
    moves.push({
      login: item.login,
      nick: item.nick || data.users[item.login]?.nick || item.login,
      type: item.type,
      amount: cashEffect(item.type, '승인', item.amount),
      at: item.processedAt || item.requestedAt,
      memo: item.memo || item.type,
      when: item.processedAt || item.requestedAt,
    })
  })
  Object.entries(CAPTURED_CASH).forEach(([id, row]) => {
    const status = data.cashStatus[id]
    if (!status || status === row.status) return
    const amount = cashEffect(row.type, status, row.amount) - cashEffect(row.type, row.status, row.amount)
    if (!amount) return
    moves.push({
      login: row.login,
      nick: data.users[row.login]?.nick || row.login,
      type: amount > 0 ? '입금' : '출금',
      amount,
      at: data.adjustedAt[id] || '',
      memo: `#${id} ${status}`,
      when: data.adjustedAt[id] || '',
    })
  })
  BETS.forEach((bet, index) => {
    const current = data.betStatus[index] || bet[6]
    const amount = paidWin(current, bet[5]) - paidWin(bet[6], bet[5])
    if (!amount) return
    moves.push({
      login: bet[0],
      nick: bet[1],
      type: '적중',
      amount,
      at: data.betSettledAt[index] || '',
      memo: bet[2],
      when: data.betSettledAt[index] || '',
      stake: bet[3],
      payout: current === '적중' ? bet[5] : 0,
      settled: true,
    })
  })
  ;(data.placedBets || []).forEach((bet) => {
    moves.push({
      login: bet.login,
      nick: bet.nick || data.users[bet.login]?.nick || bet.login,
      type: '베팅',
      amount: -Number(bet.stake),
      at: bet.at,
      memo: `${bet.match} ${bet.pick}`,
      when: bet.at,
    })
    if (bet.status === '적중') {
      const payout = Math.round(Number(bet.stake) * Number(bet.odds))
      moves.push({
        login: bet.login,
        nick: bet.nick || bet.login,
        type: '적중',
        amount: payout,
        at: bet.settledAt || bet.at,
        memo: `${bet.match} ${bet.pick}`,
        when: bet.settledAt || bet.at,
        stake: Number(bet.stake),
        payout,
        settled: true,
      })
    }
  })
  return moves
}

function writeValue(element, value) {
  if (!element) return false
  if (element.tagName === 'B' || element.classList?.contains('tabular-nums')) {
    element.textContent = value
    return true
  }
  const inner = [...element.children].find((child) => child.classList.contains('tabular-nums') && !child.textContent.includes('적중 시'))
  if (inner) {
    inner.textContent = value
    return true
  }
  if (/text-lg|font-black/.test(element.className || '')) {
    element.textContent = value
    return true
  }
  return false
}

function setLabel(label, value) {
  const root = document.querySelector('main')
  if (!root) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    if (node.textContent.trim() !== label) continue
    writeValue(node.parentElement?.nextElementSibling, value)
  }
}

function setCountLabel(prefix, count, amount) {
  const root = document.querySelector('main')
  if (!root) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim().startsWith(`${prefix} (`)) continue
    node.textContent = `${prefix} (${count}건)`
    writeValue(node.parentElement?.nextElementSibling, num(amount))
  }
}

function linkedRow(cells, when) {
  const row = document.createElement('tr')
  row.dataset.linkedRow = '1'
  row.dataset.linkedAt = String(Date.now())
  row.className = 'border-b border-edge-soft'
  cells.forEach((value) => {
    const cell = document.createElement('td')
    cell.className = 'px-3 py-2.5 align-middle whitespace-nowrap text-center text-[13px]'
    cell.textContent = value
    row.appendChild(cell)
  })
  if (when) row.dataset.when = when
  return row
}

function boardCard(root, label) {
  return [...root.querySelectorAll('.bg-card')].find((card) => [...card.querySelectorAll('div')].some((node) => !node.children.length && node.textContent.trim() === label))
}

function boardLabel(card) {
  return [...card.querySelectorAll('div')].find((node) => !node.children.length && node.className.includes('tracking'))
}

function renameBoard(root, from, to) {
  const card = boardCard(root, from)
  if (!card || boardCard(root, to)) return
  const label = boardLabel(card)
  if (label) label.textContent = to
}

function replaceTodayWords(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    if (node.textContent.includes('오늘')) node.textContent = node.textContent.replaceAll('오늘', '금일')
  }
}

function ensureStatusBoard() {
  const root = document.querySelector('main')
  if (!root || root.querySelector('[data-status-zones]')) return
  const deposit = boardCard(root, '오늘 입금 회원') || boardCard(root, '금일 입금 회원')
  if (deposit && !boardCard(root, '오늘 출금 회원') && !boardCard(root, '금일 출금 회원') && !boardCard(root, '금일 출금 회원 명수') && !boardCard(root, '출금 회원')) {
    const clone = deposit.cloneNode(true)
    const label = boardLabel(clone)
    if (label) label.textContent = label.textContent.includes('금일') ? '금일 출금 회원' : '오늘 출금 회원'
    const value = clone.querySelector('.tabular-nums')
    if (value) value.textContent = '0명'
    deposit.after(clone)
    deposit.parentElement?.setAttribute('data-board', 'members')
  }
  replaceTodayWords(root)
  renameBoard(root, '실시간 접속', '실시간 접속자 현황')
  renameBoard(root, '금일 접속 회원', '금일 누적 접속 회원')
  splitMemberCard(root, '금일 입금 회원')
  splitMemberCard(root, '금일 출금 회원')
  renameBoard(root, '금일 가입 회원', '금일 신규 가입 회원')
  const joined = boardCard(root, '금일 신규 가입 회원')
  const visited = boardCard(root, '금일 누적 접속 회원')
  if (joined && visited && visited.nextElementSibling !== joined) visited.after(joined)
  const waiting = boardCard(root, '입출금 대기')
  if (waiting) {
    const host = waiting.closest('a') || waiting
    const depositWait = host.cloneNode(true)
    const withdrawWait = host.cloneNode(true)
    depositWait.querySelector('.truncate').textContent = '입금 대기'
    withdrawWait.querySelector('.truncate').textContent = '출금 대기'
    host.replaceWith(depositWait, withdrawWait)
    depositWait.parentElement?.setAttribute('data-board', 'ops')
  }
  const pending = boardCard(root, '진행 중 베팅')
  if (pending) {
    const host = pending.closest('a') || pending
    const clones = ['총 배팅', '정산 전', '정산 후'].map((label) => {
      const clone = host.cloneNode(true)
      clone.querySelector('.truncate').textContent = label
      return clone
    })
    host.replaceWith(...clones)
  }
  splitBoardCard(root, '입금 대기', '대기 건수', '대기 금액')
  splitBoardCard(root, '출금 대기', '대기 건수', '대기 금액')
  splitBoardCard(root, '총 배팅', '총 배팅 건수', '총 배팅 금액')
  splitBoardCard(root, '정산 전', '정산 전 건수', '정산 전 금액')
  splitBoardCard(root, '정산 후', '정산 완료 건수', '정산 완료 금액')
  splitBoardCard(root, '정산 완료', '정산 완료 건수', '정산 완료 금액')
  const live = boardCard(root, '라이브 경기')
  if (live) {
    const label = live.querySelector('.truncate')
    label.textContent = '진행 중인 라이브 경기'
    label.classList.remove('truncate')
  }
  buildStatusZones(root)
}

function retargetZoneCard(source, label, href) {
  const node = source.cloneNode(true)
  const card = node.classList.contains('bg-card') ? node : node.querySelector('.bg-card') || node
  const name = boardLabel(card)
  if (name) {
    name.textContent = label
    name.classList.remove('truncate')
  }
  const value = card.querySelector?.('.tabular-nums')
  if (value) {
    if (/건수|문의|경기/.test(label)) value.textContent = '0건'
    else if (/회원|명수/.test(label)) value.textContent = '0명'
    else value.textContent = /원$/.test(value.textContent) || /금액|수익|지금|적립/.test(label) ? '0원' : '0'
  }
  if (href) {
    if (node.tagName === 'A') node.setAttribute('href', href)
    else {
      const wrap = document.createElement('a')
      wrap.className = 'block transition-transform hover:-translate-y-0.5'
      wrap.href = href
      wrap.append(node)
      return wrap
    }
  }
  return node
}

function appendStatusZone(parent, title, tone, groups, cols) {
  const section = document.createElement('section')
  section.dataset.tone = tone
  const heading = document.createElement('h2')
  heading.textContent = title
  section.append(heading)
  const blocks = Array.isArray(groups[0]) ? groups : [groups]
  blocks.forEach((items, index) => {
    const grid = document.createElement('div')
    grid.dataset.zoneGrid = '1'
    const col = Array.isArray(cols) ? cols[index] : cols
    if (col) grid.dataset.cols = String(col)
    items.forEach((item) => grid.append(item))
    section.append(grid)
  })
  parent.append(section)
  return section
}

function buildStatusZones(root) {
  if (!root || root.querySelector('[data-status-zones]')) return
  const space = root.querySelector('.space-y-4')
  if (!space) return
  const topGrids = []
  for (const child of space.children) {
    if (child.tagName === 'SECTION' || child.querySelector(':scope > h2, :scope > section')) break
    if (child.classList.contains('grid')) topGrids.push(child)
  }
  if (!topGrids.length) return
  const hosts = topGrids.flatMap((grid) => [...grid.children])
  if (hosts.length < 21) return
  const zones = document.createElement('div')
  zones.dataset.statusZones = '1'
  appendStatusZone(zones, '접속', 'access', hosts.slice(0, 3))
  appendStatusZone(zones, '금일 입금', 'in', hosts.slice(3, 6))
  appendStatusZone(zones, '금일 출금', 'out', hosts.slice(6, 9))
  appendStatusZone(zones, '입금 대기', 'wait-in', hosts.slice(9, 11))
  appendStatusZone(zones, '출금 대기', 'wait-out', hosts.slice(11, 13))
  const betTpl = hosts[13]
  const moneyTpl = hosts[14] || betTpl
  const sportCounts = ['총 배팅 건수', '정산 전 건수', '정산 완료 건수'].map((label) => retargetZoneCard(betTpl, label, '/nex/bets.html'))
  const sportMoney = ['총 배팅 금액', '당첨 금액', '낙첨 금액', '수익'].map((label) => retargetZoneCard(moneyTpl, label, '/nex/bets.html'))
  const casinoCounts = ['총 배팅 건수', '정산 전 건수', '정산 완료 건수'].map((label) => retargetZoneCard(betTpl, label, '/nex/casino.html'))
  const casinoMoney = ['총 배팅 금액', '당첨 금액', '낙첨 금액', '수익'].map((label) => retargetZoneCard(moneyTpl, label, '/nex/casino.html'))
  appendStatusZone(zones, '스포츠 배팅', 'sport', [sportCounts, sportMoney], [3, 4])
  appendStatusZone(zones, '카지노 배팅', 'casino', [casinoCounts, casinoMoney], [3, 4])
  appendStatusZone(zones, '금일 총판 정산 내역', 'dist', [
    retargetZoneCard(moneyTpl, '지금 금액', '/nex/dist.html'),
    retargetZoneCard(moneyTpl, '적립 금액', '/nex/dist.html'),
  ], 2)
  appendStatusZone(zones, '경기 · 문의', 'live', hosts.slice(19, 21))
  topGrids[0].before(zones)
  topGrids.forEach((grid) => grid.remove())
  hosts.slice(13, 19).forEach((node) => node.remove())
}

function splitMemberCard(root, label) {
  splitBoardCard(root, label, '회원', '건수', '완료 금액')
}

function splitBoardCard(root, label, countLabel, amountLabel, moneyLabel) {
  const card = boardCard(root, label)
  if (!card || boardLabel(card)?.textContent.trim() === countLabel) return
  const host = card.closest('a') || card
  const names = moneyLabel ? [[countLabel, '0명'], [amountLabel, '0건'], [moneyLabel, '0']] : [[countLabel, '0건'], [amountLabel, '0']]
  const clones = names.map(([name, starter]) => {
    const clone = host.cloneNode(true)
    const node = boardLabel(clone)
    node.textContent = name
    node.classList.remove('truncate')
    const value = clone.querySelector('.tabular-nums')
    if (value) value.textContent = starter
    return clone
  })
  host.replaceWith(...clones)
}

function distSettleSum(data) {
  const rows = Array.isArray(data.distSettles) ? data.distSettles : []
  const fromRows = rows.reduce((sum, row) => sum + Number(row.accrued ?? row.amount ?? row.balance ?? row.current ?? 0), 0)
  if (fromRows) return fromRows
  return data.distBalance != null ? Number(data.distBalance) : 0
}

function openBetsOf(data) {
  return BETS.filter((bet, index) => (data.betStatus[index] || bet[6]) === '진행 중')
}

function openRiskMoney(open) {
  return open.reduce((sum, bet) => sum + Math.max(0, Number(bet[5]) - Number(bet[3])), 0)
}

function eachDayStamp(from, to) {
  const start = parseDate(from)
  const end = parseDate(to)
  if (!start || !end) return []
  const days = []
  const cursor = new Date(end)
  cursor.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  while (cursor >= start && days.length < 120) {
    days.push(todayStamp(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  return days
}

function sampleLedgerCells(stamp) {
  let seed = 2166136261
  for (let i = 0; i < stamp.length; i += 1) seed = Math.imul(seed ^ stamp.charCodeAt(i), 16777619) >>> 0
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const inn = Math.round((220 + next() * 680) * 1000)
  const out = Math.round((150 + next() * 520) * 1000)
  const count = 4 + Math.floor(next() * 14)
  const stake = Math.round((45 + next() * 210) * 1000)
  const payout = Math.round(stake * (0.5 + next() * 0.95))
  const distFee = Math.round((8 + next() * 42) * 1000)
  const label = testTag(`${stamp.slice(5, 7)}-${stamp.slice(8, 10)}`)
  return [label, num(inn), num(out), num(inn - out), String(count), num(stake), num(payout), num(distFee), num(stake - payout)]
}

function paintSettleLedger() {
  const section = document.querySelector('[data-settle-ledger]')
  const table = section?.querySelector('table')
  const body = table?.tBodies[0]
  if (!body) return
  const form = document.querySelector('[data-settle-query]')
  const from = form?.querySelector('[data-settle-from]')?.value || todayStamp()
  const to = form?.querySelector('[data-settle-to]')?.value || todayStamp()
  body.textContent = ''
  eachDayStamp(from, to).forEach((stamp) => {
    const row = document.createElement('tr')
    row.className = 'border-b border-edge-soft last:border-0 hover:bg-card-hover/40 transition-colors'
    row.dataset.settleLedgerRow = '1'
    row.dataset.when = stamp
    sampleLedgerCells(stamp).forEach((value, index) => {
      const cell = document.createElement('td')
      cell.className = index
        ? 'px-3 py-2.5 align-middle whitespace-nowrap text-center tabular-nums text-fg'
        : 'px-3 py-2.5 align-middle whitespace-nowrap text-center font-bold tabular-nums text-fg'
      cell.textContent = value
      row.append(cell)
    })
    body.append(row)
  })
}

function paintSettlePlan() {
  const heading = [...document.querySelectorAll('[data-settle-board] h2')].find((node) => node.textContent.trim() === '지급 여유')
  const section = heading?.closest('section')
  if (!section) return
  const host = section.querySelector('.p-4') || section
  const data = store()
  const memberMoney = Object.values(data.users || {}).reduce((sum, user) => sum + Number(user.money || 0), 0)
  const distMoney = distSettleSum(data)
  const open = openBetsOf(data)
  const riskMoney = openRiskMoney(open)
  const need = memberMoney + distMoney + riskMoney
  let root = host.querySelector('[data-settle-plan]')
  if (!root || root.querySelector('[data-plan-payout]') || root.querySelectorAll('[data-plan-grid]>div').length !== 3) {
    host.textContent = ''
    root = document.createElement('div')
    root.dataset.settlePlan = '1'
    root.innerHTML = '<div data-plan-hero><span>필요 보유 자금 (권장)</span><b data-plan-need></b></div><div data-plan-grid><div><span>회원 보유 머니</span><b data-plan-member></b></div><div><span>총판 보유 머니</span><b data-plan-dist></b></div><div><span>미확정 리스크 머니</span><b data-plan-risk></b></div></div><p data-plan-note>필요 보유 자금 = 회원 보유 + 총판 보유 + 미확정 리스크(당첨금 − 배팅금)입니다.</p>'
    host.append(root)
  }
  root.querySelector('[data-plan-need]').textContent = num(need)
  root.querySelector('[data-plan-member]').textContent = num(memberMoney)
  root.querySelector('[data-plan-dist]').textContent = num(distMoney)
  root.querySelector('[data-plan-risk]').textContent = num(riskMoney)
}

function paintTopSums() {
  const title = [...document.querySelectorAll('header span')].find((node) => node.textContent.trim() === '운영 콘솔')
  const slot = title?.parentElement
  if (!slot) return
  let bar = slot.querySelector('[data-top-sums]')
  if (!bar) {
    bar = document.createElement('span')
    bar.dataset.topSums = '1'
    bar.style.cssText = 'display:inline-flex;align-items:center;gap:14px;margin-left:18px;font-size:12px;font-weight:700;color:#d7dee8;white-space:nowrap'
    slot.append(bar)
  }
  const data = store()
  const members = Object.values(data.users || {}).reduce((sum, user) => sum + Number(user.money || 0), 0)
  bar.textContent = ''
  ;[
    ['회원 보유 금액 합산', wonText(members)],
    ['총판 정산 금액 합산', wonText(distSettleSum(data))],
  ].forEach(([label, value], index) => {
    if (index) {
      const split = document.createElement('span')
      split.textContent = '|'
      split.style.color = '#6e7882'
      bar.append(split)
    }
    const item = document.createElement('span')
    item.textContent = `${label} : ${value}`
    bar.append(item)
  })
}

function paintLinked() {
  const root = document.querySelector('main')
  if (!root || root.dataset.painting === '1') return
  root.dataset.painting = '1'
  ensureStatusBoard()
  const data = store()
  const moves = collectMoves(data)
  const today = flowOf(moves.filter((move) => happened(move.when, '오늘')))
  const half = flowOf(moves.filter((move) => happened(move.when, '15일')))
  const periodName = selectedPeriod()
  const period = flowOf(moves.filter((move) => !periodName || happened(move.when, periodName)))
  const memberMoney = Object.values(data.users).reduce((sum, user) => sum + user.money, 0)
  const distMoney = distSettleSum(data)
  const open = openBetsOf(data)
  const openStake = open.reduce((sum, bet) => sum + bet[3], 0)
  const openWin = open.reduce((sum, bet) => sum + bet[5], 0)
  const riskMoney = openRiskMoney(open)
  const liveNames = Object.entries(data.matchStatus).filter(([, status]) => status === '라이브').map(([name]) => name)
  paintBetZone('sport', sportRows(data))
  paintBetZone('casino', casinoRows(data))
  paintDistZone(data)
  const deposits = moves.filter((move) => move.type === '입금' && move.amount > 0 && happened(move.when, '오늘'))
  const withdraws = moves.filter((move) => move.type === '출금' && move.amount < 0 && happened(move.when, '오늘'))
  setLabel('회원 보유 머니', num(memberMoney))
  setLabel('총판 보유 머니', num(distMoney))
  setLabel('미확정 베팅 노출', num(openStake))
  setLabel('미확정 베팅 총액', num(openStake))
  setLabel('미확정 리스크 머니', num(riskMoney))
  setLabel('최대 지급 책임', num(memberMoney + openWin))
  setLabel('필요 보유 자금 (권장)', num(memberMoney + distMoney + riskMoney))
  setLabel('15일 순입금', num(half.diff))
  setLabel('15일 베팅 수익', num(half.profit))
  setLabel('기간 순입금', num(period.diff))
  setLabel('입출금 차액', num(period.diff))
  setLabel('베팅 수익/손실', num(period.profit))
  setLabel('입금', num(today.inn))
  setLabel('출금', num(today.out))
  setLabel('차액', num(today.diff))
  setLabel('베팅액', num(today.stake))
  setLabel('수익/손실', num(today.profit))
  const pendingDeposits = waitingRows(data, '입금')
  const pendingWithdraws = waitingRows(data, '출금')
  paintWaitZone('wait-in', pendingDeposits)
  paintWaitZone('wait-out', pendingWithdraws)
  setLabel('진행 중인 라이브 경기', countText(liveNames.length, '건'))
  setLabel('미답변 문의', countText(data.inquiries.filter((item) => !item.answer).length, '건'))
  setLabel('실시간 접속자 현황', filledPeople(0))
  setLabel('금일 누적 접속 회원', filledPeople(0))
  setLabel('금일 신규 가입 회원', filledPeople(0))
  paintFlowZone('in', deposits, false)
  paintFlowZone('out', withdraws, true)
  setLabel('총 회원', countText(Object.keys(data.users).length, '명'))
  ensureRiskSummaryCards()
  paintRiskSummary(open, liveNames)
  setCountLabel('총 베팅액', period.count, period.stake)
  setCountLabel('적중 지급액', period.count, period.payout)
  setCountLabel('미확정 베팅', open.length, openStake)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    if (node.textContent.trim().startsWith('적중 시 지급')) node.textContent = `적중 시 지급 ${num(openWin)}`
  }
  root.querySelectorAll('tbody tr').forEach((row) => {
    const login = row.innerText.match(/\(([^)]+)\)/)?.[1]
    const user = login && data.users[login]
    if (!user) return
    row.querySelectorAll('div').forEach((div) => {
      if (!div.children.length && div.textContent.includes('보유 머니')) div.textContent = `보유 머니 ${num(user.money)}`
    })
  })
  const balanceLine = [...root.querySelectorAll('p')].find((item) => item.textContent.includes('머니') && item.textContent.includes('포인트'))
  if (balanceLine && data.users.test) balanceLine.textContent = `머니 ${num(data.users.test.money)} · 포인트 ${num(data.users.test.points)}P`
  root.querySelectorAll('[data-linked-row]').forEach((row) => row.remove())
  const tx = [...root.querySelectorAll('table')].find((table) => (table.tHead?.innerText || '').includes('거래 후 머니'))
  if (tx?.tBodies[0]) {
    const running = Object.fromEntries(Object.entries(data.users).map(([login, user]) => [login, user.money]))
    ;[...moves].reverse().forEach((move, index) => {
      const after = running[move.login] ?? 0
      running[move.login] = after - move.amount
      const row = linkedRow([`연동`, `${move.nick} (${move.login})`, move.type, `${move.amount > 0 ? '+' : '−'}${num(Math.abs(move.amount))}`, num(after), move.memo, move.at || stamp()], move.when)
      row.dataset.linkedAt = String(Date.now() + moves.length - index)
      tx.tBodies[0].prepend(row)
    })
  }
  const points = [...root.querySelectorAll('table')].find((table) => (table.tHead?.innerText || '').includes('잔액 후'))
  if (points?.tBodies[0]) {
    const running = Object.fromEntries(Object.entries(data.users).map(([login, user]) => [login, user.points]))
    ;[...data.pointMoves].reverse().forEach((move, index) => {
      const after = running[move.login] ?? 0
      running[move.login] = after - Number(move.amount)
      const row = linkedRow([memberLabel(data.users[move.login]?.nick || move.login, move.login), move.reason || '지급', `${move.amount > 0 ? '+' : ''}${num(move.amount)}`, num(after), '-', move.at || '-'])
      row.dataset.linkedAt = String(Date.now() + index)
      points.tBodies[0].prepend(row)
    })
  }
  const recent = [...root.querySelectorAll('table')].find((table) => (table.tHead?.innerText || '').includes('당첨금'))
  recent?.tBodies[0] && [...recent.tBodies[0].rows].forEach((row) => {
    const bet = BETS.find((item, index) => row.innerText.includes(item[2]) && row.innerText.includes(num(item[3])) && (data.betStatus[index] || item[6]))
    if (!bet) return
    const index = BETS.indexOf(bet)
    const status = data.betStatus[index] || bet[6]
    const cell = row.cells[row.cells.length - 1]
    if (cell && /진행 중|적중|미적중/.test(cell.innerText)) cell.textContent = status
  })
  paintBetMarkets()
  paintCurrentHot(data)
  paintRiskMonitor(data)
  paintCashDetail()
  paintSettleLedger()
  paintSettleSamples()
  paintSettlePlan()
  paintTopSums()
  root.dataset.painting = ''
}

function isMatchAlignCell(cell) {
  return Boolean(cell?.dataset?.homeCol || cell?.dataset?.vsCol || cell?.dataset?.awayCol || cell?.dataset?.leagueCol)
}

function alignMatchColumns(root) {
  if (!root) return
  root.querySelectorAll('[data-home-col], [data-vs-col], [data-away-col], [data-league-col]').forEach((cell) => {
    const side = cell.dataset.homeCol ? 'right' : (cell.dataset.awayCol || cell.dataset.leagueCol) ? 'left' : 'center'
    cell.classList.remove('text-left', 'text-right', 'text-start', 'text-end', 'text-center')
    cell.classList.add(side === 'right' ? 'text-right' : side === 'left' ? 'text-left' : 'text-center')
    cell.style.textAlign = side
    cell.querySelectorAll('button, a, span, div, img').forEach((node) => {
      node.classList.remove('text-left', 'text-right', 'text-start', 'text-end', 'text-center', 'justify-start', 'justify-end', 'justify-between', 'justify-center')
      node.style.textAlign = side
      node.style.justifyContent = side === 'right' ? 'flex-end' : side === 'left' ? 'flex-start' : 'center'
      if (side === 'right') node.classList.add('justify-end')
      else if (side === 'left') node.classList.add('justify-start')
      else node.classList.add('justify-center')
    })
  })
}

function centerTables() {
  document.querySelectorAll('main table th, main table td').forEach((cell) => {
    if (isMatchAlignCell(cell)) return
    cell.classList.remove('text-left', 'text-right', 'text-start', 'text-end')
    cell.classList.add('text-center')
    cell.style.textAlign = 'center'
    cell.querySelectorAll('div').forEach((node) => {
      if (node.classList.contains('justify-end') || node.classList.contains('justify-start') || node.classList.contains('justify-between')) {
        node.classList.remove('justify-end', 'justify-start', 'justify-between')
        node.classList.add('justify-center')
      }
    })
  })
  document.querySelectorAll('[data-lower-board] th, [data-lower-board] td').forEach((cell) => {
    if (isMatchAlignCell(cell)) return
    cell.querySelectorAll('button, a, span, div').forEach((node) => {
      node.classList.remove('text-left', 'text-right', 'text-start', 'text-end', 'justify-start', 'justify-end', 'justify-between')
      node.style.textAlign = 'center'
      node.style.justifyContent = 'center'
    })
  })
  alignMatchColumns(document.querySelector('[data-lower-board]'))
}

function stampDemoMarks(root = document) {
  const pairs = [
    ['테스트유저', '테스트유저 (t)'],
    ['테스트용', '테스트용 (t)'],
    ['회원03', '회원03 (t)'],
    ['회원04', '회원04 (t)'],
    ['회원05', '회원05 (t)'],
  ]
  const walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  nodes.forEach((node) => {
    if (node.parentElement?.closest('script, style, textarea, input, select')) return
    let text = node.textContent
    let next = text
    for (const [from, to] of pairs) {
      if (!next.includes(from) || next.includes(to)) continue
      next = next.split(from).join(to)
    }
    if (next !== text) node.textContent = next
  })
}

function refreshTables() {
  paintLinked()
  document.querySelectorAll('main table').forEach((table) => applyTable(table, 0))
  centerTables()
  stampDemoMarks()
  document.querySelectorAll('[data-nex-row]').forEach((row) => {
    const input = row.closest('main')?.querySelector('input[placeholder*="검색"], input[placeholder*="아이디"]')
    const query = input?.value.trim().toLowerCase() || ''
    row.hidden = Boolean(query) && !row.innerText.toLowerCase().includes(query)
  })
}

function markLooseRows() {
  const nodes = [...document.querySelectorAll('main div')].filter((node) => {
    const text = node.innerText || ''
    return text.includes('OM93') && text.length < 800
  })
  nodes.sort((a, b) => a.innerText.length - b.innerText.length)
  if (nodes[0]) nodes[0].dataset.nexRow = '1'
}

const STATUSES = ['대기', '승인', '거절', '지급 실패']

function statusOf(row) {
  const texts = [...row.querySelectorAll('span')].map((span) => span.textContent.trim())
  if (texts.some((text) => text.startsWith('지급 실패'))) return '지급 실패'
  return texts.find((text) => STATUSES.includes(text)) || ''
}

function badge(text) {
  const span = document.createElement('span')
  span.className = STATUS_CLASS[text] || STATUS_CLASS['진행 중']
  span.textContent = text
  return span
}

function setStatus(cell, text) {
  const span = cell.querySelector('span') || cell.appendChild(document.createElement('span'))
  span.className = STATUS_CLASS[text] || STATUS_CLASS.대기
  span.textContent = text
}

function recountCash() {
  const rows = [...document.querySelectorAll('main tbody tr')].filter((row) => !row.dataset.empty && !row.hidden)
  const counts = { 전체: 0, 대기: 0, 승인: 0, 거절: 0, '지급 실패': 0 }
  document.querySelectorAll('main tbody tr').forEach((row) => {
    if (row.dataset.empty) return
    counts.전체 += 1
    const status = statusOf(row)
    if (status) counts[status] += 1
  })
  document.querySelectorAll('main button').forEach((button) => {
    const label = labelOf(button)
    if (!(label in counts)) return
    const span = button.querySelector('span')
    if (span) span.textContent = String(label === '전체' ? counts.전체 : counts[label])
  })
  const waiting = [...document.querySelectorAll('main tbody tr')].filter((row) => !row.dataset.empty && row.innerText.includes('대기') && row.innerText.includes('입금'))
  const card = [...document.querySelectorAll('main div')].find((node) => node.innerText.includes('대기 입금') && node.innerText.length < 40)
  if (card) {
    const value = card.querySelector('.text-lg')
    const sum = waiting.reduce((total, row) => total + rowAmount(row), 0)
    if (value) value.textContent = `${waiting.length}건 · ${sum.toLocaleString('ko-KR')}`
  }
  return rows
}

function cashRow(item) {
  const row = document.createElement('tr')
  row.className = 'border-b border-edge-soft hover:bg-card-hover/40 transition-colors'
  row.dataset.cashId = item.id
  const cells = [
    `#${item.id}`,
    `${item.nick} (${item.login})`,
    item.type,
    Number(item.amount).toLocaleString('ko-KR'),
    item.memo || '-',
    item.status,
    item.requestedAt,
    item.processedAt || '-',
  ]
  cells.forEach((value, index) => {
    const cell = document.createElement('td')
    cell.className = 'px-3 py-2.5 align-middle whitespace-nowrap text-center text-[13px]'
    if (index === 2 || index === 5) cell.appendChild(badge(value))
    else cell.textContent = value
    row.appendChild(cell)
  })
  const action = document.createElement('td')
  action.className = 'px-3 py-2.5 text-center'
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'px-2.5 py-1 rounded-md text-[11px] font-bold border border-edge text-dim hover:bg-card-hover hover:text-fg'
  button.textContent = '심사'
  action.appendChild(button)
  row.appendChild(action)
  return row
}

function mountExtraCash() {
  const body = document.querySelector('main tbody')
  if (!body || !location.pathname.endsWith('/cash.html')) return
  const data = store()
  data.cashExtra.forEach((item) => {
    if (body.querySelector(`[data-cash-id="${item.id}"]`)) return
    body.prepend(cashRow(item))
  })
  document.querySelectorAll('main tbody tr').forEach((row) => {
    const id = row.innerText.match(/#(\d+)/)?.[1]
    if (!id || !data.cashStatus[id]) return
    const statusCell = [...row.cells].find((cell) => /승인|거절|대기|지급 실패/.test(cell.innerText) && !/입금|출금/.test(labelOf(cell.querySelector('span') || cell)))
    const spans = [...row.querySelectorAll('span')].filter((span) => ['승인', '거절', '대기', '지급 실패'].includes(span.textContent.trim()))
    if (spans[0]) setStatus(spans[0].parentElement, data.cashStatus[id])
    if (statusCell) statusCell.dataset.bound = '1'
  })
  recountCash()
}

function openReview(row) {
  const id = row.dataset.cashId || row.innerText.match(/#(\d+)/)?.[1]
  const text = row.innerText.replace(/\s+/g, ' ')
  const type = text.includes('출금') ? '출금' : '입금'
  const login = text.match(/\(([^)]+)\)/)?.[1] || ''
  const amount = rowAmount(row)
  const dialog = document.createElement('div')
  dialog.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4'
  dialog.innerHTML = `<div class="w-full max-w-sm rounded-xl border border-edge bg-card p-4"><h2 class="text-sm font-black text-fg">입출금 심사 #${id}</h2><p class="mt-2 text-sm text-dim">${type} ${amount.toLocaleString('ko-KR')} · ${login}</p><div class="mt-4 flex gap-2"><button type="button" data-act="승인" class="h-9 flex-1 rounded-lg bg-accent text-sm font-bold text-on-accent">승인</button><button type="button" data-act="거절" class="h-9 flex-1 rounded-lg border border-edge text-sm font-bold text-dim">거절</button><button type="button" data-act="close" class="h-9 rounded-lg px-3 text-sm font-bold text-muted">닫기</button></div></div>`
  dialog.addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.act
    if (!action) return
    if (action === 'close') {
      dialog.remove()
      return
    }
    const data = store()
    const user = data.users[login]
    if (action === '승인' && type === '출금' && user && user.money < amount) {
      toast('보유 머니가 부족해 승인할 수 없습니다.')
      return
    }
    data.cashStatus[id] = action
    const extra = data.cashExtra.find((item) => String(item.id) === String(id))
    if (extra) {
      extra.status = action
      extra.processedAt = stamp()
    }
    logAction(data, `#${id} ${login} ${type} ${action}`)
    commit(data)
    paintLinked()
    const spans = [...row.querySelectorAll('span')].filter((span) => ['승인', '거절', '대기', '지급 실패'].includes(span.textContent.trim()))
    if (spans[0]) setStatus(spans[0].parentElement, action)
    recountCash()
    dialog.remove()
    toast(action === '승인' ? '승인했습니다.' : '거절했습니다.')
  })
  document.body.appendChild(dialog)
}

function openAnswer(id) {
  const dialog = document.createElement('div')
  dialog.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4'
  dialog.innerHTML = `<div class="w-full max-w-sm rounded-xl border border-edge bg-card p-4"><h2 class="text-sm font-black text-fg">문의 답변</h2><textarea data-answer-body class="mt-3 h-24 w-full rounded-lg border border-edge bg-input p-3 text-sm text-fg" placeholder="답변 내용"></textarea><div class="mt-3 flex gap-2"><button type="button" data-save-answer class="h-9 flex-1 rounded-lg bg-accent text-sm font-bold text-on-accent">저장</button><button type="button" data-close-answer class="h-9 rounded-lg px-3 text-sm font-bold text-muted">닫기</button></div></div>`
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-answer]')) dialog.remove()
    if (!event.target.closest('[data-save-answer]')) return
    const text = dialog.querySelector('[data-answer-body]').value.trim()
    if (!text) return toast('답변을 입력해 주세요.')
    const latest = store()
    const item = latest.inquiries.find((inquiry) => String(inquiry.id) === String(id))
    if (!item) return
    item.answer = text
    item.status = '답변'
    logAction(latest, `문의 답변 ${item.title}`)
    commit(latest)
    dialog.remove()
    location.reload()
  })
  document.body.appendChild(dialog)
}

function stamp() {
  const now = new Date()
  return `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function field(label, value, name, type = 'text') {
  return `<label class="block"><span class="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">${label}</span><input data-field="${name}" type="${type}" value="${value ?? ''}" class="h-10 w-full rounded-lg border border-edge bg-input px-3 text-sm font-bold text-fg focus:border-accent focus:outline-none"></label>`
}

function panel(title, body) {
  return `<section class="bg-card border border-edge rounded-xl overflow-hidden"><div class="flex items-center justify-between gap-3 border-b border-edge-soft px-4 py-3"><h2 class="text-sm font-bold text-fg">${title}</h2></div><div class="space-y-3 p-4">${body}</div></section>`
}

function tableWrap(headers, rows) {
  const head = headers.map((header) => `<th class="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted">${header}</th>`).join('')
  const body = rows.join('')
  return `<div class="overflow-x-auto"><table class="w-full border-collapse text-[13px]"><thead><tr class="border-b border-edge">${head}</tr></thead><tbody>${body}</tbody></table></div>`
}

function cell(text, extra = '') {
  const cleaned = extra.replace(/\btext-(left|right|start|end)\b/g, '').trim()
  return `<td class="px-3 py-2.5 align-middle whitespace-nowrap text-center ${cleaned}">${text}</td>`
}

function realRows(games) {
  return games.map((game) => `<tr class="border-b border-edge-soft">${cell(testTag(game.league), 'text-dim')}${cell(game.when, 'text-muted')}${cell(testTag(game.name), 'font-bold')}${cell(game.score, 'font-black tabular-nums')}${cell(testTag(game.note), 'text-dim')}${cell(`<span class="${STATUS_CLASS[game.status] || ''}">${game.status}</span>`)}</tr>`).join('')
}

function realBoard(title, games) {
  return panel(title, `<p class="text-xs text-muted">2026년 10월 KBO 포스트시즌과 MLB 리그 챔피언십 발표 일정·결과입니다. 테스트 항목에는 (t)가 붙습니다.</p>${tableWrap(['리그', '시각', '경기', '스코어', '내용', '상태'], [realRows(games)])}`)
}

function sectionOf(title) {
  return [...document.querySelectorAll('main h2')].find((item) => item.textContent.trim() === title)?.closest('section') || null
}

function sportOf(league) {
  const name = String(league || '').replace(/\s+/g, '')
  if (/MLB|KBO|NPB|CPBL|야구/.test(name)) return '야구'
  if (/NBA|KBL|WKBL|농구/.test(name)) return '농구'
  if (/NHL|하키/.test(name)) return '아이스하키'
  if (/NFL/.test(name)) return '미식축구'
  if (/NPL|EPL|K리그|라리가|분데스|세리에|리그앙|J리그|축구|MLS|UEFA|프리미어/.test(name)) return '축구'
  return '기타'
}

function paintBetMarkets() {
  const heading = [...document.querySelectorAll('main h2')].find((item) => item.textContent.trim() === '최근 배팅 내역' || item.textContent.trim() === '배팅 내역' || item.textContent.trim() === '최근 베팅 10건')
  const table = heading?.closest('section')?.querySelector('table')
  const headRow = table?.tHead?.rows[0]
  const body = table?.tBodies[0]
  if (!headRow || !body) return
  const ensureColumn = (afterLabel, label) => {
    const headers = [...headRow.cells]
    if (headers.some((cell) => cell.textContent.trim() === label)) return
    const after = headers.findIndex((cell) => cell.textContent.trim() === afterLabel)
    if (after < 0) return
    const head = headers[after].cloneNode(false)
    head.textContent = label
    headers[after].after(head)
    ;[...body.rows].forEach((row) => {
      const cell = row.cells[after]?.cloneNode(false)
      if (!cell) return
      cell.textContent = ''
      row.cells[after].after(cell)
    })
  }
  ensureColumn('팀명', '유형')
  ensureColumn('유형', '기준점')
  ensureColumn('기준점', '구분')
  const headers = [...headRow.cells]
  const marketIndex = headers.findIndex((cell) => cell.textContent.trim() === '유형')
  const lineIndex = headers.findIndex((cell) => cell.textContent.trim() === '기준점')
  const whenIndex = headers.findIndex((cell) => cell.textContent.trim() === '구분')
  if (marketIndex < 0) return
  ;[...body.rows].forEach((row) => {
    const odds = Object.keys(BET_MARKETS).find((value) => row.innerText.includes(value))
    const info = odds ? BET_MARKETS[odds] : null
    if (!info) return
    row.cells[marketIndex].textContent = info.market
    if (row.cells[lineIndex]) row.cells[lineIndex].textContent = info.line || '-'
    if (row.cells[whenIndex]) row.cells[whenIndex].textContent = info.when
  })
}

function splitBetMatchColumn() {
  ;[...document.querySelectorAll('main table')].forEach((table) => {
    if (table.dataset.matchSplit === '1') return
    const headers = [...table.querySelectorAll('thead th')]
    const index = headers.findIndex((th) => th.textContent.trim() === '경기명')
    if (index < 0) return
    headers[index].textContent = '리그'
    const sportHead = headers[index].cloneNode(false)
    sportHead.textContent = '종목'
    const teamHead = headers[index].cloneNode(false)
    teamHead.textContent = '팀명'
    headers[index].after(sportHead, teamHead)
    ;[...table.tBodies[0].rows].forEach((row) => {
      const cell = row.cells[index]
      if (!cell) return
      const parts = [...(cell.querySelector(':scope > span')?.children || [])]
      const leagueNode = parts.find((node) => node.className.includes('text-muted') && node.querySelector('img'))
      const teamNode = parts.find((node) => node.className.includes('text-fg'))
      const league = (leagueNode?.textContent || '').trim()
      const leagueCell = cell.cloneNode(false)
      if (leagueNode) leagueCell.append(leagueNode.cloneNode(true))
      else leagueCell.textContent = league
      const sportCell = cell.cloneNode(false)
      sportCell.textContent = sportOf(league)
      const teamCell = cell.cloneNode(false)
      if (teamNode) teamCell.append(teamNode.cloneNode(true))
      cell.replaceWith(leagueCell, sportCell, teamCell)
    })
    table.dataset.matchSplit = '1'
    stripExtraMatches(table)
  })
}

function stripExtraMatches(root) {
  if (!root) return
  root.querySelectorAll('span, div').forEach((node) => {
    if (node.children.length) return
    if (/^외\s*\d+\s*경기$/.test(node.textContent.trim())) node.remove()
  })
  const leftover = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    if (/외\s*\d+\s*경기/.test(node.textContent)) leftover.push(node)
  }
  leftover.forEach((item) => {
    item.textContent = item.textContent.replace(/외\s*\d+\s*경기/g, '').replace(/\s{2,}/g, ' ')
    if (!item.textContent.trim()) item.remove()
  })
}

function leagueOf(match) {
  const listed = MATCHES.find((row) => row[1] === match)
  if (listed) return listed[0]
  const game = REAL_GAMES.find((item) => item.name === match)
  return game?.league || '기타'
}

function sideOf(match, pick) {
  const name = String(pick || '').replace(/\s+/g, '')
  if (/무승부|^무$|draw/i.test(name)) return '무'
  const [home, away] = String(match || '').split(/\s+vs\s+/i).map((item) => item.replace(/\s+/g, ''))
  if (name && away && (away.includes(name) || name.includes(away))) return '패'
  if (name && home && (home.includes(name) || name.includes(home))) return '승'
  return '승'
}

function marketOf(odds, match, pick) {
  return BET_MARKETS[String(odds)] || { market: '승무패', line: sideOf(match, pick), when: '일반' }
}

function currentMatchBets(data) {
  const map = new Map()
  const add = (match, stake, payout, info) => {
    const name = String(match || '').trim()
    if (!name) return
    const key = `${name}|${info.market}|${info.line}|${info.when}`
    const row = map.get(key) || { match: name, league: leagueOf(name), market: info.market, line: info.line || '-', when: info.when, count: 0, stake: 0, payout: 0 }
    row.count += 1
    row.stake += Number(stake) || 0
    row.payout += Number(payout) || 0
    row.sport = sportOf(row.league)
    row.risk = Math.max(0, row.payout - row.stake)
    map.set(key, row)
  }
  BETS.forEach((bet) => add(bet[2], bet[3], bet[5], marketOf(bet[4])))
  ;(data.placedBets || []).forEach((bet) => add(bet.match, bet.stake, Math.round(Number(bet.stake) * Number(bet.odds)), marketOf(bet.odds, bet.match, bet.pick)))
  return [...map.values()]
}

function byIncoming(rows) {
  return [...rows].sort((a, b) => b.count - a.count || b.stake - a.stake)
}

const HOT_PAD_ROWS = [
  { match: 'LA 다저스 vs 샌디에이고 파드리스 (t)', league: 'MLB (t)', sport: '야구 (t)', market: '승무패 (t)', line: '승', when: '일반 (t)', count: 3, stake: 18000, payout: 32400, risk: 14400 },
  { match: '맨체스터 시티 vs 아스널 (t)', league: 'EPL (t)', sport: '축구 (t)', market: '핸디캡 (t)', line: '-0.5', when: '실시간 (t)', count: 2, stake: 15000, payout: 25500, risk: 10500 },
  { match: '보스턴 셀틱스 vs 뉴욕 닉스 (t)', league: 'NBA (t)', sport: '농구 (t)', market: '언더오버 (t)', line: '215.5', when: '일반 (t)', count: 2, stake: 12000, payout: 21600, risk: 9600 },
  { match: '토트넘 vs 첼시 (t)', league: 'EPL (t)', sport: '축구 (t)', market: '승무패 (t)', line: '무', when: '일반 (t)', count: 1, stake: 9000, payout: 19800, risk: 10800 },
  { match: 'LA 레이커스 vs 골든스테이트 (t)', league: 'NBA (t)', sport: '농구 (t)', market: '핸디캡 (t)', line: '+3.5', when: '실시간 (t)', count: 1, stake: 8000, payout: 15200, risk: 7200 },
]

function padHotRows(rows, limit = 5) {
  const list = [...rows]
  const used = new Set(list.map((row) => row.match))
  for (const sample of HOT_PAD_ROWS) {
    if (list.length >= limit) break
    if (used.has(sample.match)) continue
    list.push({ ...sample })
    used.add(sample.match)
  }
  return list.slice(0, limit)
}

const MATCH_FACE = new Map()

function faceKey(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/외\s*\d+\s*경기/g, '').trim()
}

function rememberFaces() {
  document.querySelectorAll('[data-lower-board] tbody tr').forEach((row) => {
    const teamCell = [...row.cells].find((cell) => cell.innerText.includes('vs'))
    if (!teamCell) return
    const key = faceKey(teamCell.innerText)
    if (!key || MATCH_FACE.has(key)) return
    const leagueCell = [...row.cells].find((cell) => cell.querySelector('img') && !cell.innerText.includes('vs'))
    MATCH_FACE.set(key, {
      league: leagueCell?.innerHTML || '',
      team: teamCell.innerHTML,
    })
  })
}

function faceNode(html, fallback) {
  const span = document.createElement('span')
  if (html) span.innerHTML = html
  else span.textContent = fallback
  return span
}

function fillHotTable(title, headers, lines) {
  const heading = [...document.querySelectorAll('[data-rank-frame] h2')].find((item) => item.textContent.trim() === title)
  const table = heading?.closest('section')?.querySelector('table')
  const headRow = table?.tHead?.rows[0]
  const body = table?.tBodies[0]
  if (!headRow || !body) return
  headRow.replaceChildren(...headers.map((label) => {
    const cell = document.createElement('th')
    cell.textContent = label
    return cell
  }))
  if (!lines.length) {
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.colSpan = headers.length
    cell.textContent = '들어온 배팅이 없습니다.'
    row.append(cell)
    body.replaceChildren(row)
    return
  }
  body.replaceChildren(...lines.map((values) => {
    const row = document.createElement('tr')
    values.forEach((value) => {
      const cell = document.createElement('td')
      if (value instanceof Node) cell.append(value)
      else cell.textContent = value
      row.append(cell)
    })
    return row
  }))
}

function matchSidesOf(text, html) {
  if (html) {
    const wrap = document.createElement('div')
    wrap.innerHTML = html
    const vs = [...wrap.querySelectorAll('span')].find((node) => /^vs$/i.test(node.textContent.trim()) && !node.querySelector('img'))
    if (vs?.parentElement) {
      const kids = [...vs.parentElement.childNodes]
      const index = kids.indexOf(vs)
      const home = document.createElement('span')
      const away = document.createElement('span')
      kids.slice(0, index).forEach((node) => home.append(node.cloneNode(true)))
      kids.slice(index + 1).forEach((node) => away.append(node.cloneNode(true)))
      return { home, away }
    }
  }
  const parts = String(text || '').split(/\s+vs\s+/i)
  return {
    home: (parts[0] || text || '-').trim(),
    away: (parts.slice(1).join(' vs ') || '-').trim(),
  }
}

function sidesFromCell(cell) {
  if (cell.querySelector('[data-vs-row]')) {
    return {
      home: cell.querySelector('[data-vs-side="home"]')?.cloneNode(true) || '-',
      away: cell.querySelector('[data-vs-side="away"]')?.cloneNode(true) || '-',
    }
  }
  const vs = [...cell.querySelectorAll('span')].find((node) => /^vs$/i.test(node.textContent.trim()) && !node.querySelector('img'))
  if (vs?.parentElement) {
    const kids = [...vs.parentElement.childNodes]
    const index = kids.indexOf(vs)
    const home = document.createElement('span')
    const away = document.createElement('span')
    kids.slice(0, index).forEach((node) => home.append(node.cloneNode(true)))
    kids.slice(index + 1).forEach((node) => away.append(node.cloneNode(true)))
    return { home, away }
  }
  return matchSidesOf(cell.innerText)
}

function fillSideCell(cell, value) {
  cell.textContent = ''
  if (value instanceof Node) cell.append(value)
  else cell.textContent = value
}

function expandTeamColumns(root) {
  if (!root) return
  root.querySelectorAll('table').forEach((table) => {
    if (table.dataset.teamSplit === '1') return
    const head = table.tHead?.rows[0]
    const body = table.tBodies[0]
    if (!head || !body) return
    const index = [...head.cells].findIndex((cell) => cell.textContent.trim() === '팀명')
    if (index < 0) return
    const teamHead = head.cells[index]
    const homeHead = teamHead.cloneNode(false)
    homeHead.textContent = '홈팀'
    homeHead.dataset.homeCol = '1'
    const vsHead = teamHead.cloneNode(false)
    vsHead.textContent = 'VS'
    vsHead.dataset.vsCol = '1'
    const awayHead = teamHead.cloneNode(false)
    awayHead.textContent = '원정'
    awayHead.dataset.awayCol = '1'
    teamHead.replaceWith(homeHead, vsHead, awayHead)
    ;[...body.rows].forEach((row) => {
      const cell = row.cells[index]
      if (!cell) return
      const sides = sidesFromCell(cell)
      const homeCell = cell.cloneNode(false)
      homeCell.dataset.homeCol = '1'
      fillSideCell(homeCell, sides.home)
      const vsCell = cell.cloneNode(false)
      vsCell.dataset.vsCol = '1'
      vsCell.textContent = 'VS'
      const awayCell = cell.cloneNode(false)
      awayCell.dataset.awayCol = '1'
      fillSideCell(awayCell, sides.away)
      cell.replaceWith(homeCell, vsCell, awayCell)
    })
    table.dataset.teamSplit = '1'
  })
}

function openRiskRows(data) {
  return openBetsOf(data).map((bet) => {
    const info = marketOf(bet[4], bet[2])
    const stake = Number(bet[3]) || 0
    const payout = Number(bet[5]) || 0
    const league = leagueOf(bet[2])
    return {
      login: bet[0],
      nick: bet[1],
      match: bet[2],
      stake,
      payout,
      risk: Math.max(0, payout - stake),
      league,
      sport: sportOf(league),
      market: info.market,
      line: info.line || '-',
      when: info.when || '일반',
    }
  })
}

function groupRiskRows(rows, keyOf) {
  const map = new Map()
  rows.forEach((row) => {
    const key = keyOf(row)
    const current = map.get(key) || {
      ...row,
      key,
      count: 0,
      stake: 0,
      payout: 0,
      risk: 0,
      matches: new Set(),
    }
    current.count += 1
    current.stake += row.stake
    current.payout += row.payout
    current.risk += row.risk
    current.matches.add(row.match)
    map.set(key, current)
  })
  return [...map.values()]
    .map((row) => ({ ...row, matchCount: row.matches.size, matches: undefined }))
    .sort((a, b) => b.risk - a.risk || b.stake - a.stake)
}

function riskMoney(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`
}

function memberLabel(nick, login) {
  const id = String(login || '').trim()
  const name = testTag(nick || id || '-')
  if (!id) return name
  return `${name} (${id})`
}

function fillRiskTable(root, title, headers, lines) {
  const heading = [...root.querySelectorAll('h2')].find((item) => item.textContent.trim() === title)
  const table = heading?.closest('section')?.querySelector('table')
  const headRow = table?.tHead?.rows[0]
  const body = table?.tBodies[0]
  if (!headRow || !body) return
  headRow.replaceChildren(...headers.map((label) => {
    const cell = document.createElement('th')
    cell.textContent = label
    return cell
  }))
  if (!lines.length) {
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.colSpan = headers.length
    cell.textContent = '정산 전 배팅이 없습니다.'
    row.append(cell)
    body.replaceChildren(row)
    return
  }
  body.replaceChildren(...lines.map((values) => {
    const row = document.createElement('tr')
    values.forEach((value) => {
      const cell = document.createElement('td')
      if (value instanceof Node) cell.append(value)
      else cell.textContent = value
      row.append(cell)
    })
    return row
  }))
}

function makeRiskSection(title) {
  const section = document.createElement('section')
  const head = document.createElement('div')
  const heading = document.createElement('h2')
  heading.textContent = title
  head.append(heading)
  const wrap = document.createElement('div')
  wrap.className = 'overflow-x-auto'
  const table = document.createElement('table')
  table.append(document.createElement('thead'), document.createElement('tbody'))
  table.tHead.append(document.createElement('tr'))
  wrap.append(table)
  section.append(head, wrap)
  return section
}

function makeRiskMetricCard(label, starter = '0') {
  const card = document.createElement('div')
  card.className = 'bg-card rounded-xl border border-edge px-3.5 py-3 flex flex-col items-center justify-center text-center gap-1'
  const name = document.createElement('div')
  name.className = 'text-[11px] font-bold tracking-wider text-muted'
  name.textContent = label
  const value = document.createElement('div')
  value.className = 'text-lg font-black tabular-nums text-fg'
  value.textContent = starter
  card.append(name, value)
  return card
}

function ensureRiskSummaryCards() {
  if (!location.pathname.endsWith('/risk.html')) return
  const ready = document.querySelector('[data-risk-summary][data-risk-ready="2"]')
  if (ready?.querySelector('[data-risk-zones]') && ready.textContent.includes('진행 중인 라이브 경기 수')) return
  document.querySelectorAll('[data-risk-summary]').forEach((node) => node.remove())
  const grid = [...document.querySelectorAll('main .grid')].find((node) =>
    [...node.querySelectorAll('p,div')].some((item) => /미확정 리스크 금액|전체 최대 잠재손실|위험 경기|위험 건수|진행 중 배팅/.test(item.textContent || '')),
  )
  if (!grid) return
  const wrap = document.createElement('div')
  wrap.dataset.riskSummary = '1'
  wrap.dataset.riskReady = '2'
  wrap.className = 'space-y-3'
  const top = document.createElement('div')
  top.className = 'grid grid-cols-2 gap-2.5'
  const riskCard = document.createElement('div')
  riskCard.className = 'rounded-xl border border-edge bg-card px-3.5 py-3 text-center'
  riskCard.innerHTML = '<p class="text-[11px] font-bold uppercase tracking-wider text-muted">미확정 리스크 금액</p><p class="mt-1 font-black tabular-nums text-xl text-danger">0</p>'
  const liveCard = document.createElement('div')
  liveCard.className = 'rounded-xl border border-edge bg-card px-3.5 py-3 text-center'
  liveCard.innerHTML = '<p class="text-[11px] font-bold uppercase tracking-wider text-muted">진행 중인 라이브 경기 수</p><p class="mt-1 font-black tabular-nums text-lg text-fg">0</p>'
  top.append(riskCard, liveCard)
  const zones = document.createElement('div')
  zones.dataset.riskZones = '1'
  zones.dataset.statusZones = '1'
  ;[
    ['진행 중 배팅 ( 라이브 )', 'live'],
    ['진행 중 배팅 ( 일반 )', 'sport'],
  ].forEach(([title, tone]) => {
    appendStatusZone(zones, title, tone, [
      makeRiskMetricCard('건수', '0건'),
      makeRiskMetricCard('금액', '0원'),
    ], 2)
  })
  wrap.append(top, zones)
  grid.replaceWith(wrap)
}

function paintRiskSummary(open, liveNames) {
  if (!location.pathname.endsWith('/risk.html')) return
  ensureRiskSummaryCards()
  const liveBets = open.filter((bet) => marketOf(bet[4], bet[2]).when === '실시간')
  const normalBets = open.filter((bet) => marketOf(bet[4], bet[2]).when !== '실시간')
  const stakeSum = (rows) => rows.reduce((sum, bet) => sum + Number(bet[3] || 0), 0)
  setLabel('미확정 리스크 금액', num(open.reduce((sum, bet) => sum + Math.max(0, Number(bet[5]) - Number(bet[3])), 0)))
  setLabel('진행 중인 라이브 경기 수', countText(liveNames.length, '건'))
  const liveSection = document.querySelector('[data-risk-zones] [data-tone="live"]')
  const normalSection = document.querySelector('[data-risk-zones] [data-tone="sport"]')
  setLabelIn(liveSection, '건수', countText(liveBets.length, '건'))
  setLabelIn(liveSection, '금액', wonText(stakeSum(liveBets)))
  setLabelIn(normalSection, '건수', countText(normalBets.length, '건'))
  setLabelIn(normalSection, '금액', wonText(stakeSum(normalBets)))
}

function reshapeRisk() {
  if (!location.pathname.endsWith('/risk.html')) return
  ensureRiskSummaryCards()
  if (document.querySelector('[data-risk-board]')) return
  const stack = document.querySelector('main > .space-y-4')
  if (!stack) return
  const empty = [...stack.children].find((node) => /현재 베팅이 걸린/.test(node.textContent || ''))
  const board = document.createElement('div')
  board.dataset.riskBoard = '1'
  board.append(
    makeRiskSection('경기별 최대 리스크'),
    makeRiskSection('종목별 최대 리스크'),
    makeRiskSection('유형별 최대 리스크'),
  )
  if (empty) empty.replaceWith(board)
  else {
    const member = [...stack.querySelectorAll('section')].find((section) => section.querySelector('h2')?.textContent.includes('회원별 리스크'))
    if (member) member.before(board)
    else stack.append(board)
  }
}

function openCasinoRiskRows(data) {
  return (data.casinoBets || [])
    .filter((bet) => bet.status === '진행 중' && bet.login)
    .map((bet) => {
      const stake = Number(bet.stake) || 0
      const payout = Number(bet.payout) || 0
      return {
        login: bet.login,
        nick: bet.nick || data.users?.[bet.login]?.nick || bet.login,
        match: bet.name || '카지노',
        stake,
        payout,
        risk: Math.max(0, payout - stake),
      }
    })
}

function riskBucketOf(map, login) {
  return map.get(login) || { count: 0, stake: 0, risk: 0, nick: login }
}

function fillRiskMemberTable(section, lines) {
  const table = section.querySelector('[data-risk-members] table')
  const head = table?.tHead
  const body = table?.tBodies[0]
  if (!head || !body) return
  const sportBg = 'rgba(34, 224, 122, 0.10)'
  const casinoBg = 'rgba(59, 130, 246, 0.10)'
  const tint = (cell, kind) => {
    cell.style.background = kind === 'sport' ? sportBg : casinoBg
  }
  const top = document.createElement('tr')
  const nickHead = document.createElement('th')
  nickHead.textContent = '닉네임(아이디)'
  nickHead.rowSpan = 2
  top.append(nickHead)
  ;[
    ['스포츠', 'sport'],
    ['카지노', 'casino'],
  ].forEach(([label, kind]) => {
    const cell = document.createElement('th')
    cell.textContent = label
    cell.colSpan = 4
    tint(cell, kind)
    top.append(cell)
  })
  const sub = document.createElement('tr')
  ;['sport', 'casino'].forEach((kind) => {
    ;['건수', '금액', '예상 리스크', '보유머니'].forEach((label) => {
      const cell = document.createElement('th')
      cell.textContent = label
      tint(cell, kind)
      sub.append(cell)
    })
  })
  head.replaceChildren(top, sub)
  if (!lines.length) {
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.colSpan = 9
    cell.textContent = '정산 전 배팅이 없습니다.'
    row.append(cell)
    body.replaceChildren(row)
    return
  }
  body.replaceChildren(...lines.map((values) => {
    const row = document.createElement('tr')
    values.forEach((value, index) => {
      const cell = document.createElement('td')
      if (value instanceof Node) cell.append(value)
      else cell.textContent = value
      if (index >= 1 && index <= 4) tint(cell, 'sport')
      if (index >= 5 && index <= 8) tint(cell, 'casino')
      row.append(cell)
    })
    return row
  }))
}

function paintRiskMembers(data, rows) {
  const section = [...document.querySelectorAll('main h2')].find((item) => item.textContent.includes('회원별 리스크'))?.closest('section')
  if (!section) return
  const empty = [...section.children].find((node) => node.tagName === 'DIV' && /없습니다/.test(node.textContent || ''))
  let host = section.querySelector('[data-risk-members]')
  if (!host) {
    host = document.createElement('div')
    host.dataset.riskMembers = '1'
    host.className = 'overflow-x-auto'
    const table = document.createElement('table')
    table.className = 'w-full border-collapse text-[13px]'
    table.append(document.createElement('thead'), document.createElement('tbody'))
    host.append(table)
    if (empty) empty.replaceWith(host)
    else section.append(host)
  }
  const sportMap = new Map(groupRiskRows(rows, (row) => row.login).map((row) => [row.login, row]))
  const casinoMap = new Map(groupRiskRows(openCasinoRiskRows(data), (row) => row.login).map((row) => [row.login, row]))
  const logins = [...new Set([...sportMap.keys(), ...casinoMap.keys()])]
  const members = logins.map((login) => {
    const sport = riskBucketOf(sportMap, login)
    const casino = riskBucketOf(casinoMap, login)
    const user = data.users?.[login]
    const nick = user?.nick || sport.nick || casino.nick || login
    const money = Number(user?.money || 0)
    return {
      login,
      nick,
      money,
      sport,
      casino,
      sortRisk: Number(sport.risk || 0) + Number(casino.risk || 0),
      sortStake: Number(sport.stake || 0) + Number(casino.stake || 0),
    }
  }).sort((a, b) => b.sortRisk - a.sortRisk || b.sortStake - a.sortStake)
  fillRiskMemberTable(section, members.map((row) => [
    memberLabel(row.nick, row.login),
    `${row.sport.count || 0}건`,
    riskMoney(row.sport.stake),
    riskMoney(row.sport.risk),
    riskMoney(row.money),
    `${row.casino.count || 0}건`,
    riskMoney(row.casino.stake),
    riskMoney(row.casino.risk),
    riskMoney(row.money),
  ]))
}

function paintRiskMonitor(data = store()) {
  if (!location.pathname.endsWith('/risk.html')) return
  reshapeRisk()
  const board = document.querySelector('[data-risk-board]')
  if (!board) return
  const rows = openRiskRows(data)
  const byMatch = groupRiskRows(rows, (row) => row.match)
  const bySport = groupRiskRows(rows, (row) => row.sport)
  const byMarket = groupRiskRows(rows, (row) => `${row.market}|${row.when}`)
  fillRiskTable(board, '경기별 최대 리스크', ['리그', '종목', '홈팀', 'VS', '원정', '건수', '배팅금', '예상 지급', '최대 리스크'], byMatch.map((row) => {
    const sides = matchSidesOf(row.match)
    return [
      testTag(row.league),
      testTag(row.sport),
      testTag(sides.home),
      'VS',
      testTag(sides.away),
      `${row.count}건`,
      riskMoney(row.stake),
      riskMoney(row.payout),
      riskMoney(row.risk),
    ]
  }))
  fillRiskTable(board, '종목별 최대 리스크', ['종목', '경기 수', '건수', '배팅금', '예상 지급', '최대 리스크'], bySport.map((row) => [
    testTag(row.sport),
    `${row.matchCount}경기`,
    `${row.count}건`,
    riskMoney(row.stake),
    riskMoney(row.payout),
    riskMoney(row.risk),
  ]))
  fillRiskTable(board, '유형별 최대 리스크', ['유형', '구분', '건수', '배팅금', '예상 지급', '최대 리스크'], byMarket.map((row) => [
    testTag(row.market),
    testTag(row.when),
    `${row.count}건`,
    riskMoney(row.stake),
    riskMoney(row.payout),
    riskMoney(row.risk),
  ]))
  paintRiskMembers(data, rows)
  const refreshed = [...document.querySelectorAll('main span')].find((node) => /^갱신\s/.test(node.textContent.trim()))
  if (refreshed) refreshed.textContent = `갱신 ${stamp()}`
}

function paintCurrentHot(data) {
  if (!location.pathname.endsWith('/dashboard.html')) return
  const board = document.querySelector('[data-lower-board]')
  stripExtraMatches(board)
  rememberFaces()
  board?.querySelectorAll('table').forEach((table) => { delete table.dataset.teamSplit })
  const rows = padHotRows(byIncoming(currentMatchBets(data)), 5)
  const count = (value) => `${value}건`
  const money = (value) => `${Number(value).toLocaleString('ko-KR')}원`
  const faceLine = (row, kind) => {
    const face = MATCH_FACE.get(row.match) || MATCH_FACE.get(String(row.match || '').replace(/\s*\(t\)\s*$/, ''))
    const sides = matchSidesOf(row.match, face?.team)
    const tagSide = (side) => (side instanceof Node ? side : testTag(side))
    const league = faceNode(face?.league, testTag(row.league))
    if (kind === '유형') return [league, tagSide(sides.home), 'VS', tagSide(sides.away), testTag(row.market), row.line || '-', testTag(row.when), count(row.count), money(row.stake), money(row.risk)]
    return [league, testTag(row.sport), tagSide(sides.home), 'VS', tagSide(sides.away), count(row.count), money(row.stake), money(row.risk)]
  }
  const sportRows = padHotRows(byIncoming(currentMatchBets(data).reduce((map, row) => {
    const current = map.get(row.match) || { ...row, count: 0, stake: 0, payout: 0, risk: 0 }
    current.count += row.count
    current.stake += row.stake
    current.payout += row.payout
    current.risk = Math.max(0, current.payout - current.stake)
    map.set(row.match, current)
    return map
  }, new Map()).values()), 5)
  fillHotTable('정산 전 최다 배팅 TOP 5 ( 종목별 )', ['리그', '종목', '홈팀', 'VS', '원정', '건수', '금액', '예상 리스크'], sportRows.map((row) => faceLine(row, '종목')))
  fillHotTable('정산 전 최다 배팅 TOP 5 ( 유형별 )', ['리그', '홈팀', 'VS', '원정', '유형', '기준점', '구분', '건수', '금액', '예상 리스크'], rows.map((row) => faceLine(row, '유형')))
  ;[
    ['정산 전 최다 배팅 TOP 5 ( 종목별 )', 2],
    ['정산 전 최다 배팅 TOP 5 ( 유형별 )', 1],
  ].forEach(([title, start]) => {
    const heading = [...document.querySelectorAll('[data-rank-frame] h2')].find((item) => item.textContent.trim() === title)
    const table = heading?.closest('section')?.querySelector('table')
    if (!table) return
    table.dataset.teamSplit = '1'
    ;[table.tHead?.rows[0], ...table.tBodies[0].rows].forEach((row) => {
      if (!row) return
      if (row.cells[0]) row.cells[0].dataset.leagueCol = '1'
      if (row.cells[start]) row.cells[start].dataset.homeCol = '1'
      if (row.cells[start + 1]) row.cells[start + 1].dataset.vsCol = '1'
      if (row.cells[start + 2]) row.cells[start + 2].dataset.awayCol = '1'
    })
  })
  expandTeamColumns(board)
  alignMatchColumns(board)
}

function reshapeDashboard() {
  if (!location.pathname.endsWith('/dashboard.html') || document.querySelector('[data-lower-board]')) return
  const zones = document.querySelector('[data-status-zones]')
  const flow = sectionOf('금일의 자금 흐름')
  const chart = sectionOf('최근 15일 자금 흐름')
  const snap = sectionOf('현재 스냅샷')
  const games = sectionOf('누적 베팅금액 TOP10 - 경기')
  const teams = sectionOf('누적 베팅금액 TOP10 - 팀')
  const bets = sectionOf('최근 베팅 10건')
  if (!zones || !games || !teams || !bets) return
  splitBetMatchColumn()
  const titles = new Map([
    [games, '정산 전 최다 배팅 TOP 5 ( 유형별 )'],
    [teams, '정산 전 최다 배팅 TOP 5 ( 종목별 )'],
    [bets, '최근 배팅 내역'],
  ])
  titles.forEach((title, section) => {
    const heading = section.querySelector('h2')
    if (heading) heading.textContent = title
  })
  document.querySelectorAll('main a').forEach((link) => {
    if (link.textContent.includes('정산 통계 자세히 보기')) link.textContent = '정산으로 이동'
  })
  flow?.remove()
  snap?.remove()
  chart?.remove()
  const board = document.createElement('div')
  board.dataset.lowerBoard = '1'
  const row = (name, ...nodes) => {
    const wrap = document.createElement('div')
    wrap.dataset.lowerRow = name
    nodes.forEach((node) => wrap.appendChild(node))
    return wrap
  }
  const rank = document.createElement('div')
  rank.dataset.rankFrame = '1'
  const rankGrid = document.createElement('div')
  rankGrid.dataset.rankGrid = '1'
  rankGrid.append(teams, games)
  rank.append(rankGrid)
  board.append(row('bets', bets), rank)
  zones.after(board)
  ;[...zones.parentElement.children].forEach((node) => {
    if (node === zones || node === board) return
    if (!node.querySelector('section, table, svg')) node.remove()
  })
}

function paintDashboardMatches() {
  if (!location.pathname.endsWith('/dashboard.html')) return
  ensureStatusBoard()
  reshapeDashboard()
}

function todayStamp(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function spanRange(span) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!span) return null
  if (span === '금일') return { from: todayStamp(today), to: todayStamp(today) }
  if (span === '금월') {
    return { from: todayStamp(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayStamp(today) }
  }
  if (span === '전월') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end = new Date(today.getFullYear(), today.getMonth(), 0)
    return { from: todayStamp(start), to: todayStamp(end) }
  }
  const days = Number(String(span).replace('일', ''))
  if (!days) return null
  const start = new Date(today)
  start.setDate(today.getDate() - (days - 1))
  return { from: todayStamp(start), to: todayStamp(today) }
}

function syncSettleDateFaces(root = document) {
  root.querySelectorAll('[data-settle-date]').forEach((wrap) => {
    const input = wrap.querySelector('input[type="date"]')
    let face = wrap.querySelector('[data-settle-face]')
    if (!input) return
    if (!face) {
      face = document.createElement('button')
      face.type = 'button'
      face.dataset.settleFace = '1'
      face.setAttribute('aria-label', '날짜 선택')
      wrap.insertBefore(face, input)
      face.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const opener = wrap.querySelector('[data-open-cal]')
        if (opener) openSettleCalendar(opener)
      })
    }
    face.textContent = input.value || '----.--.--'
  })
}

function applySettleQuery(form, options = {}) {
  const span = form.querySelector('[data-settle-span]').value
  const from = form.querySelector('[data-settle-from]')
  const to = form.querySelector('[data-settle-to]')
  const periodButtons = [...document.querySelectorAll('[data-settle-legacy] button')].filter((button) => /금일|오늘|금월|전월|\d+일/.test(labelOf(button)))
  const onClass = periodButtons.find((button) => button.className.includes('bg-accent'))?.className
    || 'px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors bg-accent-soft text-accent'
  const offClass = 'px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors text-dim'
  if (span) {
    const range = spanRange(span)
    if (range) {
      from.value = range.from
      to.value = range.to
    }
  } else if (!from.value && !to.value) {
    const today = todayStamp()
    from.value = today
    to.value = today
  }
  const target = span
    ? periodButtons.find((button) => labelOf(button) === span || (span === '금일' && /금일|오늘/.test(labelOf(button))))
    : null
  periodButtons.forEach((button) => {
    button.className = button === target ? onClass : offClass
  })
  syncSettleDateFaces(form)
  refreshTables()
  paintCashDetail()
  paintSettleLedger()
  paintSettleSamples()
  paintSettlePlan()
  const toggle = form.querySelector('[data-span-toggle]')
  const chosen = form.querySelector('[data-settle-span]')?.selectedOptions[0]
  if (toggle && chosen) toggle.textContent = chosen.textContent
  if (options.announce) {
    const search = form.querySelector('[data-settle-search]')
    if (search) {
      search.dataset.on = '1'
      clearTimeout(search._flash)
      search._flash = setTimeout(() => { delete search.dataset.on }, 220)
    }
    toast(`조회했습니다. ${from.value || '----.--.--'} ~ ${to.value || '----.--.--'}`)
  }
}

function bindSettlePopovers() {
  if (document.documentElement.dataset.settlePop === '1') return
  document.documentElement.dataset.settlePop = '1'
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-settle-cal], [data-open-cal], [data-settle-face], [data-span-menu], [data-span-toggle]')) return
    document.querySelectorAll('[data-settle-cal], [data-span-menu]').forEach((node) => node.remove())
  })
}

function paintSettleCalendar(pop, input) {
  const cursor = pop._cursor
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const names = ['일', '월', '화', '수', '목', '금', '토']
  const days = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const stamp = todayStamp(date)
    const marks = [
      date.getMonth() === month ? '' : ' data-out="1"',
      stamp === input.value ? ' data-on="1"' : '',
      stamp === todayStamp() ? ' data-today="1"' : '',
    ].join('')
    days.push(`<button type="button" data-cal-day="${stamp}"${marks}>${date.getDate()}</button>`)
  }
  pop.innerHTML = `<div data-cal-head><button type="button" data-cal-prev aria-label="이전달">‹</button><strong>${year}년 ${month + 1}월</strong><button type="button" data-cal-next aria-label="다음달">›</button></div><div data-cal-week>${names.map((name) => `<span>${name}</span>`).join('')}</div><div data-cal-days>${days.join('')}</div>`
}

function openSettleCalendar(button) {
  bindSettlePopovers()
  const wrap = button.parentElement
  const input = wrap?.querySelector('input[type="date"]')
  if (!wrap || !input) return
  const already = wrap.querySelector('[data-settle-cal]')
  document.querySelectorAll('[data-settle-cal], [data-span-menu]').forEach((node) => node.remove())
  if (already) return
  const pop = document.createElement('div')
  pop.dataset.settleCal = '1'
  const picked = input.value ? parseDate(input.value) : new Date()
  pop._cursor = new Date(picked.getFullYear(), picked.getMonth(), 1)
  pop.addEventListener('click', (event) => {
    event.stopPropagation()
    if (event.target.closest('[data-cal-prev], [data-cal-next]')) {
      pop._cursor.setMonth(pop._cursor.getMonth() + (event.target.closest('[data-cal-next]') ? 1 : -1))
      paintSettleCalendar(pop, input)
      return
    }
    const day = event.target.closest('[data-cal-day]')
    if (!day) return
    input.value = day.dataset.calDay
    pop.remove()
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  wrap.append(pop)
  paintSettleCalendar(pop, input)
}

function openSpanMenu(button) {
  bindSettlePopovers()
  const pick = button.parentElement
  const select = pick?.querySelector('select')
  if (!pick || !select) return
  const already = pick.querySelector('[data-span-menu]')
  document.querySelectorAll('[data-settle-cal], [data-span-menu]').forEach((node) => node.remove())
  if (already) return
  const menu = document.createElement('span')
  menu.dataset.spanMenu = '1'
  ;[...select.options].forEach((option) => {
    const item = document.createElement('button')
    item.type = 'button'
    item.textContent = option.textContent
    if (option.selected) item.dataset.on = '1'
    item.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      select.value = option.value
      menu.remove()
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    menu.append(item)
  })
  pick.append(menu)
}

function reshapeFinance() {
  if (!location.pathname.endsWith('/finance.html') || document.querySelector('[data-settle-board]')) return
  const stack = document.querySelector('main > div')
  const grids = [...(stack?.children || [])].filter((node) => node.classList.contains('grid') && node.querySelector('.bg-card') && !node.querySelector('section'))
  const money = grids[0]
  const bets = grids[1]
  const plan = sectionOf('자금 계획 체크')
  const chart = sectionOf('일자별 자금 흐름')
  const calendar = sectionOf('월별 정산 달력')
  const table = sectionOf('일자별 정산표')
  const depositMix = sectionOf('입금 수단 분포')
  const withdrawMix = sectionOf('출금 수단 분포')
  const sportMix = sectionOf('종목별 베팅 분포')
  const depositTop = sectionOf('입금 TOP 10')
  const withdrawTop = sectionOf('출금 TOP 10')
  const winTop = sectionOf('수익 회원 TOP 10')
  const lossTop = sectionOf('손실 회원 TOP 10')
  if (!stack || !money || !bets || !plan || !chart || !calendar || !table || !depositMix || !withdrawMix || !sportMix || !depositTop || !withdrawTop || !winTop || !lossTop) return
  const legacy = [...stack.children].find((node) => node.querySelector('button'))
  if (legacy) legacy.dataset.settleLegacy = '1'
  const titles = new Map([
    [plan, '지급 여유'],
    [table, '일일 장부'],
    [depositMix, '입금 경로 구분'],
    [withdrawMix, '출금 경로 구분'],
    [sportMix, '종목 비중'],
    [depositTop, '총판 라인별 충전 합계'],
    [withdrawTop, '총판 라인별 환전 합계'],
    [winTop, '적자 회원'],
    [lossTop, '흑자 회원'],
  ])
  titles.forEach((title, section) => {
    const heading = section.querySelector('h2')
    if (heading) heading.textContent = title
  })
  ;[
    [winTop, '기간 내 정산 기준 - 운영 적자(회원이 가져간 금액)'],
    [lossTop, '기간 내 정산 기준 - 운영 흑자(회원이 잃은 금액)'],
  ].forEach(([section, text]) => {
    const note = [...section.querySelectorAll('p')].find((node) => /정산 기준/.test(node.textContent))
    if (note) note.textContent = text
  })
  const headRow = table.querySelector('thead tr')
  const names = ['날짜', '입금 금액', '출금 금액', '차이', '건수', '배팅금', '지급금', '총판 수당', '손익']
  if (headRow) {
    headRow.textContent = ''
    names.forEach((name) => {
      const cell = document.createElement('th')
      cell.className = 'px-3 py-2.5 text-[11px] font-bold text-muted uppercase tracking-wider whitespace-nowrap text-center'
      cell.textContent = name
      headRow.append(cell)
    })
  }
  table.dataset.settleLedger = '1'
  const board = document.createElement('div')
  board.dataset.settleBoard = '1'
  const query = document.createElement('form')
  query.dataset.settleQuery = '1'
  const calendarIcon = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M3 10h18M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>'
  query.innerHTML = `<label>조회 시작<span data-settle-date><button type="button" data-settle-face>----.--.--</button><input type="date" data-settle-from tabindex="-1" aria-hidden="true"><button type="button" data-open-cal aria-label="조회 시작 달력">${calendarIcon}</button></span></label><label>조회 끝<span data-settle-date><button type="button" data-settle-face>----.--.--</button><input type="date" data-settle-to tabindex="-1" aria-hidden="true"><button type="button" data-open-cal aria-label="조회 끝 달력">${calendarIcon}</button></span></label><label data-settle-span-label>빠른 구간 선택<span data-settle-pick><select data-settle-span hidden><option value="">수동 선택</option><option value="금일" selected>당일</option><option value="7일">일주일</option><option value="15일">보름</option><option value="30일">한 달</option><option value="90일">석 달</option><option value="금월">이번 달</option><option value="전월">지난 달</option></select><button type="button" data-span-toggle>당일</button></span></label><button type="submit" data-settle-search>검색</button>`
  query.addEventListener('submit', (event) => {
    event.preventDefault()
    applySettleQuery(query, { announce: true })
  })
  query.querySelector('[data-settle-span]').addEventListener('change', () => {
    applySettleQuery(query)
  })
  query.querySelectorAll('[data-settle-from], [data-settle-to]').forEach((input) => {
    input.addEventListener('change', () => {
      query.querySelector('[data-settle-span]').value = ''
      syncSettleDateFaces(query)
      applySettleQuery(query)
    })
  })
  query.querySelectorAll('[data-open-cal], [data-settle-face]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      const opener = button.matches('[data-open-cal]') ? button : button.parentElement?.querySelector('[data-open-cal]')
      if (opener) openSettleCalendar(opener)
    })
  })
  query.querySelector('[data-span-toggle]').addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    openSpanMenu(event.currentTarget)
  })
  const result = document.createElement('section')
  result.dataset.settleBand = 'result'
  const resultTitle = document.createElement('h2')
  resultTitle.textContent = '입출금 세부 내역'
  const metrics = document.createElement('div')
  metrics.dataset.cashDetail = '1'
  result.append(resultTitle, metrics)
  const ledger = document.createElement('div')
  ledger.dataset.settleBand = 'ledger'
  ledger.append(table)
  const reserve = document.createElement('div')
  reserve.dataset.settleBand = 'plan'
  reserve.append(plan)
  const makeMixSection = (title) => {
    const section = document.createElement('section')
    section.className = sportMix.className || 'bg-card border border-edge rounded-xl overflow-hidden'
    const head = document.createElement('div')
    head.className = 'flex items-center justify-between gap-3 px-4 py-3 border-b border-edge-soft'
    const heading = document.createElement('h2')
    heading.className = 'text-sm font-bold text-fg'
    heading.textContent = title
    head.append(heading)
    const body = document.createElement('div')
    body.className = 'p-4'
    section.append(head, body)
    return section
  }
  const typeMix = makeMixSection('유형 비중')
  const channelMix = makeMixSection('카지노 & 스포츠 & 미니게임 비중')
  const sportWin = makeMixSection('흑자 종목')
  const sportLoss = makeMixSection('적자 종목')
  const typeLoss = makeMixSection('적자 유형')
  const typeWin = makeMixSection('흑자 유형')
  const sportSplit = document.createElement('div')
  sportSplit.dataset.settleSplit = '1'
  sportSplit.append(sportMix, typeMix)
  const spread = document.createElement('div')
  spread.dataset.settleBand = 'spread'
  spread.append(depositMix, withdrawMix, channelMix, sportSplit)
  const edge = document.createElement('div')
  edge.dataset.settleBand = 'edge'
  edge.append(sportWin, sportLoss, typeWin, typeLoss)
  const rank = document.createElement('div')
  rank.dataset.settleBand = 'rank'
  rank.append(depositTop, withdrawTop, winTop, lossTop)
  ;[
    [depositMix, 'in'],
    [withdrawMix, 'out'],
    [sportMix, 'sport'],
    [typeMix, 'type'],
    [channelMix, 'casino'],
    [sportWin, 'win'],
    [sportLoss, 'loss'],
    [typeLoss, 'loss'],
    [typeWin, 'win'],
    [depositTop, 'in'],
    [withdrawTop, 'out'],
    [winTop, 'win'],
    [lossTop, 'loss'],
  ].forEach(([section, tone]) => { section.dataset.settleTone = tone })
  const hold = document.createElement('div')
  hold.dataset.settleHold = '1'
  hold.hidden = true
  hold.append(calendar, chart, money, bets)
  board.append(query, result, ledger, reserve, spread, edge, rank, hold)
  stack.append(board)
  applySettleQuery(query)
  ;[...stack.children].forEach((node) => {
    if (node === board || node.dataset.settleLegacy) return
    if (!node.querySelector('section, table, .bg-card')) node.remove()
  })
}

function gradeOf(user) {
  if (user.blocked) return '차단'
  if (user.money >= 100000) return '골드'
  if (user.money >= 50000) return '실버'
  return '등급없음'
}

function chips(labels) {
  return `<div class="flex flex-wrap gap-1">${labels.map((label, index) => `<button type="button" class="px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap ${index ? 'text-dim' : 'bg-accent-soft text-accent'}">${label}</button>`).join('')}</div>`
}

function stat(label, value) {
  return `<div class="rounded-xl border border-edge bg-card p-4"><div class="text-xs text-muted">${label}</div><div class="mt-1 text-lg font-black tabular-nums">${value}</div></div>`
}

function search(placeholder) {
  return `<input placeholder="${placeholder}" class="h-9 w-56 rounded-lg border border-edge bg-input px-3 text-sm text-fg">`
}

function note() {
  return `<p class="text-xs text-muted">저장된 원본 본문이 없어, 입출금·머니내역·정산 화면과 같은 목록 패턴으로 구성했습니다. 테스트 데이터에는 항상 (t)가 붙으며, 실제 연동 후 (t) 항목만 지우면 됩니다.</p>`
}

function matchCards(games) {
  return `<div class="grid gap-3">${games.map((game) => {
    const picks = (game.picks || []).map(([pick, odd]) => `<button type="button" data-odd="${odd}" data-match="${game.name}" data-pick="${pick}" class="rounded-lg border border-edge bg-input px-3 py-2 text-xs font-bold">${testTag(pick)} <span class="text-gold">${odd}</span></button>`).join('')
    return `<article class="rounded-xl border border-edge bg-card p-4"><div class="text-xs text-muted">${testTag(game.league)} · ${game.when}</div><div class="mt-1 font-black">${testTag(game.name)}</div><div class="mt-1 text-sm text-dim">${game.score} · ${testTag(game.note)}</div><div class="mt-3 flex flex-wrap gap-2">${picks || `<span class="text-xs text-dim">${game.status}</span>`}</div></article>`
  }).join('')}</div>`
}

function paintSlip(mode) {
  let panel = document.querySelector('[data-slip-panel]')
  const created = !panel
  if (!panel) {
    panel = document.createElement('aside')
    panel.dataset.slipPanel = '1'
    panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:80;width:320px;border-radius:12px;border:1px solid #2c3136;background:#1f2327;color:#f2f4f6;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.45)'
    panel.hidden = true
    document.body.appendChild(panel)
  }
  panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:80;width:320px;border-radius:12px;border:1px solid #2c3136;background:#1f2327;color:#f2f4f6;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.45)'
  const wasHidden = panel.hidden
  const data = store()
  const rows = data.slip.map((item) => `<div class="flex justify-between gap-2 border-b border-edge-soft py-1 text-xs"><span class="font-bold">${testTag(item.pick)} <span class="text-gold">${item.odds}</span></span><span class="truncate text-dim">${testTag(item.match)}</span></div>`).join('')
  panel.innerHTML = `<div class="mb-2 flex items-center justify-between"><strong class="text-sm">베팅카트 ${data.slip.length}</strong><button type="button" data-clear-slip class="text-xs font-bold text-dim">비우기</button></div>${rows || '<p class="text-xs text-dim">담긴 경기가 없습니다.</p>'}<label class="mt-3 block text-[11px] font-bold uppercase tracking-wider text-muted">건당 금액<input data-slip-stake type="number" value="10000" class="mt-1 h-9 w-full rounded-lg border border-edge bg-input px-2 text-sm font-bold text-fg"></label><button type="button" data-place-slip class="mt-3 h-10 w-full rounded-lg bg-accent text-sm font-bold text-on-accent">베팅 접수</button>`
  if (mode === 'toggle') panel.hidden = !wasHidden
  else if (mode === 'show') panel.hidden = false
  else panel.hidden = created ? true : wasHidden
  const cart = document.querySelector('[data-slip-toggle]')
  if (cart) {
    const count = `베팅카트 ${data.slip.length}`
    if (cart.textContent.trim()) cart.textContent = count
    else cart.setAttribute('aria-label', count)
  }
}

function markCart() {
  document.querySelectorAll('button, a').forEach((el) => {
    const label = (el.getAttribute('aria-label') || el.textContent || '').trim()
    if (label === '베팅카트' || label.startsWith('베팅카트')) el.dataset.slipToggle = '1'
  })
}

function richPage(path, data) {
  const user = data.users.test
  if (path.endsWith('/users.html') || path.endsWith('/blacklist.html')) {
    const onlyBlocked = path.endsWith('/blacklist.html')
    const people = Object.entries(data.users).filter(([, item]) => (onlyBlocked ? item.blocked : true))
    const moneySum = Object.values(data.users).reduce((sum, item) => sum + item.money, 0)
    const blocked = Object.values(data.users).filter((item) => item.blocked).length
    const rows = people.map(([login, item]) => `<tr class="border-b border-edge-soft">${cell(item.nick + ' (' + login + ')', 'font-bold')}${cell(gradeOf(item))}${cell(item.money.toLocaleString('ko-KR'), 'text-right font-bold tabular-nums')}${cell(item.points.toLocaleString('ko-KR'), 'text-right tabular-nums')}${cell(item.blocked ? '차단' : '정상')}${cell(item.blockReason || '-')}${cell(`<button type="button" data-user="${login}" class="rounded-md border border-edge px-2 py-1 text-[11px] font-bold">${item.blocked ? '해제' : '차단'}</button>`)}</tr>`).join('')
    return `<div class="space-y-4">${note()}<div class="grid gap-3 sm:grid-cols-3">${stat('회원', Object.keys(data.users).length + '명')}${stat('보유 머니 합', moneySum.toLocaleString('ko-KR'))}${stat('차단', blocked + '명')}</div>${panel(onlyBlocked ? '블랙리스트' : '회원 관리', `${chips(onlyBlocked ? ['차단', '전체'] : ['전체', '정상', '차단'])}${search('회원 아이디')}${tableWrap(['닉네임(아이디)', '등급', '머니', '포인트', '상태', '사유', '관리'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="7">표시할 회원이 없습니다.</td></tr>'])}`)}</div>`
  }
  if (path.endsWith('/bets.html')) {
    const placed = data.placedBets.map((bet) => `<tr class="border-b border-edge-soft">${cell(`${testTag(bet.nick)} (${bet.login})`)}${cell(testTag(bet.match))}${cell(testTag(bet.pick))}${cell(Number(bet.stake).toLocaleString('ko-KR'), 'text-right font-bold tabular-nums')}${cell(String(bet.odds), 'text-right')}${cell(Math.round(bet.stake * bet.odds).toLocaleString('ko-KR'), 'text-right text-gold font-bold tabular-nums')}${cell(`<span class="${STATUS_CLASS[bet.status] || ''}">${bet.status}</span>`)}${cell(`<button type="button" data-placed="${bet.id}" data-result="적중" class="mr-1 rounded-md border border-edge px-2 py-1 text-[11px] font-bold">적중</button><button type="button" data-placed="${bet.id}" data-result="미적중" class="rounded-md border border-edge px-2 py-1 text-[11px] font-bold">미적중</button>`)}</tr>`)
    const saved = BETS.map(([login, nick, match, stake, odds, win, status], index) => {
      const current = data.betStatus[index] || status
      return `<tr class="border-b border-edge-soft">${cell(`${testTag(nick)} (${login})`)}${cell(testTag(match))}${cell('-')}${cell(stake.toLocaleString('ko-KR'), 'text-right font-bold tabular-nums')}${cell(odds, 'text-right')}${cell(win.toLocaleString('ko-KR'), 'text-right text-gold font-bold tabular-nums')}${cell(`<span class="${STATUS_CLASS[current]}">${current}</span>`)}${cell(`<button type="button" data-bet="${index}" data-result="적중" class="mr-1 rounded-md border border-edge px-2 py-1 text-[11px] font-bold">적중</button><button type="button" data-bet="${index}" data-result="미적중" class="rounded-md border border-edge px-2 py-1 text-[11px] font-bold">미적중</button>`)}</tr>`
    })
    const open = [...data.placedBets, ...BETS.map((item, index) => data.betStatus[index] || item[6])].filter((item) => (item.status || item) === '진행 중').length
    return `<div class="space-y-4">${note()}<div class="grid gap-3 sm:grid-cols-3">${stat('저장된 베팅', BETS.length + '건')}${stat('새로 접수한 베팅', data.placedBets.length + '건')}${stat('진행 중', open + '건')}</div>${panel('스포츠베팅 내역', `${chips(['전체', '진행 중', '적중', '미적중'])}${search('회원 아이디')}${tableWrap(['닉네임(아이디)', '경기', '선택', '베팅금액', '배당', '당첨금', '상태', '정산'], [placed.concat(saved).join('')])}`)}</div>`
  }
  if (path.endsWith('/matches.html')) {
    const rows = MATCHES.map(([league, name, count, stake]) => {
      const status = data.matchStatus[name] || '예정'
      return `<tr class="border-b border-edge-soft">${cell(testTag(league), 'text-dim')}${cell(testTag(name), 'font-bold')}${cell(String(count), 'text-right tabular-nums')}${cell(stake.toLocaleString('ko-KR'), 'text-right font-bold tabular-nums')}${cell(`<select data-match="${name}" class="rounded-lg border border-edge bg-input px-2 py-1 text-xs font-bold">${['예정', '라이브', '종료'].map((item) => `<option ${item === status ? 'selected' : ''}>${item}</option>`).join('')}</select>`)}</tr>`
    }).join('')
    return `<div class="space-y-4">${note()}${realBoard('실제 경기', REAL_GAMES)}${panel('저장된 데모 경기', `${chips(['전체', '예정', '라이브', '종료'])}${search('경기 검색')}${tableWrap(['리그', '경기', '베팅 수', '누적 베팅금', '상태'], [rows])}`)}</div>`
  }
  if (path.endsWith('/inquiries.html')) {
    const waiting = data.inquiries.filter((item) => item.status !== '답변').length
    const rows = data.inquiries.map((item) => `<tr class="border-b border-edge-soft">${cell(item.title, 'font-bold')}${cell(item.body)}${cell(`<span class="${STATUS_CLASS[item.status] || ''}">${item.status}</span>`)}${cell(item.answer || '-')}${cell(`<button type="button" data-answer="${item.id}" class="rounded-md border border-edge px-2 py-1 text-[11px] font-bold">답변</button>`)}</tr>`).join('')
    return `<div class="space-y-4">${note()}<div class="grid gap-3 sm:grid-cols-2">${stat('문의', data.inquiries.length + '건')}${stat('대기', waiting + '건')}</div>${panel('1:1 문의 관리', `${chips(['전체', '대기', '답변'])}${search('제목 검색')}${tableWrap(['제목', '내용', '상태', '답변', '처리'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="5">문의가 없습니다.</td></tr>'])}`)}</div>`
  }
  if (path.endsWith('/points.html')) {
    const pointRows = data.pointMoves.map((move) => `<tr class="border-b border-edge-soft">${cell(memberLabel(data.users[move.login]?.nick || move.login, move.login))}${cell(Number(move.amount) > 0 ? '지급' : '회수')}${cell((move.amount > 0 ? '+' : '') + Number(move.amount).toLocaleString('ko-KR'), 'text-right font-bold')}${cell((data.users[move.login]?.points || 0).toLocaleString('ko-KR'), 'text-right')}${cell(move.at || '-')}</tr>`).join('')
    return `<div class="space-y-4">${note()}<div class="grid gap-3 sm:grid-cols-2">${stat('test 포인트', user.points.toLocaleString('ko-KR') + 'P')}${stat('test123 포인트', data.users.test123.points.toLocaleString('ko-KR') + 'P')}</div>${panel('포인트 내역', `<form data-point-form class="flex flex-wrap items-end gap-2">${field('회원 아이디', 'test', 'login')}${field('포인트', '1000', 'amount', 'number')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">지급</button><button type="button" data-point-take class="h-10 rounded-lg border border-edge px-4 text-sm font-bold text-dim">회수</button></form>${chips(['전체', '지급', '회수'])}${tableWrap(['닉네임(아이디)', '구분', '포인트', '잔액', '시각'], [pointRows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="5">포인트 이동이 없습니다.</td></tr>'])}`)}</div>`
  }
  if (path.endsWith('/logs.html')) {
    const rows = data.logs.map((item) => `<tr class="border-b border-edge-soft">${cell(item.at, 'text-muted')}${cell(item.text)}</tr>`).join('')
    return `<div class="space-y-4">${note()}${panel('활동 로그', `${search('내용 검색')}${tableWrap(['시각', '내용'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="2">아직 기록이 없습니다.</td></tr>'])}`)}</div>`
  }
  if (path.endsWith('/wallet.html')) {
    const usdt = data.cashExtra.filter((item) => String(item.memo || '').includes('USDT'))
    const rows = usdt.map((item) => `<tr class="border-b border-edge-soft">${cell(memberLabel(item.nick || item.login, item.login))}${cell(item.type)}${cell(Number(item.amount).toLocaleString('ko-KR'), 'text-right font-bold')}${cell(item.status)}${cell(item.requestedAt || '-')}</tr>`).join('')
    return `<div class="space-y-4">${note()}${panel('USDT 설정', `<form data-wallet-form class="grid max-w-xl gap-3">${field('네트워크', data.wallet.network || 'TRC-20', 'network')}${field('지갑 주소', data.wallet.address, 'address')}${field('환율', data.wallet.rate || '1450', 'rate')}${field('최소 USDT', data.wallet.min || '10', 'min')}${field('메모', data.wallet.note, 'note')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">저장</button></form>`)}${panel('USDT 신청', tableWrap(['닉네임(아이디)', '유형', '금액', '상태', '시각'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="5">USDT 신청이 없습니다.</td></tr>']))}</div>`
  }
  if (path.endsWith('/banners.html')) {
    const rows = data.banners.map((item, index) => `<tr class="border-b border-edge-soft">${cell(item.title, 'font-bold')}${cell(item.on ? '노출' : '숨김')}${cell(`<button type="button" data-banner="${index}" class="rounded-md border border-edge px-2 py-1 text-[11px] font-bold">${item.on ? '숨김' : '노출'}</button>`)}</tr>`).join('')
    return `<div class="space-y-4">${note()}${stat('배너', data.banners.length + '개')}${panel('팝업/배너 설정', `<form data-banner-form class="flex flex-wrap items-end gap-2">${field('제목', '', 'title')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">추가</button></form>${chips(['전체', '노출', '숨김'])}${tableWrap(['제목', '상태', '관리'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="3">배너가 없습니다.</td></tr>'])}`)}</div>`
  }
  if (path.endsWith('/settle-audit.html')) {
    const deposits = data.cashExtra.filter((item) => item.type === '입금' && item.status === '승인').reduce((sum, item) => sum + Number(item.amount), 0)
    const rows = Object.entries(data.users).map(([login, item]) => `<tr class="border-b border-edge-soft">${cell(memberLabel(item.nick, login), 'font-bold')}${cell((BASE_USERS[login]?.money || 0).toLocaleString('ko-KR'), 'text-right')}${cell(item.money.toLocaleString('ko-KR'), 'text-right font-bold')}${cell((item.money - (BASE_USERS[login]?.money || 0)).toLocaleString('ko-KR'), 'text-right')}</tr>`).join('')
    return `<div class="space-y-4">${note()}${panel('정산 대조 점검', `<p class="text-sm text-dim">추가 승인 입금과 회원별 기준 머니 대비 현재 머니를 대조합니다.</p><button type="button" data-audit class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">대조 실행</button><p data-audit-result class="text-sm font-bold text-fg">추가 승인 입금 ${deposits.toLocaleString('ko-KR')}</p>${tableWrap(['닉네임(아이디)', '기준 머니', '현재 머니', '차이'], [rows])}`)}</div>`
  }
  if (path.endsWith('/casino.html')) {
    const rows = data.casinoVisits.map((item) => `<tr class="border-b border-edge-soft">${cell(item.name, 'font-bold')}${cell('로비')}${cell('0', 'text-right')}${cell(item.at)}</tr>`).join('')
    return `<div class="space-y-4">${note()}${panel('카지노 내역', `<p class="text-xs text-dim">로비 입장만 기록합니다. 머니는 이동하지 않습니다.</p>${chips(['전체', '로비'])}${search('게임사 검색')}${tableWrap(['게임', '종류', '금액', '시각'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="4">입장 기록이 없습니다.</td></tr>'])}`)}</div>`
  }
  if (path.endsWith('/home.html')) {
    const upcoming = REAL_GAMES.filter((game) => game.picks)
    const notices = data.boardPosts.filter((item) => item.board === '1')
    return `<div class="space-y-4">${note()}<div class="grid gap-3 sm:grid-cols-4">${stat('보유 머니', user.money.toLocaleString('ko-KR'))}${stat('포인트', user.points.toLocaleString('ko-KR') + 'P')}${stat('등급', gradeOf(user))}${stat('카트', data.slip.length + '건')}</div><div class="grid gap-3 sm:grid-cols-3"><a class="rounded-xl border border-edge bg-card p-4" href="/nex/live.html"><div class="text-xs text-muted">스포츠</div><div class="mt-1 font-black">배당 담기</div></a><a class="rounded-xl border border-edge bg-card p-4" href="/nex/my-bets.html"><div class="text-xs text-muted">베팅</div><div class="mt-1 font-black">내역</div></a><a class="rounded-xl border border-edge bg-card p-4" href="/nex/user-cash.html"><div class="text-xs text-muted">입출금</div><div class="mt-1 font-black">신청</div></a></div>${panel('예정 경기', matchCards(upcoming))}${panel('공지', notices.map((item) => `<div class="border-b border-edge-soft py-2"><div class="font-bold">${item.title}</div><div class="text-sm text-dim">${item.body}</div></div>`).join('') || '<p class="text-sm text-dim">공지가 없습니다.</p>')}</div>`
  }
  if (path.endsWith('/live.html') || path.endsWith('/all.html')) {
    const games = path.endsWith('/live.html') ? REAL_GAMES.filter((game) => game.status !== '종료') : REAL_GAMES
    return `<div class="space-y-4">${note()}${panel(path.endsWith('/live.html') ? '예정 경기' : '전체 경기', matchCards(games))}</div>`
  }
  if (path.endsWith('/my-bets.html')) {
    const placed = data.placedBets.filter((bet) => bet.login === 'test').map((bet) => `<tr class="border-b border-edge-soft">${cell(testTag(bet.match), 'font-bold')}${cell(testTag(bet.pick))}${cell(Number(bet.stake).toLocaleString('ko-KR'), 'text-right font-bold')}${cell(String(bet.odds), 'text-right')}${cell(`<span class="${STATUS_CLASS[bet.status] || ''}">${bet.status}</span>`)}${cell(bet.at)}</tr>`)
    const saved = BETS.filter((item) => item[0] === 'test').map((item) => {
      const index = BETS.indexOf(item)
      const current = data.betStatus[index] || item[6]
      return `<tr class="border-b border-edge-soft">${cell(testTag(item[2]), 'font-bold')}${cell('-')}${cell(item[3].toLocaleString('ko-KR'), 'text-right font-bold')}${cell(item[4], 'text-right')}${cell(`<span class="${STATUS_CLASS[current]}">${current}</span>`)}${cell('-')}</tr>`
    })
    return `<div class="space-y-4">${note()}${panel('베팅 내역', `${chips(['전체', '진행 중', '적중', '미적중'])}${tableWrap(['경기', '선택', '금액', '배당', '상태', '시각'], [placed.concat(saved).join('')])}`)}</div>`
  }
  if (path.endsWith('/user-cash.html')) {
    const policy = data.settings['입출금 정책']?.['등급없음'] || []
    const rows = data.cashExtra.filter((item) => item.login === 'test').map((item) => `<tr class="border-b border-edge-soft">${cell(item.type)}${cell(Number(item.amount).toLocaleString('ko-KR'), 'text-right font-bold')}${cell(item.memo || '-')}${cell(`<span class="${STATUS_CLASS[item.status] || ''}">${item.status}</span>`)}${cell(item.requestedAt || '-')}</tr>`).join('')
    return `<div class="space-y-4">${note()}<div class="grid gap-3 sm:grid-cols-3">${stat('보유 머니', user.money.toLocaleString('ko-KR'))}${stat('최소 입금', Number(policy[0] ?? 10000).toLocaleString('ko-KR'))}${stat('1회 최대 출금', Number(policy[2] ?? 10000000).toLocaleString('ko-KR'))}</div>${panel('입출금', `${chips(['전체', '입금', '출금', '대기', '승인', '거절', '계좌', 'USDT'])}<form data-user-cash class="space-y-3"><select data-field="type" class="h-10 rounded-lg border border-edge bg-input px-3 text-sm font-bold"><option>입금</option><option>출금</option></select><div class="flex flex-wrap gap-1"><button type="button" data-preset="10000" class="rounded-md border border-edge px-3 py-1.5 text-xs font-bold">1만</button><button type="button" data-preset="50000" class="rounded-md border border-edge px-3 py-1.5 text-xs font-bold">5만</button><button type="button" data-preset="100000" class="rounded-md border border-edge px-3 py-1.5 text-xs font-bold">10만</button></div>${field('금액', '10000', 'amount', 'number')}${field('메모', '', 'memo')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">신청</button></form><p data-cash-result class="text-sm font-bold text-accent"></p>${tableWrap(['유형', '금액', '메모', '상태', '시각'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="5">신청 내역이 없습니다.</td></tr>'])}`)}</div>`
  }
  if (path.endsWith('/account.html')) {
    const minBet = data.settings['베팅 한도']?.['등급없음']?.[0] || 1000
    return `<div class="space-y-4">${note()}<div class="grid gap-3 sm:grid-cols-3">${stat('머니', user.money.toLocaleString('ko-KR'))}${stat('포인트', user.points.toLocaleString('ko-KR') + 'P')}${stat('등급', gradeOf(user))}</div>${panel('내 정보', `<form data-account class="max-w-md space-y-3">${field('닉네임', user.nick, 'nick')}<p class="text-sm text-dim">상태 ${user.blocked ? '차단' : '정상'} · 최소 베팅 ${Number(minBet).toLocaleString('ko-KR')}</p><button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">저장</button></form>`)}</div>`
  }
  if (path.endsWith('/messages.html')) {
    const rows = data.messages.map((item, index) => `<tr class="border-b border-edge-soft">${cell(item.title, 'font-bold')}${cell(item.body)}${cell(item.read ? '열람' : '미열람')}${cell(item.at, 'text-muted')}${cell(`<button type="button" data-read="${index}" class="rounded-md border border-edge px-2 py-1 text-[11px] font-bold">열람</button>`)}</tr>`).join('')
    return `<div class="space-y-4">${note()}${panel('쪽지함', `${chips(['전체', '미열람', '열람'])}${tableWrap(['제목', '내용', '상태', '시각', '관리'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="5">받은 쪽지가 없습니다.</td></tr>'])}`)}</div>`
  }
  if (/board-\d\.html$/.test(path)) {
    const board = path.match(/board-(\d)/)[1]
    const titles = { 1: '공지사항', 2: '이벤트 게시판', 3: '자유게시판' }
    const tag = { 1: '공지', 2: '이벤트', 3: '자유' }[board]
    const posts = (data.boardPosts || []).filter((item) => item.board === board)
    const rows = posts.map((item, index) => `<tr class="border-b border-edge-soft">${cell(tag)}${cell(item.title, 'font-bold')}${cell(item.body)}${cell(String(item.likes || 0), 'text-right')}${cell(`<button type="button" data-like="${board}:${index}" class="rounded-md border border-edge px-2 py-1 text-[11px] font-bold">추천</button>`)}</tr>`).join('')
    return `<div class="space-y-4">${note()}${panel(titles[board], `${chips(['전체', tag])}<form data-board="${board}" class="space-y-2">${field('제목', '', 'title')}${field('내용', '', 'body')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">등록</button></form>${tableWrap(['구분', '제목', '내용', '추천', ''], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="5">글이 없습니다.</td></tr>'])}`)}</div>`
  }
  return null
}

function replacePlaceholder(html) {
  const box = document.querySelector('main .space-y-4')
  if (!box) return
  box.innerHTML = html
}

function renderPlaceholder() {
  if (!document.body.innerText.includes('저장된 원본에 없습니다.')) return false
  const path = location.pathname
  const data = store()
  const rich = richPage(path, data)
  if (rich) {
    replacePlaceholder(rich)
    return true
  }
  if (path.endsWith('/matches.html')) {
    const rows = MATCHES.map(([league, name, count, stake]) => {
      const status = data.matchStatus[name] || '예정'
      return `<tr class="border-b border-edge-soft">${cell(league, 'text-dim')}${cell(name, 'font-bold')}${cell(String(count), 'text-right tabular-nums')}${cell(stake.toLocaleString('ko-KR'), 'text-right font-bold tabular-nums')}${cell(`<select data-match="${name}" class="rounded-lg border border-edge bg-input px-2 py-1 text-xs font-bold">${['예정', '라이브', '종료'].map((item) => `<option ${item === status ? 'selected' : ''}>${item}</option>`).join('')}</select>`)}</tr>`
    }).join('')
    replacePlaceholder(`<div class="space-y-4">${realBoard('실제 경기', REAL_GAMES)}${panel('저장된 데모 경기', `<div class="flex gap-2"><input data-table-search placeholder="경기, 리그 검색" class="h-9 w-56 rounded-lg border border-edge bg-input px-3 text-sm text-fg"></div>${tableWrap(['리그', '경기', '베팅 수', '누적 베팅금', '상태'], [rows])}`)}</div>`)
    return true
  }
  if (path.endsWith('/bets.html')) {
    const rows = BETS.map(([login, nick, match, stake, odds, win, status], index) => {
      const current = data.betStatus[index] || status
      return `<tr class="border-b border-edge-soft">${cell(`${nick} (${login})`)}${cell(match)}${cell(stake.toLocaleString('ko-KR'), 'text-right font-bold tabular-nums')}${cell(odds, 'text-right')}${cell(win.toLocaleString('ko-KR'), 'text-right text-gold font-bold tabular-nums')}${cell(`<span class="${STATUS_CLASS[current]}">${current}</span>`)}${cell(`<button type="button" data-bet="${index}" data-result="적중" class="mr-1 rounded-md border border-edge px-2 py-1 text-[11px] font-bold">적중</button><button type="button" data-bet="${index}" data-result="미적중" class="rounded-md border border-edge px-2 py-1 text-[11px] font-bold">미적중</button>`)}</tr>`
    }).join('')
    replacePlaceholder(panel('스포츠베팅 내역', `<div class="flex flex-wrap gap-2"><button type="button" class="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent">전체</button><button type="button" class="rounded-lg px-3 py-1.5 text-xs font-bold text-dim">진행 중</button><button type="button" class="rounded-lg px-3 py-1.5 text-xs font-bold text-dim">적중</button><button type="button" class="rounded-lg px-3 py-1.5 text-xs font-bold text-dim">미적중</button><input data-table-search placeholder="회원, 경기 검색" class="h-9 w-52 rounded-lg border border-edge bg-input px-3 text-sm"></div>${tableWrap(['닉네임(아이디)', '경기', '베팅금액', '배당', '당첨금', '상태', '정산'], [rows])}`))
    return true
  }
  if (path.endsWith('/users.html') || path.endsWith('/blacklist.html')) {
    const onlyBlocked = path.endsWith('/blacklist.html')
    const people = Object.entries(data.users).filter(([, user]) => (onlyBlocked ? user.blocked : true))
    const rows = people.map(([login, user]) => `<tr class="border-b border-edge-soft">${cell(user.nick + ' (' + login + ')', 'font-bold')}${cell(user.money.toLocaleString('ko-KR'), 'text-right tabular-nums')}${cell(user.points.toLocaleString('ko-KR'), 'text-right tabular-nums')}${cell(user.blocked ? '차단' : '정상')}${cell(`<button type="button" data-user="${login}" class="rounded-md border border-edge px-2 py-1 text-[11px] font-bold">${user.blocked ? '해제' : '차단'}</button>`)}</tr>`).join('')
    replacePlaceholder(panel(onlyBlocked ? '블랙리스트' : '회원 관리', `<input data-table-search placeholder="아이디, 닉네임 검색" class="h-9 w-56 rounded-lg border border-edge bg-input px-3 text-sm">${tableWrap(['닉네임(아이디)', '머니', '포인트', '상태', '관리'], [rows || `<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="5">${onlyBlocked ? '차단된 회원이 없습니다.' : '회원이 없습니다.'}</td></tr>`])}`))
    return true
  }
  if (path.endsWith('/inquiries.html')) {
    const rows = data.inquiries.map((item) => `<tr class="border-b border-edge-soft">${cell(item.title, 'font-bold')}${cell(item.body)}${cell(item.status)}${cell(item.answer || '-')}${cell(`<button type="button" data-answer="${item.id}" class="rounded-md border border-edge px-2 py-1 text-[11px] font-bold">답변</button>`)}</tr>`).join('')
    replacePlaceholder(panel('1:1 문의 관리', tableWrap(['제목', '내용', '상태', '답변', '처리'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="5">문의가 없습니다.</td></tr>'])))
    return true
  }
  if (path.endsWith('/points.html')) {
    const pointRows = data.pointMoves.map((move) => `<tr class="border-b border-edge-soft">${cell(memberLabel(data.users[move.login]?.nick || move.login, move.login))}${cell(move.reason || '지급')}${cell((move.amount > 0 ? '+' : '') + Number(move.amount).toLocaleString('ko-KR'), 'text-right font-bold')}${cell((data.users[move.login]?.points || 0).toLocaleString('ko-KR'), 'text-right')}${cell(move.at || '-')}</tr>`).join('')
    replacePlaceholder(panel('포인트 내역', `<form data-point-form class="flex flex-wrap items-end gap-2">${field('회원 아이디', 'test', 'login')}${field('포인트', '1000', 'amount', 'number')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">지급</button><button type="button" data-point-take class="h-10 rounded-lg border border-edge px-4 text-sm font-bold text-dim">회수</button></form><div class="text-sm text-dim">테스트유저 ${data.users.test.points.toLocaleString('ko-KR')}P · 테스트용 ${data.users.test123.points.toLocaleString('ko-KR')}P</div>${tableWrap(['닉네임(아이디)', '구분', '포인트', '잔액', '시각'], [pointRows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="5">포인트 이동이 없습니다.</td></tr>'])}`))
    return true
  }
  if (path.endsWith('/logs.html')) {
    const rows = data.logs.map((item) => `<tr class="border-b border-edge-soft">${cell(item.at, 'text-muted')}${cell(item.text)}</tr>`).join('')
    replacePlaceholder(panel('활동 로그', tableWrap(['시각', '내용'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="2">아직 기록이 없습니다.</td></tr>'])))
    return true
  }
  if (path.endsWith('/wallet.html')) {
    replacePlaceholder(panel('USDT 설정', `<form data-wallet-form class="max-w-lg space-y-3">${field('지갑 주소', data.wallet.address, 'address')}${field('메모', data.wallet.note, 'note')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">저장</button></form>`))
    return true
  }
  if (path.endsWith('/banners.html')) {
    const rows = data.banners.map((item) => `<tr class="border-b border-edge-soft">${cell(item.title, 'font-bold')}${cell(item.on ? '노출' : '숨김')}</tr>`).join('')
    replacePlaceholder(panel('팝업/배너 설정', `<form data-banner-form class="flex flex-wrap items-end gap-2">${field('제목', '', 'title')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">추가</button></form>${tableWrap(['제목', '상태'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="2">배너가 없습니다.</td></tr>'])}`))
    return true
  }
  if (path.endsWith('/settle-audit.html')) {
    const deposits = data.cashExtra.filter((item) => item.type === '입금' && item.status === '승인').reduce((sum, item) => sum + Number(item.amount), 0)
    replacePlaceholder(panel('정산 대조 점검', `<p class="text-sm text-dim">추가 승인 입금 합계와 회원 머니 변동을 대조합니다.</p><button type="button" data-audit class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">대조 실행</button><p data-audit-result class="text-sm font-bold text-fg">추가 승인 입금 ${deposits.toLocaleString('ko-KR')}</p>`))
    return true
  }
  if (path.endsWith('/casino.html')) {
    const rows = BETS.map(([login, nick, match, stake], index) => `<tr class="border-b border-edge-soft">${cell(`${nick} (${login})`)}${cell('카지노')}${cell(stake.toLocaleString('ko-KR'), 'text-right font-bold tabular-nums')}${cell(data.betStatus['c' + index] || '진행 중')}</tr>`).join('')
    replacePlaceholder(panel('카지노 내역', `<input data-table-search placeholder="회원 검색" class="h-9 w-52 rounded-lg border border-edge bg-input px-3 text-sm">${tableWrap(['닉네임(아이디)', '종류', '금액', '상태'], [rows])}`))
    return true
  }
  if (path.endsWith('/home.html')) {
    const user = data.users.test
    replacePlaceholder(`<div class="space-y-4"><div class="grid gap-3 sm:grid-cols-3"><a class="rounded-xl border border-edge bg-card p-4" href="/nex/casino-live.html"><div class="text-xs text-muted">카지노</div><div class="mt-1 font-black">입장</div></a><a class="rounded-xl border border-edge bg-card p-4" href="/nex/my-bets.html"><div class="text-xs text-muted">베팅</div><div class="mt-1 font-black">${BETS.length}건</div></a><a class="rounded-xl border border-edge bg-card p-4" href="/nex/user-cash.html"><div class="text-xs text-muted">보유 머니</div><div class="mt-1 font-black text-accent">${user.money.toLocaleString('ko-KR')}</div></a></div>${realBoard('실제 경기', REAL_GAMES.slice(0, 5))}</div>`)
    return true
  }
  if (path.endsWith('/my-bets.html')) {
    const rows = BETS.map((item, index) => `<tr class="border-b border-edge-soft">${cell(item[2])}${cell(item[3].toLocaleString('ko-KR'), 'text-right')}${cell(data.betStatus[index] || item[6])}</tr>`).join('')
    replacePlaceholder(panel('베팅 내역', tableWrap(['경기', '금액', '상태'], [rows])))
    return true
  }
  if (path.endsWith('/user-cash.html')) {
    const user = data.users.test
    replacePlaceholder(panel('입출금', `<p class="text-sm text-dim">보유 머니 ${user.money.toLocaleString('ko-KR')}</p><form data-user-cash class="flex flex-wrap items-end gap-2"><select data-field="type" class="h-10 rounded-lg border border-edge bg-input px-3 text-sm font-bold"><option>입금</option><option>출금</option></select>${field('금액', '10000', 'amount', 'number')}${field('메모', '', 'memo')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">신청</button></form><p data-cash-result class="text-sm font-bold text-accent"></p>`))
    return true
  }
  if (path.endsWith('/account.html')) {
    const user = data.users.test
    replacePlaceholder(panel('내 정보', `<form data-account class="max-w-md space-y-3">${field('닉네임', user.nick, 'nick')}<p class="text-sm text-dim">머니 ${user.money.toLocaleString('ko-KR')} · 포인트 ${user.points.toLocaleString('ko-KR')}P</p><button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">저장</button></form>`))
    return true
  }
  if (path.endsWith('/messages.html')) {
    const rows = data.messages.map((item) => `<tr class="border-b border-edge-soft">${cell(item.title, 'font-bold')}${cell(item.body)}${cell(item.at, 'text-muted')}</tr>`).join('')
    replacePlaceholder(panel('쪽지함', tableWrap(['제목', '내용', '시각'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="3">받은 쪽지가 없습니다.</td></tr>'])))
    return true
  }
  if (path.endsWith('/live.html') || path.endsWith('/all.html')) {
    const games = path.endsWith('/live.html') ? REAL_GAMES.filter((game) => game.status !== '종료') : REAL_GAMES
    replacePlaceholder(realBoard(path.endsWith('/live.html') ? '예정 경기' : '전체 경기', games))
    return true
  }
  if (/board-\d\.html$/.test(path)) {
    const board = path.match(/board-(\d)/)[1]
    const titles = { 1: '공지사항', 2: '이벤트 게시판', 3: '자유게시판' }
    const posts = (data.boardPosts || []).filter((item) => item.board === board)
    const rows = posts.map((item) => `<tr class="border-b border-edge-soft">${cell(item.title, 'font-bold')}${cell(item.body)}</tr>`).join('')
    replacePlaceholder(panel(titles[board], `<form data-board="${board}" class="space-y-2">${field('제목', '', 'title')}${field('내용', '', 'body')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">등록</button></form>${tableWrap(['제목', '내용'], [rows || '<tr><td class="px-3 py-8 text-center text-sm text-dim" colspan="2">글이 없습니다.</td></tr>'])}`))
    return true
  }
  if (path.endsWith('/casino-slots.html')) {
    replacePlaceholder(`<div class="flex flex-col gap-4"><h1 class="text-xl font-black">슬롯</h1><input data-game-search placeholder="게임사/로비 검색" class="h-10 w-full rounded-lg border border-edge bg-card px-3 text-sm"><div data-game-grid class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"></div></div>`)
    paintGames('slots')
    return true
  }
  return false
}

function paintGames(kind) {
  const grid = document.querySelector('[data-game-grid]') || document.querySelector('main .grid')
  if (!grid) return
  grid.classList.remove('animate-pulse')
  grid.innerHTML = GAMES[kind].map((name) => `<button type="button" data-game="${name}" class="flex aspect-[4/3] items-end rounded-card border border-edge bg-card p-3 text-left text-sm font-black text-fg hover:border-accent">${testTag(name)}</button>`).join('')
  grid.dataset.kind = kind
}

function bindSettingsTabs() {
  const labels = ['사이트', '등급별 한도/계좌', '경기·프로모션', '배당 조정', '스포츠 리그 설정', '노출 마켓', '회원·게시판', '알림·기타', '카지노 설정', '넥스코인(NC)', '팀/리그 메타', '관리자 계정']
  const buttons = [...document.querySelectorAll('main button')].filter((button) => labels.includes(labelOf(button)))
  if (buttons.length < 2) return
  const sections = [...document.querySelectorAll('main section')]
  let note = null
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const known = labelOf(button) === '등급별 한도/계좌'
      sections.forEach((section) => { section.hidden = !known })
      if (!note) {
        note = document.createElement('p')
        note.className = 'rounded-xl border border-edge bg-card px-4 py-8 text-center text-sm text-dim'
        note.textContent = '이 탭은 저장된 원본에 본문이 없습니다.'
        sections[0]?.before(note)
      }
      note.hidden = known
    })
  })
}

function bindSettings() {
  document.querySelectorAll('main section').forEach((section) => {
    const save = [...section.querySelectorAll('button')].find((button) => labelOf(button) === '저장')
    if (!save) return
    const title = section.querySelector('h2')?.textContent.trim() || '설정'
    const inputs = [...section.querySelectorAll('input')]
    const data = store()
    data.settings[title] ||= {}
    const defaults = inputs.map((input) => input.value)
    const grades = [...section.querySelectorAll('button')].filter((button) => ['등급없음', '실버', '골드', 'VIP'].includes(labelOf(button)))
    const current = grades.find((button) => button.className.includes('bg-card-hover') || button.className.includes('bg-accent'))
    const gradeName = current ? labelOf(current) : '등급없음'
    const saved = data.settings[title][gradeName]
    if (saved) inputs.forEach((input, index) => { input.value = saved[index] ?? input.value })
    grades.forEach((button) => {
      button.addEventListener('click', () => {
        const latest = store()
        const active = grades.find((item) => item.className.includes('bg-card-hover') || item.className.includes('bg-accent'))
        const from = active ? labelOf(active) : gradeName
        latest.settings[title] ||= {}
        latest.settings[title][from] = inputs.map((input) => input.value)
        const next = labelOf(button)
        const values = latest.settings[title][next] || defaults
        inputs.forEach((input, index) => { input.value = values[index] ?? '' })
        grades.forEach((item) => {
          const on = item === button
          item.className = on
            ? 'px-3 py-1.5 rounded-md text-xs font-bold transition-colors bg-card-hover text-fg'
            : 'px-3 py-1.5 rounded-md text-xs font-bold transition-colors text-muted hover:text-fg'
        })
        commit(latest)
      })
    })
    save.dataset.nexSave = '1'
    save.addEventListener('click', () => {
      const latest = store()
      const active = grades.find((item) => item.className.includes('bg-card-hover') || item.className.includes('bg-accent'))
      const name = active ? labelOf(active) : gradeName
      latest.settings[title] ||= {}
      latest.settings[title][name] = inputs.map((input) => input.value)
      logAction(latest, `${title} ${name} 저장`)
      commit(latest)
      toast('저장했습니다.')
    })
    const reset = [...section.querySelectorAll('button')].find((button) => labelOf(button) === '기본값으로')
    reset?.addEventListener('click', () => {
      inputs.forEach((input, index) => { input.value = defaults[index] })
      toast('기본값으로 되돌렸습니다.')
    })
  })
}

function bindSupport() {
  const buttons = [...document.querySelectorAll('main button')].filter((button) => labelOf(button) === '문의하기')
  if (!buttons.length) return
  const data = store()
  const list = document.createElement('div')
  list.className = 'space-y-2'
  list.dataset.inquiryList = '1'
  const paint = () => {
    const latest = store()
    list.innerHTML = latest.inquiries.map((item) => `<article class="rounded-xl border border-edge bg-card p-4"><div class="font-black">${item.title}</div><p class="mt-1 text-sm text-dim">${item.body}</p><p class="mt-2 text-xs font-bold ${item.answer ? 'text-accent' : 'text-muted'}">${item.answer ? '답변: ' + item.answer : '답변 대기'}</p></article>`).join('') || ''
    const empty = document.querySelector('main .border-dashed')
    if (empty) empty.hidden = latest.inquiries.length > 0
  }
  buttons[0].parentElement.parentElement.after(list)
  paint()
  const form = document.createElement('form')
  form.className = 'hidden space-y-2 rounded-xl border border-edge bg-card p-4'
  form.innerHTML = `${field('제목', '', 'title')}${field('내용', '', 'body')}<button class="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent">등록</button>`
  list.before(form)
  buttons.forEach((button) => button.addEventListener('click', () => { form.classList.toggle('hidden') }))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const latest = store()
    const title = form.querySelector('[data-field="title"]').value.trim()
    const body = form.querySelector('[data-field="body"]').value.trim()
    if (!title || !body) return toast('제목과 내용을 입력해 주세요.')
    latest.inquiries.unshift({ id: latest.nextId++, title, body, status: '대기', answer: '', at: stamp() })
    logAction(latest, `문의 등록: ${title}`)
    commit(latest)
    form.reset()
    form.classList.add('hidden')
    paint()
    toast('문의를 등록했습니다.')
  })
}

function bindMail() {
  const button = [...document.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === '쪽지 발송' || labelOf(item) === '쪽지 발송')
  if (!button) return
  button.addEventListener('click', () => {
    const dialog = document.createElement('div')
    dialog.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4'
    dialog.innerHTML = `<form class="w-full max-w-sm space-y-3 rounded-xl border border-edge bg-card p-4"><h2 class="text-sm font-black">쪽지 발송</h2>${field('제목', '', 'title')}${field('내용', '', 'body')}<div class="flex gap-2"><button class="h-9 flex-1 rounded-lg bg-accent text-sm font-bold text-on-accent">보내기</button><button type="button" data-close class="h-9 rounded-lg border border-edge px-3 text-sm">닫기</button></div></form>`
    dialog.addEventListener('click', (event) => { if (event.target.dataset.close) dialog.remove() })
    dialog.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault()
      const latest = store()
      const title = dialog.querySelector('[data-field="title"]').value.trim()
      const body = dialog.querySelector('[data-field="body"]').value.trim()
      if (!title || !body) return toast('제목과 내용을 입력해 주세요.')
      latest.messages.unshift({ title, body, at: stamp() })
      logAction(latest, `쪽지 발송: ${title}`)
      commit(latest)
      dialog.remove()
      toast('쪽지를 보냈습니다.')
    })
    document.body.appendChild(dialog)
  })
}

function bindBoardQueue() {
  const empty = [...document.querySelectorAll('main p')].find((node) => node.textContent.includes('승인 대기 중인 회원 글'))
  if (!empty) return
  const data = store()
  if (!data.boardQueue) {
    data.boardQueue = [{ id: 1, author: '테스트유저', title: '오늘 경기 응원글', hidden: false }]
    commit(data)
  }
  const host = empty.parentElement
  const paint = () => {
    const latest = store()
    const pending = latest.boardQueue.filter((item) => !item.hidden && !latest.boardHidden.includes(item.id))
    host.innerHTML = pending.length
      ? pending.map((item) => `<article class="flex items-center justify-between rounded-xl border border-edge bg-card px-4 py-3"><div><div class="font-bold">${item.title}</div><div class="text-xs text-muted">${item.author}</div></div><button type="button" data-expose="${item.id}" class="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-on-accent">노출</button></article>`).join('')
      : '<p class="py-12 text-center text-sm text-muted">승인 대기 중인 회원 글/댓글이 없습니다.</p>'
  }
  host.addEventListener('click', (event) => {
    const id = Number(event.target.closest('button')?.dataset.expose)
    if (!id) return
    const latest = store()
    latest.boardHidden.push(id)
    logAction(latest, `회원글 #${id} 노출`)
    commit(latest)
    paint()
    toast('노출했습니다. 대기 목록에서 빠집니다.')
  })
  paint()
}

function bindPageForms() {
  document.addEventListener('submit', (event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return
    if (form.dataset.userCash !== undefined) {
      event.preventDefault()
      const latest = store()
      const amount = Number(form.querySelector('[data-field="amount"]').value)
      const type = form.querySelector('[data-field="type"]').value
      const memo = form.querySelector('[data-field="memo"]').value.trim()
      if (!amount || amount < 1) return toast('금액을 입력해 주세요.')
      const policy = latest.settings['입출금 정책']?.['등급없음']
      const minIn = Number(policy?.[0] ?? 10000)
      const minOut = Number(policy?.[1] ?? 10000)
      const maxOut = Number(policy?.[2] ?? 10000000)
      const usdtOn = [...document.querySelectorAll('main button')].some((button) => labelOf(button) === 'USDT' && button.className.includes('bg-accent'))
      const memoText = usdtOn && !memo.includes('USDT') ? `USDT ${memo}`.trim() : memo
      if (type === '입금' && amount < minIn) return toast(`최소 입금액은 ${minIn.toLocaleString('ko-KR')}입니다.`)
      if (type === '출금' && amount < minOut) return toast(`최소 출금액은 ${minOut.toLocaleString('ko-KR')}입니다.`)
      if (type === '출금' && amount > maxOut) return toast(`1회 최대 출금액은 ${maxOut.toLocaleString('ko-KR')}입니다.`)
      if (type === '출금' && latest.users.test.money < amount) return toast('보유 머니가 부족합니다.')
      latest.cashExtra.unshift({ id: latest.nextId++, login: 'test', nick: latest.users.test.nick, type, amount, memo: memoText, status: '대기', requestedAt: stamp(), processedAt: '' })
      logAction(latest, `회원 ${type} 신청 ${amount.toLocaleString('ko-KR')}`)
      commit(latest)
      const result = document.querySelector('[data-cash-result]')
      if (result) result.textContent = '신청했습니다. 관리자 승인 전입니다.'
      toast('입출금을 신청했습니다.')
    }
    if (form.dataset.account !== undefined) {
      event.preventDefault()
      const latest = store()
      const nick = form.querySelector('[data-field="nick"]').value.trim()
      if (!nick) return toast('닉네임을 입력해 주세요.')
      latest.users.test.nick = nick
      logAction(latest, `닉네임 변경 ${nick}`)
      commit(latest)
      toast('저장했습니다.')
    }
    if (form.dataset.walletForm !== undefined) {
      event.preventDefault()
      const latest = store()
      latest.wallet.address = form.querySelector('[data-field="address"]').value.trim()
      latest.wallet.note = form.querySelector('[data-field="note"]').value.trim()
      latest.wallet.network = form.querySelector('[data-field="network"]')?.value.trim() || latest.wallet.network
      latest.wallet.rate = form.querySelector('[data-field="rate"]')?.value.trim() || latest.wallet.rate
      latest.wallet.min = form.querySelector('[data-field="min"]')?.value.trim() || latest.wallet.min
      logAction(latest, 'USDT 설정 저장')
      commit(latest)
      toast('저장했습니다.')
    }
    if (form.dataset.bannerForm !== undefined) {
      event.preventDefault()
      const latest = store()
      const title = form.querySelector('[data-field="title"]').value.trim()
      if (!title) return toast('제목을 입력해 주세요.')
      latest.banners.unshift({ title, on: true })
      logAction(latest, `배너 추가 ${title}`)
      commit(latest)
      location.reload()
    }
    if (form.dataset.pointForm !== undefined) {
      event.preventDefault()
      const latest = store()
      const login = form.querySelector('[data-field="login"]').value.trim()
      const amount = Number(form.querySelector('[data-field="amount"]').value)
      const user = latest.users[login]
      if (!user || !amount) return toast('회원과 포인트를 확인해 주세요.')
      latest.pointMoves.push({ login, amount, at: stamp(), reason: '지급' })
      logAction(latest, `${login} 포인트 지급 ${amount}`)
      commit(latest)
      location.reload()
    }
    if (form.dataset.board) {
      event.preventDefault()
      const latest = store()
      const title = form.querySelector('[data-field="title"]').value.trim()
      const body = form.querySelector('[data-field="body"]').value.trim()
      if (!title || !body) return toast('제목과 내용을 입력해 주세요.')
      latest.boardPosts ||= []
      latest.boardPosts.unshift({ board: form.dataset.board, title, body })
      logAction(latest, `게시글 등록 ${title}`)
      commit(latest)
      location.reload()
    }
  })
  document.addEventListener('click', (event) => {
    const pointTake = event.target.closest('[data-point-take]')
    if (pointTake) {
      const form = pointTake.closest('form')
      const latest = store()
      const login = form.querySelector('[data-field="login"]').value.trim()
      const amount = Number(form.querySelector('[data-field="amount"]').value)
      const user = latest.users[login]
      if (!user || !amount) return toast('회원과 포인트를 확인해 주세요.')
      if (user.points < amount) return toast('포인트가 부족합니다.')
      latest.pointMoves.push({ login, amount: -amount, at: stamp(), reason: '회수' })
      logAction(latest, `${login} 포인트 회수 ${amount}`)
      commit(latest)
      location.reload()
    }
    const audit = event.target.closest('[data-audit]')
    if (audit) {
      const latest = store()
      const approved = latest.cashExtra.filter((item) => item.status === '승인')
      const result = document.querySelector('[data-audit-result]')
      const line = approved.length
        ? `대조 완료. 추가 처리 ${approved.length}건, 회원 머니 테스트유저 ${latest.users.test.money.toLocaleString('ko-KR')}`
        : '대조 완료. 추가 승인 건이 없어 캡처 잔액과 같습니다.'
      if (result) result.textContent = line
      logAction(latest, '정산 대조 실행')
      commit(latest)
      toast('대조했습니다.')
    }
    const userButton = event.target.closest('[data-user]')
    if (userButton) {
      const latest = store()
      const login = userButton.dataset.user
      const user = latest.users[login]
      user.blocked = !user.blocked
      user.blockReason = user.blocked ? '관리자 차단' : ''
      logAction(latest, `${login} ${user.blocked ? '차단' : '차단 해제'}`)
      commit(latest)
      location.reload()
    }
    const placedButton = event.target.closest('[data-placed]')
    if (placedButton) {
      const latest = store()
      const bet = latest.placedBets.find((item) => String(item.id) === placedButton.dataset.placed)
      if (!bet) return
      bet.status = placedButton.dataset.result
      bet.settledAt = stamp()
      logAction(latest, `신규 베팅 #${bet.id} ${bet.status}`)
      commit(latest)
      location.reload()
      return
    }
    const odd = event.target.closest('[data-odd]')
    if (odd) {
      const latest = store()
      if (latest.users.test.blocked) return toast('차단된 회원은 베팅할 수 없습니다.')
      latest.slip.push({ match: odd.dataset.match, pick: odd.dataset.pick, odds: Number(odd.dataset.odd) })
      commit(latest)
      paintSlip('show')
      toast(`${odd.dataset.pick} ${odd.dataset.odd} 을 베팅카트에 담았습니다.`)
      return
    }
    const betButton = event.target.closest('[data-bet]')
    if (betButton) {
      const latest = store()
      latest.betStatus[betButton.dataset.bet] = betButton.dataset.result
      latest.betSettledAt[betButton.dataset.bet] = stamp()
      logAction(latest, `베팅 #${betButton.dataset.bet} ${betButton.dataset.result}`)
      commit(latest)
      location.reload()
    }
    const answer = event.target.closest('[data-answer]')
    if (answer) {
      openAnswer(answer.dataset.answer)
    }
    const game = event.target.closest('[data-game]')
    if (game) {
      const latest = store()
      latest.casinoVisits.unshift({ name: game.dataset.game, at: stamp() })
      latest.casinoVisits = latest.casinoVisits.slice(0, 30)
      commit(latest)
      toast(`${game.dataset.game} 로비를 열었습니다.`)
    }
    if (event.target.closest('[data-slip-toggle]')) paintSlip('toggle')
    const preset = event.target.closest('[data-preset]')
    if (preset) {
      const input = document.querySelector('[data-user-cash] [data-field="amount"]')
      if (input) input.value = preset.dataset.preset
    }
    const banner = event.target.closest('[data-banner]')
    if (banner) {
      const latest = store()
      const item = latest.banners[Number(banner.dataset.banner)]
      if (item) item.on = !item.on
      commit(latest)
      location.reload()
      return
    }
    const read = event.target.closest('[data-read]')
    if (read) {
      const latest = store()
      const item = latest.messages[Number(read.dataset.read)]
      if (item) item.read = true
      commit(latest)
      location.reload()
      return
    }
    const like = event.target.closest('[data-like]')
    if (like) {
      const latest = store()
      const [board, index] = like.dataset.like.split(':')
      const posts = latest.boardPosts.filter((item) => item.board === board)
      if (posts[Number(index)]) posts[Number(index)].likes = (posts[Number(index)].likes || 0) + 1
      commit(latest)
      location.reload()
      return
    }
    const place = event.target.closest('[data-place-slip]')
    if (place) {
      const latest = store()
      const stake = Number(document.querySelector('[data-slip-stake]')?.value)
      const min = Number(latest.settings['베팅 한도']?.['등급없음']?.[0] || 1000)
      if (!latest.slip.length) return toast('베팅카트가 비어 있습니다.')
      if (!stake || stake < min) return toast(`최소 베팅금은 ${min.toLocaleString('ko-KR')}입니다.`)
      if (latest.users.test.blocked) return toast('차단된 회원은 베팅할 수 없습니다.')
      if (latest.users.test.money < stake * latest.slip.length) return toast('보유 머니가 부족합니다.')
      latest.slip.forEach((item) => {
        latest.placedBets.unshift({ id: latest.nextId++, login: 'test', nick: latest.users.test.nick, match: item.match, pick: item.pick, odds: item.odds, stake, status: '진행 중', at: stamp() })
      })
      latest.slip = []
      logAction(latest, `베팅 접수 ${stake.toLocaleString('ko-KR')}`)
      commit(latest)
      location.reload()
    }
    if (event.target.closest('[data-clear-slip]')) {
      const latest = store()
      latest.slip = []
      commit(latest)
      paintSlip('show')
    }
    const match = event.target.closest('[data-match]')
    if (match && event.type === 'change') return
  })
  document.addEventListener('change', (event) => {
    const match = event.target.closest('[data-match]')
    if (!match) return
    const latest = store()
    latest.matchStatus[match.dataset.match] = match.value
    logAction(latest, `${match.dataset.match} ${match.value}`)
    commit(latest)
    toast('경기 상태를 바꿨습니다.')
  })
  document.addEventListener('input', (event) => {
    if (event.target.matches('[data-table-search]')) {
      const query = event.target.value.trim().toLowerCase()
      const table = event.target.closest('section, .space-y-4, main')?.querySelector('table')
      table?.tBodies[0]?.rows && [...table.tBodies[0].rows].forEach((row) => {
        row.hidden = query && !row.innerText.toLowerCase().includes(query)
      })
    }
    if (event.target.matches('[data-game-search], input[placeholder*="게임사"]')) {
      const query = event.target.value.trim().toLowerCase()
      document.querySelectorAll('[data-game]').forEach((card) => {
        card.hidden = query && !card.dataset.game.toLowerCase().includes(query)
      })
    }
  })
}

function bindRefresh() {
  document.querySelectorAll('main button').forEach((button) => {
    if (labelOf(button) !== '새로고침') return
    button.addEventListener('click', () => {
      refreshTables()
      toast(`갱신했습니다. ${stamp()}`)
    })
  })
}

function bindPeriodPopover() {
  document.querySelectorAll('main button').forEach((button) => {
    if (!labelOf(button).includes('기간')) return
    button.addEventListener('click', () => {
      let pop = button.parentElement.querySelector('[data-period]')
      if (!pop) {
        pop = document.createElement('span')
        pop.dataset.period = '1'
        pop.className = 'ml-1 inline-flex items-center gap-1'
        pop.innerHTML = '<input type="date" class="h-9 rounded-lg border border-edge bg-input px-2 text-xs text-fg"><span class="text-muted">~</span><input type="date" class="h-9 rounded-lg border border-edge bg-input px-2 text-xs text-fg">'
        button.after(pop)
        pop.addEventListener('change', refreshTables)
      } else pop.hidden = !pop.hidden
    })
  })
}

function boardLayout() {
  if (document.getElementById('nex-board-style')) return
  const style = document.createElement('style')
  style.id = 'nex-board-style'
  style.textContent = '[data-status-zones]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:stretch}[data-status-zones] section{display:flex;flex-direction:column;gap:8px;width:auto;max-width:none;min-width:0;background:#191c1f;border:1px solid #2e343a;border-radius:12px;padding:8px 10px}[data-status-zones] h2{margin:0;font-size:24px;font-weight:700;line-height:1.2;text-align:center}[data-status-zones] [data-zone-grid]{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;width:100%;align-items:stretch}[data-status-zones] [data-zone-grid]>.bg-card,[data-status-zones] [data-zone-grid]>a{width:auto;height:auto;min-height:0;min-width:0}[data-status-zones] .bg-card{width:auto;height:auto;min-height:0;padding:8px 10px;justify-content:center;text-align:center}[data-status-zones] .truncate{overflow:visible;text-overflow:unset;white-space:nowrap}[data-status-zones] .text-muted{color:#e8eef6}[data-status-zones] section:has([data-zone-grid]>:nth-child(3)){grid-column:1 / -1}[data-status-zones] section[data-tone="in"]:has([data-zone-grid]),[data-status-zones] section[data-tone="out"]:has([data-zone-grid]){grid-column:auto}[data-status-zones] section[data-tone="in"] [data-zone-grid],[data-status-zones] section[data-tone="out"] [data-zone-grid]{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}[data-status-zones] section[data-tone="in"] .bg-card,[data-status-zones] section[data-tone="out"] .bg-card{flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 4px}[data-status-zones] section[data-tone="in"] .bg-card>.min-w-0,[data-status-zones] section[data-tone="out"] .bg-card>.min-w-0{width:100%;min-width:0;text-align:center}[data-status-zones] section[data-tone="in"] .text-muted,[data-status-zones] section[data-tone="out"] .text-muted{white-space:normal;letter-spacing:0;font-size:10px;line-height:1.25}[data-status-zones] section[data-tone="in"] .text-lg,[data-status-zones] section[data-tone="out"] .text-lg{font-size:13px}[data-status-zones] section[data-tone="in"] .w-9,[data-status-zones] section[data-tone="out"] .w-9{width:26px;height:26px}[data-status-zones] section[data-tone="in"] .truncate,[data-status-zones] section[data-tone="out"] .truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}[data-status-zones] section:has([data-zone-grid]>:nth-child(6)) [data-zone-grid]{grid-template-columns:repeat(3,minmax(0,1fr))}[data-status-zones] section:last-child:not(:has([data-zone-grid]>:nth-child(3))){grid-column:1 / -1}[data-status-zones] section[data-tone="access"]{background:#1a1e22;border-color:#2e343c}[data-status-zones] section[data-tone="in"]{background:#1a1f1d;border-color:#2e3632}[data-status-zones] section[data-tone="out"]{background:#1f1b1d;border-color:#363034}[data-status-zones] section[data-tone="wait-in"]{background:#1e1d1a;border-color:#363430}[data-status-zones] section[data-tone="wait-out"]{background:#1e1c1a;border-color:#363230}[data-status-zones] section[data-tone="sport"]{background:#1c1e1a;border-color:#323630}[data-status-zones] section[data-tone="casino"]{background:#1d1b1e;border-color:#343034}[data-status-zones] section[data-tone="dist"]{grid-column:1 / -1;background:#1a1e1e;border-color:#2e3434}[data-status-zones] section[data-tone="live"]{background:#1a1c20;border-color:#2e323a}[data-status-zones] section[data-tone="access"] .bg-card{background:#24292f;border-color:#353b44}[data-status-zones] section[data-tone="in"] .bg-card{background:#242b28;border-color:#353e3a}[data-status-zones] section[data-tone="out"] .bg-card{background:#2a2427;border-color:#3e3539}[data-status-zones] section[data-tone="wait-in"] .bg-card{background:#2a2824;border-color:#3e3b35}[data-status-zones] section[data-tone="wait-out"] .bg-card{background:#2a2624;border-color:#3e3935}[data-status-zones] section[data-tone="sport"] .bg-card{background:#262924;border-color:#393e35}[data-status-zones] section[data-tone="casino"] .bg-card{background:#282428;border-color:#3b353b}[data-status-zones] section[data-tone="dist"] .bg-card{background:#242a2a;border-color:#353e3e}[data-status-zones] section[data-tone="live"] .bg-card{background:#24272e;border-color:#353942}[data-status-zones] .w-9{background:#2e343c;color:#d5dbe3}[data-status-zones] [data-tone="access"] .w-9{background:#2e343c;color:#d7dee6}[data-status-zones] [data-tone="in"] .w-9{background:#2c3430;color:#d5e0db}[data-status-zones] [data-tone="out"] .w-9{background:#342e32;color:#e0d6db}[data-status-zones] [data-tone="wait-in"] .w-9{background:#34322c;color:#e0ddd4}[data-status-zones] [data-tone="wait-out"] .w-9{background:#34302c;color:#e0dbd4}[data-status-zones] [data-tone="sport"] .w-9{background:#30342c;color:#dce0d4}[data-status-zones] [data-tone="casino"] .w-9{background:#322e34;color:#ddd6e0}[data-status-zones] [data-tone="dist"] .w-9{background:#2e3634;color:#d5e0dc}[data-status-zones] [data-tone="bet"] .w-9{background:#30342c;color:#dce0d4}[data-status-zones] [data-tone="live"] .w-9{background:#2e323c;color:#d6dae2}[data-lower-board]{display:flex;flex-direction:column;gap:0;margin-top:28px;padding:6px 2px 24px;background:#101316}[data-lower-board] [data-lower-row],[data-lower-board] [data-rank-frame],[data-lower-board] [data-match-slot]{padding:22px 6px 4px;border-top:1px solid #2a3138}[data-lower-board] section{background:transparent;border:0;border-radius:0;box-shadow:none;overflow-x:auto}[data-lower-board] section>div:first-child{display:block;width:100%;border:0;padding:0 0 8px;background:transparent}[data-lower-board] h2{display:block;width:100%;margin:0 0 16px;padding:0 0 10px;font-size:22px;font-weight:800;letter-spacing:0;line-height:1.35;color:#f4f7fb;text-align:center;border-bottom:1px solid #3a424a}[data-lower-board] p{text-align:center}[data-lower-board] .px-4,[data-lower-board] .p-4,[data-lower-board] .py-3{padding:0}[data-lower-board] [data-flow] .px-4>.flex{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;border-top:1px solid #2a3138;border-bottom:1px solid #2a3138}[data-lower-board] [data-flow] .px-4>.flex>span{display:flex;flex-direction:column;align-items:flex-start;gap:8px;background:transparent;border:0;border-radius:0;border-right:1px solid #2a3138;padding:16px 14px 12px}[data-lower-board] [data-flow] .px-4>.flex>span b{font-size:28px;line-height:1;font-weight:700;letter-spacing:-.04em}[data-lower-board] [data-flow] .px-4>.flex>a{grid-column:1 / -1;margin:10px 0 0;width:max-content;color:#d5dbe2;text-decoration:underline;text-underline-offset:3px}[data-lower-board] [data-snap] dl{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0;border-top:1px solid #2a3138;border-bottom:1px solid #2a3138}[data-lower-board] [data-snap] dl>div{display:flex;flex-direction:column;align-items:flex-start;gap:8px;background:transparent;border:0;border-radius:0;border-right:1px solid #2a3138;padding:16px 12px 12px}[data-lower-board] [data-snap] .border-t{display:none}[data-lower-board] [data-snap] dd,[data-lower-board] [data-snap] .text-right{text-align:left}[data-lower-board] [data-snap] .font-black{font-size:22px;letter-spacing:-.04em;line-height:1}[data-lower-board] [data-snap] a,[data-lower-board] a.mt-auto{display:inline-flex;margin-top:12px;padding:0;background:transparent;color:#d5dbe2;text-decoration:underline;text-underline-offset:3px;justify-content:flex-start}[data-lower-board] table{width:100%;border-collapse:collapse;background:transparent}[data-lower-board] th{padding:0 10px 8px;font-size:10px;font-weight:600;letter-spacing:.08em;color:#6e7882;text-align:center!important;border:0;border-bottom:1px solid #2a3138;background:transparent;white-space:nowrap!important}[data-lower-board] td{padding:12px 10px;font-size:12px;line-height:1.35;text-align:center!important;border:0;border-bottom:1px solid #1c2228;background:transparent;white-space:nowrap!important}[data-lower-board] tbody tr:last-child td{border-bottom:0}[data-lower-board] td span{background:transparent;border-radius:0;padding:0}[data-lower-board] td div,[data-lower-board] td span{justify-content:center!important}[data-lower-board] svg{display:block;width:100%;max-height:150px}[data-lower-board] [data-rank-grid]{display:grid;grid-template-columns:minmax(0,1fr);gap:28px;align-items:start}[data-lower-board] [data-rank-frame]>h2{margin-bottom:16px}@media (max-width:980px){[data-lower-board] [data-lower-row="work"],[data-lower-board] [data-rank-grid],[data-lower-board] [data-flow] .px-4>.flex,[data-lower-board] [data-snap] dl{grid-template-columns:1fr}[data-lower-board] [data-flow] .px-4>.flex>span,[data-lower-board] [data-snap] dl>div{border-right:0;border-bottom:1px solid #2a3138}}[data-settle-legacy]{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}[data-settle-board]{display:flex;flex-direction:column;gap:22px;margin-top:8px;padding:4px 0 32px}[data-settle-query]{display:flex;flex-wrap:wrap;gap:14px 20px;align-items:flex-end;padding:0 0 14px;border-bottom:1px solid #3a424a}[data-settle-query] label{display:flex;flex-direction:column;gap:6px;min-width:148px;font-size:12px;font-weight:700;color:#9aa3ad}[data-settle-query] input,[data-settle-query] select{height:38px;border:0;border-bottom:1px solid #6e7882;border-radius:0;background:transparent;color:#f4f7fb;padding:0 2px;font-size:14px}[data-settle-query] button{height:38px;padding:0 18px;border:1px solid #c5ced8;border-radius:0;background:transparent;color:#f4f7fb;font-size:13px;font-weight:800}[data-settle-query] [data-settle-search]{min-width:84px;background:#24303a;border-color:#9aa3ad;color:#f4f7fb;cursor:pointer;transition:background .15s ease,border-color .15s ease,color .15s ease,transform .1s ease,box-shadow .15s ease}[data-settle-query] [data-settle-search]:hover{background:#334554;border-color:#e8eef6;color:#fff}[data-settle-query] [data-settle-search]:active,[data-settle-query] [data-settle-search][data-on]{background:#1a222a;border-color:#c5ced8;transform:translateY(1px)}[data-settle-query] [data-settle-search]:focus-visible{outline:1px solid #c5ced8;outline-offset:2px}[data-settle-board] section{background:transparent;border:0;border-radius:0;box-shadow:none;overflow:visible}[data-settle-board] h2{display:block;width:100%;margin:0 0 12px;padding:0 0 8px;font-size:18px;font-weight:800;letter-spacing:0;line-height:1.35;color:#f4f7fb;text-align:left;border-bottom:1px solid #3a424a}[data-settle-board] section>div:first-child{display:block;width:100%;border:0;padding:0;background:transparent}[data-settle-board] .uppercase{text-transform:none;letter-spacing:0}[data-settle-board] .w-9,[data-settle-band="plan"] .h-9{display:none}[data-settle-metrics]{display:block}[data-settle-metrics]>.grid,[data-settle-metrics]>.grid:last-child{display:grid;grid-template-columns:1fr 1fr;gap:0}[data-settle-metrics] .bg-card{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;min-width:0;background:transparent;border:0;border-radius:0;border-bottom:1px solid #243038;padding:11px 8px}[data-settle-metrics] .min-w-0{display:flex;flex:1;align-items:center;justify-content:space-between;gap:12px;min-width:0}[data-settle-metrics] .text-lg{font-size:18px;font-weight:800}[data-settle-metrics] .truncate{overflow:visible;text-overflow:unset;white-space:normal}[data-settle-board] th{font-size:11px;font-weight:700;color:#8b95a1;text-align:center!important}[data-settle-board] td{text-align:center!important;border-bottom:1px solid #1c2228}[data-settle-board] [data-settle-tone] .p-4{display:flex;flex-direction:column;align-items:stretch}[data-settle-board] [data-settle-tone]>[data-settle-sample]{align-items:stretch}[data-settle-band="plan"] .p-4{display:flex;flex-direction:column;gap:8px;padding:0}[data-settle-band="plan"] h2{text-align:center!important}[data-settle-plan]{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}[data-plan-hero]{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;padding:4px 2px 12px;border-bottom:1px solid #3a424a}[data-plan-hero] span{font-size:13px;font-weight:800;color:#c5ced8}[data-plan-hero] b{font-size:28px;font-weight:800;color:#f4f7fb;letter-spacing:-.03em}[data-plan-grid]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;width:100%}[data-plan-grid]>div{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:12px 10px;border-bottom:1px solid #243038;border-right:1px solid #243038;text-align:center}[data-plan-grid]>div:last-child{border-right:0}[data-plan-grid] span{font-size:12px;font-weight:700;color:#9aa3ad}[data-plan-grid] b{font-size:18px;font-weight:800;color:#f4f7fb}[data-plan-note]{margin:0;max-width:52rem;font-size:12px;line-height:1.55;color:#9aa3ad;text-align:center}@media (max-width:980px){[data-plan-grid]{grid-template-columns:1fr}[data-plan-grid]>div{border-right:0}}[data-settle-band="spread"]{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:stretch}[data-settle-split]{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;min-width:0;align-items:stretch}[data-settle-band="rank"]{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:stretch}[data-settle-band="edge"]{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:stretch}@media (max-width:1100px){[data-settle-band="edge"]{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:640px){[data-settle-band="edge"]{grid-template-columns:1fr}}[data-settle-mix-wrap]{display:flex;align-items:center;justify-content:center;gap:22px;min-width:0;width:100%}[data-settle-mix-chart]{position:relative;flex:0 0 150px;width:150px;height:150px}[data-settle-mix-chart] svg{display:block;width:150px;height:150px;max-height:none}[data-settle-mix-center]{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none}[data-settle-mix-center] span{font-size:10px;font-weight:800;color:#9aa3ad}[data-settle-mix-center] b{font-size:14px;font-weight:900;color:#f4f7fb;letter-spacing:-.02em}[data-settle-mix-legend]{display:flex;flex-direction:column;align-items:stretch;gap:8px;min-width:0;flex:1 1 auto;max-width:280px}[data-settle-mix-row]{display:grid;grid-template-columns:10px minmax(0,1fr) 40px 72px;align-items:center;justify-items:start;gap:8px;font-size:12px;width:100%}[data-settle-mix-row] i{display:block;width:10px;height:10px;border-radius:3px;flex:0 0 auto}[data-settle-mix-row] span{min-width:0;overflow:hidden;text-overflow:ellipsis;font-weight:700;color:#c5ced8;text-align:left;white-space:nowrap}[data-settle-mix-row] em{font-style:normal;color:#9aa3ad;font-variant-numeric:tabular-nums;text-align:right;justify-self:end}[data-settle-mix-row] b{font-weight:800;color:#f4f7fb;font-variant-numeric:tabular-nums;text-align:right;justify-self:end}@media (max-width:640px){[data-settle-mix-wrap]{flex-direction:column;align-items:center}}[data-settle-hold]{display:none}@media (max-width:980px){[data-settle-metrics]>.grid,[data-settle-metrics]>.grid:last-child{grid-template-columns:1fr}}[data-settle-query] [data-settle-date]{position:relative;display:flex;align-items:center;justify-content:center;width:100%;min-width:168px}[data-settle-query] [data-settle-date] input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}[data-settle-query] [data-settle-face]{display:flex;align-items:center;justify-content:center;width:100%;height:38px;padding:0;border:0;border-bottom:1px solid #6e7882;border-radius:0;background:transparent;color:#f4f7fb;font-size:14px;font-weight:700;text-align:center;letter-spacing:.02em;cursor:pointer}[data-settle-query] [data-open-cal]{position:absolute;right:0;top:50%;transform:translateY(-50%);z-index:1}[data-settle-query] [data-open-cal]{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;border:1px solid #6e7882;background:#1c2126;color:#f4f7fb;cursor:pointer}[data-settle-query] input[type="date"]::-webkit-calendar-picker-indicator{opacity:0;width:0;padding:0;margin:0}[data-settle-query] [data-settle-span-label]{min-width:168px}[data-settle-query] select{color-scheme:dark;background:#1c2126;color:#f4f7fb}[data-settle-query] select option{background:#1c2126;color:#f4f7fb}[data-settle-date]{position:relative}[data-settle-cal]{position:absolute;top:42px;left:0;z-index:50;width:280px;padding:10px;background:#1c2126;border:1px solid #8b95a1;color:#f4f7fb}[data-settle-cal] [data-cal-head]{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}[data-settle-cal] [data-cal-head] strong{font-size:14px;font-weight:800}[data-settle-cal] [data-cal-week],[data-settle-cal] [data-cal-days]{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}[data-settle-cal] [data-cal-week] span{text-align:center;font-size:11px;color:#c5ced8}[data-settle-cal] button{height:32px;min-width:0;padding:0;border:0;background:transparent;color:#f4f7fb;font-size:13px;font-weight:700}[data-settle-cal] [data-cal-day][data-out]{color:#8b95a1}[data-settle-cal] [data-cal-day][data-on]{background:#2f6b4f;color:#f4f7fb}[data-settle-cal] [data-cal-day][data-today]{box-shadow:inset 0 0 0 1px #f4f7fb}[data-settle-pick]{position:relative;display:block}[data-settle-query] [data-span-toggle]{width:100%;height:38px;padding:0 8px;border:0;border-bottom:1px solid #6e7882;background:transparent;color:#f4f7fb;text-align:center;font-size:14px;font-weight:700;cursor:pointer}[data-span-menu]{position:absolute;top:42px;left:0;z-index:50;display:flex;flex-direction:column;min-width:168px;padding:6px 0;background:#15191d;border:1px solid #3a424a;box-shadow:0 10px 24px rgba(0,0,0,.45)}[data-span-menu] button{height:34px;width:100%;padding:0 12px;border:0;background:transparent;color:#e8eef6;text-align:center;font-size:13px;font-weight:700;cursor:pointer}[data-span-menu] button:hover{background:#22282e;color:#f4f7fb}[data-span-menu] button[data-on]{background:#24352e;color:#c8edd8}[data-cash-detail]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}[data-cash-detail] h3{margin:0 0 8px;font-size:15px;font-weight:800;color:#f4f7fb}[data-cash-detail] [data-cash-kind] div{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #243038;font-size:13px;color:#c5ced8}[data-cash-detail] b{color:#f4f7fb;font-size:16px;font-weight:800}[data-cash-detail] [data-cash-profit] span,[data-cash-detail] [data-cash-profit] b{color:#d7ebe4}@media (max-width:980px){[data-cash-detail]{grid-template-columns:1fr}}[data-lower-board] h2,[data-lower-board] th,[data-lower-board] td,[data-lower-board] th *,[data-lower-board] td *{text-align:center!important}[data-lower-board] th{letter-spacing:0!important}[data-lower-board] td button,[data-lower-board] td a,[data-lower-board] td span,[data-lower-board] td div{display:inline-flex;justify-content:center!important;align-items:center;margin-left:auto;margin-right:auto}[data-lower-board] th[data-league-col],[data-lower-board] td[data-league-col]{text-align:left!important}[data-lower-board] th[data-league-col] *,[data-lower-board] td[data-league-col] *{text-align:left!important;justify-content:flex-start!important;margin-left:0!important;margin-right:auto!important}[data-lower-board] td[data-league-col] span,[data-lower-board] td[data-league-col] div{display:inline-flex!important;justify-content:flex-start!important;align-items:center;gap:6px;max-width:100%}[data-lower-board] th[data-home-col],[data-lower-board] td[data-home-col]{width:168px;min-width:168px;max-width:168px;text-align:right!important;padding-left:4px;padding-right:8px}[data-lower-board] th[data-vs-col],[data-lower-board] td[data-vs-col]{width:40px;min-width:40px;max-width:40px;text-align:center!important;padding-left:0;padding-right:0;color:#c5ced8;font-weight:800}[data-lower-board] th[data-away-col],[data-lower-board] td[data-away-col]{width:168px;min-width:168px;max-width:168px;text-align:left!important;padding-left:8px;padding-right:4px}[data-lower-board] td[data-home-col],[data-lower-board] td[data-away-col]{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}[data-lower-board] td[data-home-col]>span,[data-lower-board] td[data-away-col]>span,[data-lower-board] td[data-home-col]>div,[data-lower-board] td[data-away-col]>div{display:inline-flex!important;align-items:center;gap:6px;margin:0!important;max-width:100%;width:auto}[data-lower-board] td[data-home-col]>span,[data-lower-board] td[data-home-col]>div{justify-content:flex-end!important;margin-left:auto!important;margin-right:0!important}[data-lower-board] td[data-away-col]>span,[data-lower-board] td[data-away-col]>div{justify-content:flex-start!important;margin-left:0!important;margin-right:auto!important}[data-lower-board] td[data-home-col] img,[data-lower-board] td[data-away-col] img{width:18px;height:18px;flex:0 0 auto}[data-settle-query]{justify-content:center;align-items:flex-end}[data-settle-query] label{align-items:center;text-align:center}[data-settle-query] [data-span-toggle]{text-align:center}[data-settle-board] h2,[data-cash-detail] h3{text-align:center!important}[data-cash-detail] [data-cash-kind] div{justify-content:center;gap:16px}[data-settle-board] [data-cash-kind]{padding:12px 14px 4px;background:#2c3532;border:1px solid #5a7a6a;border-top-width:3px}[data-settle-board] [data-cash-kind="자체 처리"]{background:#2c3532;border-color:#5a7a6a}[data-settle-board] [data-cash-kind="자체 처리"] h3,[data-settle-board] [data-cash-kind="자체 처리"] [data-cash-profit] span,[data-settle-board] [data-cash-kind="자체 처리"] [data-cash-profit] b{color:#b8e6d2}[data-settle-board] [data-cash-kind="USDT"]{background:#35342c;border-color:#9a8560}[data-settle-board] [data-cash-kind="USDT"] h3,[data-settle-board] [data-cash-kind="USDT"] [data-cash-profit] span,[data-settle-board] [data-cash-kind="USDT"] [data-cash-profit] b{color:#f0e4c0}[data-settle-board] [data-cash-kind="P2P"]{background:#2c3340;border-color:#6a7fa0}[data-settle-board] [data-cash-kind="P2P"] h3,[data-settle-board] [data-cash-kind="P2P"] [data-cash-profit] span,[data-settle-board] [data-cash-kind="P2P"] [data-cash-profit] b{color:#d0def4}[data-settle-board] [data-settle-tone]{padding:12px 14px 16px;border:1px solid transparent;border-top-width:3px}[data-settle-board] [data-settle-tone="in"]{background:#2c3532;border-color:#5a7a6a}[data-settle-board] [data-settle-tone="in"] h2{color:#b8e6d2;border-bottom-color:#5a7a6a}[data-settle-board] [data-settle-tone="out"]{background:#352e32;border-color:#9a6a78}[data-settle-board] [data-settle-tone="out"] h2{color:#f4d4dc;border-bottom-color:#9a6a78}[data-settle-board] [data-settle-tone="sport"]{background:#32362e;border-color:#6e7a5a}[data-settle-board] [data-settle-tone="sport"] h2{color:#e2ecd0;border-bottom-color:#6e7a5a}[data-settle-board] [data-settle-tone="type"]{background:#2e3634;border-color:#5a7a72}[data-settle-board] [data-settle-tone="type"] h2{color:#d0ece4;border-bottom-color:#5a7a72}[data-settle-board] [data-settle-tone="casino"]{background:#322e38;border-color:#7a6a90}[data-settle-board] [data-settle-tone="casino"] h2{color:#e2d6f0;border-bottom-color:#7a6a90}[data-settle-board] [data-settle-tone="win"]{background:#35342c;border-color:#9a8560}[data-settle-board] [data-settle-tone="win"] h2{color:#f0e4c0;border-bottom-color:#9a8560}[data-settle-board] [data-settle-tone="loss"]{background:#322e38;border-color:#7a6a90}[data-settle-board] [data-settle-tone="loss"] h2{color:#e2d6f0;border-bottom-color:#7a6a90}[data-settle-sample]{display:flex;flex-direction:column;align-items:stretch;gap:10px;margin-top:4px;width:100%}[data-settle-sample][data-settle-list]{gap:0;margin-top:10px}[data-settle-list-head],[data-settle-list-row]{display:grid;grid-template-columns:40px minmax(96px,1fr) 104px;gap:8px;align-items:center;width:100%;padding:11px 6px;border-bottom:1px solid #243038}[data-settle-list-head][data-with-meta],[data-settle-list-row][data-with-meta]{grid-template-columns:40px minmax(96px,1fr) 52px 104px}[data-settle-list-head][data-plain],[data-settle-list-row][data-plain]{grid-template-columns:minmax(96px,1fr) 72px}[data-settle-list-head]{padding-top:0;padding-bottom:8px;border-bottom-color:#3a424a;font-size:11px;font-weight:700;color:#8b95a1}[data-settle-list-head] span,[data-settle-list-head] span:last-child,[data-settle-list-head] span:nth-child(3){text-align:center!important;justify-self:center}[data-settle-list-row]:last-child{border-bottom:0}[data-settle-list-row] em{font-style:normal;font-size:12px;font-weight:800;color:#8b95a1;font-variant-numeric:tabular-nums;text-align:center!important;justify-self:center}[data-settle-list-row] span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:700;color:#e8eef6;text-align:center!important;justify-self:center}[data-settle-list-row] i{font-style:normal;font-size:12px;font-weight:700;color:#9aa3ad;text-align:center!important;justify-self:center;font-variant-numeric:tabular-nums}[data-settle-list-row] b{font-size:14px;font-weight:800;color:#f4f7fb;text-align:center!important;justify-self:center;font-variant-numeric:tabular-nums;white-space:nowrap}[data-settle-tone="win"] [data-settle-list-row] b{color:#f0e4c0}[data-settle-tone="loss"] [data-settle-list-row] b{color:#e2d6f0}[data-settle-tone="in"] [data-settle-list-row] b{color:#b8e6d2}[data-settle-tone="out"] [data-settle-list-row] b{color:#f4d4dc}[data-settle-board] [data-settle-tone] p{margin:0 0 2px;padding:0 6px;font-size:11px;line-height:1.45;color:#9aa3ad;text-align:center}[data-settle-size]{display:inline-flex;align-items:baseline;gap:3px;font-size:11px;font-weight:600;color:#8b95a1;white-space:nowrap}[data-settle-size] select{height:auto;min-width:0;margin:0;padding:0 0 1px;border:0;border-bottom:1px solid #5a6570;border-radius:0;background:transparent;color:#c5ced8;font-size:12px;font-weight:700;cursor:pointer}[data-settle-size] select:hover,[data-settle-size] select:focus{color:#f4f7fb;border-bottom-color:#c5ced8;outline:none}[data-settle-size] select option{background:#15191d;color:#f4f7fb}[data-settle-board] [data-settle-tone]>div:first-child:has([data-settle-size]){display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8px;padding-bottom:8px;border-bottom:1px solid #3a424a;margin-bottom:4px}[data-settle-board] [data-settle-tone]>div:first-child:has([data-settle-size]) h2{grid-column:2;margin:0;padding:0;border:0;width:auto;text-align:center}[data-settle-board] [data-settle-tone]>div:first-child:has([data-settle-size]) [data-settle-size]{grid-column:3;justify-self:end;align-self:center}[data-settle-tone="in"] [data-settle-sample-bar],[data-settle-tone="sport"] [data-settle-sample-bar]{background:#6fa889}[data-settle-tone="type"] [data-settle-sample-bar]{background:#6fa8a0}[data-settle-tone="casino"] [data-settle-sample-bar]{background:#8a78a8}[data-settle-tone="out"] [data-settle-sample-bar]{background:#b87a8a}[data-settle-tone="win"] [data-settle-sample-bar]{background:#b89a62}[data-settle-tone="loss"] [data-settle-sample-bar]{background:#8a78a8}[data-risk-board]{display:flex;flex-direction:column;gap:22px;margin-top:8px;padding:4px 0 8px}[data-risk-board] section{background:transparent;border:0;border-radius:0;box-shadow:none;overflow-x:auto}[data-risk-board] h2{display:block;width:100%;margin:0 0 12px;padding:0 0 8px;font-size:18px;font-weight:800;color:#f4f7fb;text-align:center;border-bottom:1px solid #3a424a}[data-risk-board] table,[data-risk-members] table{width:100%;border-collapse:collapse;background:transparent}[data-risk-board] th,[data-risk-members] th{padding:0 10px 8px;font-size:11px;font-weight:700;color:#8b95a1;text-align:center;border:0;border-bottom:1px solid #2a3138;white-space:nowrap}[data-risk-board] td,[data-risk-members] td{padding:12px 10px;font-size:12px;line-height:1.35;text-align:center;border:0;border-bottom:1px solid #1c2228;white-space:nowrap}[data-risk-board] tbody tr:last-child td,[data-risk-members] tbody tr:last-child td{border-bottom:0}[data-risk-board] th,[data-risk-board] td,[data-risk-board] th *,[data-risk-board] td *,[data-risk-members] th,[data-risk-members] td,[data-risk-members] th *,[data-risk-members] td *{text-align:center!important}[data-risk-members]{margin-top:4px;text-align:center}[data-risk-summary]{display:flex;flex-direction:column;gap:12px}[data-risk-zones]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:stretch}[data-risk-zones] section{grid-column:auto!important}[data-risk-zones] h2{font-size:18px!important;margin:0 0 4px;text-align:center}[data-risk-zones] [data-zone-grid]{grid-template-columns:repeat(2,minmax(0,1fr))!important}[data-risk-members]+p,main section:has([data-risk-members]) p{text-align:center}'
  document.head.appendChild(style)
}

function init() {
  boardLayout()
  paintTopSums()
  const rendered = renderPlaceholder()
  stampDemoMarks()
  markCart()
  paintSlip('sync')
  paintDashboardMatches()
  reshapeFinance()
  reshapeRisk()
  markLooseRows()
  mountExtraCash()
  if (document.querySelector('main .grid .animate-pulse, main .aspect-\\[4\\/3\\]')) {
    const kind = location.pathname.includes('mini') ? 'mini' : location.pathname.includes('slot') ? 'slots' : 'live'
    paintGames(kind)
    document.querySelectorAll('main button').forEach((button) => {
      const label = labelOf(button)
      const map = { '라이브 카지노': '/nex/casino-live.html', 슬롯게임: '/nex/casino-slots.html', 미니게임: '/nex/casino-mini.html' }
      if (map[label]) button.addEventListener('click', () => { location.href = map[label] })
    })
  }
  bindSettingsTabs()
  bindSettings()
  bindSupport()
  bindMail()
  bindBoardQueue()
  bindPageForms()
  bindRefresh()
  bindPeriodPopover()
  document.querySelectorAll('button').forEach((button) => {
    const label = labelOf(button)
    if (label === '로그아웃') {
      button.addEventListener('click', () => {
        toast('로그아웃했습니다.')
        setTimeout(() => { location.href = '/nex/home.html' }, 500)
      })
    }
    if (label === '알림') {
      button.addEventListener('click', () => {
        const logs = store().logs
        toast(logs.length ? logs[0].text : '새 알림이 없습니다.')
      })
    }
  })
  document.querySelectorAll('main input, main select').forEach((node) => {
    node.addEventListener('input', refreshTables)
    node.addEventListener('change', refreshTables)
  })
  document.querySelectorAll('main').forEach((main) => {
    main.addEventListener('click', (event) => {
      const button = event.target.closest('button')
      if (!button || !main.contains(button) || button.closest('thead') || button.dataset.bet || button.dataset.user) return
      if (labelOf(button) === '심사') {
        openReview(button.closest('tr'))
        return
      }
      if (button.dataset.game || button.dataset.answer || button.dataset.expose || button.dataset.audit || button.dataset.banner || button.dataset.placed || button.dataset.read || button.dataset.like || button.dataset.odd || button.dataset.preset || button.dataset.slipToggle || button.dataset.placeSlip || button.dataset.clearSlip || button.closest('form')) return
      const group = button.parentElement
      if (!group) return
      const siblings = [...group.children].filter((node) => node.tagName === 'BUTTON')
      if (siblings.length < 2) return
      const label = labelOf(button)
      if (['저장', '기본값으로', '등급없음', '실버', '골드', 'VIP', '새로고침', '라이브 카지노', '슬롯게임', '미니게임', '문의하기', '등록', '신청', '추가', '대조 실행'].includes(label)) return
      if (!/^(전체|전부|오늘|금일|금월|전월|\d+일|베팅|적중|환불|입금|출금|조정|대기|승인|거절|지급 실패|계좌|USDT|AXpay|전체 유형|종류 전체|진행 중|미적중|정상|차단|답변|공지|이벤트|자유|로비|예정|라이브|종료|노출|숨김|미열람|열람|지급|회수)$/.test(label)) return
      const onClass = siblings.find((node) => node.className.includes('bg-accent'))?.className
        || 'px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors bg-accent-soft text-accent'
      const offClass = siblings.find((node) => !node.className.includes('bg-accent'))?.className
        || 'px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors text-dim hover:text-fg hover:bg-card'
      if (onClass === offClass) return
      siblings.forEach((node) => {
        node.className = node === button ? onClass : offClass
      })
      event.stopImmediatePropagation()
      refreshTables()
    }, true)
  })
  document.querySelectorAll('main button').forEach((button) => {
    const text = button.textContent.trim()
    if (text !== '‹' && text !== '›') return
    button.addEventListener('click', () => {
      const table = [...document.querySelectorAll('main table')].find((item) => button.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_PRECEDING)
      if (!table) return
      const page = Number(table.dataset.page || 0)
      const pages = Number(table.dataset.pages || 1)
      const next = text === '›' ? Math.min(pages - 1, page + 1) : Math.max(0, page - 1)
      applyTable(table, next)
      const indicator = button.parentElement?.querySelector('button')
      if (indicator && indicator !== button && /^\d+$/.test(indicator.textContent.trim())) indicator.textContent = String(next + 1)
    })
  })
  if (!rendered) refreshTables()
  else refreshTables()
  document.documentElement.dataset.nexInit = '1'
}

try {
  init()
} catch (error) {
  document.documentElement.dataset.nexError = String(error && error.message)
}
