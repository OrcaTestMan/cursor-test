/**
 * 관리자 화면을 origin/dev 와 현재 브랜치에서 페이지 전체로 찍어 비교한다.
 * 예외 화면 없이 전부 검사한다. 페이지 전체 높이가 10% 이상 다르면 실패한다.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'docs', 'nex-ui-compare')
const BASE = process.env.NEX_BASE_URL || 'http://localhost:5173'
const VIEWPORT = { width: 1440, height: 900 }
const PIXEL_LIMIT = Number(process.env.NEX_SCREEN_PIXEL_LIMIT || 400)
const HEIGHT_RATIO = Number(process.env.NEX_SCREEN_HEIGHT_RATIO || 0.1)
const PAGES = fs.readdirSync(path.join(ROOT, 'apps', 'web', 'public', 'nex'))
  .filter((name) => name.endsWith('.html') && !name.startsWith('_') && name !== 'login.html')
  .sort()

async function loadPlaywright() {
  const local = path.join(ROOT, 'node_modules', 'playwright', 'index.mjs')
  if (!fs.existsSync(local)) return null
  return import(pathToFileURL(local).href)
}

function writeRef(name, ref) {
  const target = path.join(OUT, `_${name}.js`)
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(target, execFileSync('git', ['show', `${ref}:apps/web/public/nex/nex-behavior.js`]))
  return target
}

async function main() {
  const pw = await loadPlaywright()
  if (!pw) {
    console.error('playwright 가 없습니다. yarn add -D playwright 후 yarn playwright install chromium')
    process.exit(1)
  }
  const health = spawnSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}', `${BASE}/nex/finance.html`], { encoding: 'utf8' })
  if (String(health.stdout || '').trim() !== '200') {
    console.error(`nex-screens: ${BASE} 에 접속하지 못했습니다. yarn dev 후 다시 실행하세요.`)
    process.exit(1)
  }

  for (const name of ['after', 'baseline']) {
    fs.mkdirSync(path.join(OUT, name), { recursive: true })
  }
  const files = {
    baseline: writeRef('baseline', 'origin/dev'),
  }

  const { chromium } = pw
  const ME = JSON.stringify({ login: 'admin', nick: '관리자', role: 'superadmin' })
  let browser
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' })
  } catch {
    browser = await chromium.launch({ headless: true })
  }
  const shots = { after: {}, baseline: {} }
  const heights = { after: {}, baseline: {} }

  async function attachRoutes(context, mode) {
    await context.route('**/api/auth/me', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: ME,
    }))
    await context.route('**/api/**', async (route) => {
      if (route.request().url().includes('/api/auth/me')) {
        return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: ME })
      }
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: '{}' })
    })
    await context.route('**/nex/nex-behavior.js**', async (route) => {
      if (mode === 'after') return route.continue()
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: fs.readFileSync(files[mode]),
      })
    })
    await context.route('**/nex/nex-table.css**', async (route) => {
      if (mode === 'after') return route.continue()
      return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    })
  }

  async function captureFull(page, session) {
    await session.send('Emulation.clearDeviceMetricsOverride').catch(() => {})
    await page.setViewportSize(VIEWPORT)
    const height = await page.evaluate(() => Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
    ))
    await session.send('Emulation.setDeviceMetricsOverride', {
      mobile: false,
      width: VIEWPORT.width,
      height: Math.max(VIEWPORT.height, Math.min(height, 20000)),
      deviceScaleFactor: 1,
    })
    const { data } = await session.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
    })
    return { buf: Buffer.from(data, 'base64'), height }
  }

  for (const mode of ['baseline', 'after']) {
    const context = await browser.newContext({ viewport: VIEWPORT })
    await attachRoutes(context, mode)
    const page = await context.newPage()
    const session = await context.newCDPSession(page)
    for (const file of PAGES) {
      await page.goto(`${BASE}/nex/${file}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForFunction(
        () => document.documentElement.dataset.nexInit === '1' || document.documentElement.dataset.nexError,
        null,
        { timeout: 8000 },
      ).catch(() => {})
      if (page.url().includes('login.html')) {
        throw new Error(`${mode} ${file}: 로그인 화면으로 떨어졌습니다.`)
      }
      const shown = await captureFull(page, session)
      fs.writeFileSync(path.join(OUT, mode, file.replace(/\.html$/, '.png')), shown.buf)
      heights[mode][file] = shown.height
      await page.evaluate(() => {
        document.querySelectorAll('[data-top-sums]').forEach((node) => { node.style.display = 'none' })
      })
      const cmp = await captureFull(page, session)
      shots[mode][file] = cmp.buf
    }
    await context.close()
  }

  const decodePage = await browser.newPage()
  async function countDiff(aBuf, bBuf) {
    return decodePage.evaluate(async ({ a, b }) => {
      async function load(raw) {
        const img = new Image()
        img.src = `data:image/png;base64,${raw}`
        await img.decode()
        return img
      }
      const left = await load(a)
      const right = await load(b)
      const width = Math.min(left.width, right.width)
      const height = Math.min(left.height, right.height)
      const sizeGap = Math.max(left.height, right.height)
        ? Math.abs(left.height - right.height) / Math.max(left.height, right.height)
        : 0
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(left, 0, 0)
      const da = ctx.getImageData(0, 0, width, height).data
      ctx.drawImage(right, 0, 0)
      const db = ctx.getImageData(0, 0, width, height).data
      let diff = 0
      for (let i = 0; i < da.length; i += 4) {
        if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) diff += 1
      }
      return { sizeMismatch: sizeGap > 0.1, diff, width, height }
    }, { a: aBuf.toString('base64'), b: bBuf.toString('base64') })
  }

  const fails = []
  const rows = []
  for (const file of PAGES) {
    const afterH = heights.after[file]
    const baseH = heights.baseline[file]
    const heightGap = baseH ? Math.abs(afterH - baseH) / baseH : 1
    const cmp = await countDiff(shots.after[file], shots.baseline[file])
    const heightFail = heightGap > HEIGHT_RATIO
    const ok = !heightFail && !cmp.sizeMismatch && cmp.diff <= PIXEL_LIMIT
    rows.push({
      file,
      ok,
      diff: cmp.sizeMismatch ? 'size' : cmp.diff,
      afterH,
      baseH,
      heightGap,
    })
    if (!ok) {
      const why = []
      if (heightFail) why.push(`높이 ${baseH}→${afterH} (${Math.round(heightGap * 100)}%)`)
      if (cmp.sizeMismatch) why.push('스크린샷 크기 불일치')
      else if (cmp.diff > PIXEL_LIMIT) why.push(`${cmp.diff}px`)
      fails.push(`${file}: ${why.join(', ')}`)
    }
  }

  await browser.close()
  const reportDir = path.join(OUT, 'report')
  fs.mkdirSync(reportDir, { recursive: true })
  for (const name of ['finance', 'risk', 'users']) {
    for (const mode of ['after', 'baseline']) {
      const src = path.join(OUT, mode, `${name}.png`)
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(reportDir, `${name}-${mode}.png`))
    }
  }
  const report = rows.map((row) => (
    `${row.ok ? 'PASS' : 'FAIL'} ${row.file} diff=${row.diff} height=${row.afterH}/${row.baseH}`
  )).join('\n')
  fs.writeFileSync(path.join(OUT, 'report.txt'), `${report}\n`)
  console.log(report)
  if (fails.length) {
    console.error(`nex-screens check failed (${fails.length})`)
    fails.forEach((line) => console.error(line))
    process.exit(1)
  }
  console.log('nex-screens check passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
