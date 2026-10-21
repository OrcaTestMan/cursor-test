/**
 * 코드 변경이 있는데 작업내역.md가 빠진 커밋/스테이징을 찾는다.
 * 실패 시 process.exit(1)
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

function namesFrom(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function isCode(file) {
  if (file === '작업내역.md' || file.endsWith('.md') || file.endsWith('.mdc')) return false
  return /^(apps|scripts)\//.test(file) || file === 'package.json' || file === 'docker-compose.yml' || file === 'docker-compose.server.yml'
}

let names = namesFrom(git(['diff', '--cached', '--name-only']))
let source = 'staged'
if (!names.length) {
  names = namesFrom(git(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']))
  source = 'HEAD'
}

const code = names.filter(isCode)
const hasLog = names.includes('작업내역.md')

if (code.length && !hasLog) {
  console.error(`work-log check failed (${source}): code changed without 작업내역.md`)
  code.slice(0, 40).forEach((file) => console.error(`  ${file}`))
  process.exit(1)
}

console.log(`work-log check passed (${source})`)
