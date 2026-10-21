/**
 * 공통 표 파일 밖에서 표 정렬 패치를 찾는다.
 * 실패 시 process.exit(1)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCAN = [
  path.join(ROOT, 'apps', 'web', 'public', 'nex'),
  path.join(ROOT, 'scripts', 'nex-behavior.js'),
]
const SKIP = new Set(['nex-table.css', '_table-sample.html'])
const TABLE_HINT = /data-settle-list|nex-board|nex-list|\bthead\b|\btbody\b|<th\b|<td\b|\btable\b/i
const ALIGN = /text-align\s*:|justify-content\s*:|justify-items\s*:|grid-template-columns[^;\n]*1fr|minmax\(0,\s*1fr\)/
const TAILWIND_ALIGN = /class(Name)?="[^"]*\btext-(center|left|right|start|end)\b[^"]*"/
const hits = []

function walk(target) {
  const stat = fs.statSync(target)
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(target)) {
      if (SKIP.has(name)) continue
      if (name.endsWith('_files') || name.endsWith('.map')) continue
      walk(path.join(target, name))
    }
    return
  }
  if (!/\.(js|html|css)$/.test(target)) return
  let text = fs.readFileSync(target, 'utf8')
  if (target.endsWith('.html')) {
    const blocks = []
    text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, body) => { blocks.push(body); return '' })
    text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, body) => { blocks.push(body); return '' })
    text = blocks.join('\n')
  }
  const rel = path.relative(ROOT, target)
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (!TABLE_HINT.test(line)) return
    if (ALIGN.test(line) || (TAILWIND_ALIGN.test(line) && /<th|<td|table/.test(line))) {
      hits.push(`${rel}:${index + 1}: ${line.trim().slice(0, 180)}`)
    }
  })
}

for (const item of SCAN) walk(item)

if (hits.length) {
  console.error(`nex-table check failed (${hits.length})`)
  hits.slice(0, 80).forEach((line) => console.error(line))
  if (hits.length > 80) console.error(`... ${hits.length - 80} more`)
  process.exit(1)
}

console.log('nex-table check passed')
