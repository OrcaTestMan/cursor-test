import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKIP_DIRS = new Set(['node_modules', '.git'])

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(html|js|css|json|txt|md|tsx?|jsx?|mjs|cjs|svg)$/i.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function rewrite(text) {
  let next = text
  // Logo: NEX + accent Demo (with/without space)
  next = next.replaceAll(
    'NEX<span class="text-accent"> Demo</span>',
    'Noname<span class="text-accent"> Demo</span>',
  )
  next = next.replaceAll(
    'NEX<span class="text-accent">Demo</span>',
    'Noname<span class="text-accent">Demo</span>',
  )
  // Escaped HTML entities in RSC / JSON payloads
  next = next.replaceAll(
    'NEX\\u003cspan class=\\"text-accent\\"\\u003e Demo\\u003c/span\\u003e',
    'Noname\\u003cspan class=\\"text-accent\\"\\u003e Demo\\u003c/span\\u003e',
  )
  next = next.replaceAll(
    'NEX\\u003cspan class=\\"text-accent\\"\\u003eDemo\\u003c/span\\u003e',
    'Noname\\u003cspan class=\\"text-accent\\"\\u003eDemo\\u003c/span\\u003e',
  )
  // Plain brand strings
  next = next.replaceAll('NEX DEMO', 'Noname Demo')
  next = next.replaceAll('NEX Demo', 'Noname Demo')
  next = next.replaceAll('Nex Demo', 'Noname Demo')
  next = next.replaceAll('nex demo', 'noname demo')
  // Standalone logo word before closing span (user-facing header)
  next = next.replaceAll(
    'tracking-tight text-fg">NEX</span>',
    'tracking-tight text-fg">Noname</span>',
  )
  // Demo bank placeholder copy
  next = next.replaceAll('NEX은행', 'Noname은행')
  next = next.replaceAll('넥스게임즈', 'Noname')
  // Code comments
  next = next.replaceAll('// NEX 원본', '// 원본')
  return next
}

const targets = [root]
const changed = []
for (const base of targets) {
  for (const file of walk(base)) {
    // skip this script's own search patterns after first run content
    if (file.endsWith(`${path.sep}rename-brand.mjs`)) continue
    if (file.endsWith(`${path.sep}check-brand.mjs`)) continue
    if (file.endsWith(`${path.sep}scan-nex-visible.mjs`)) continue
    const before = fs.readFileSync(file, 'utf8')
    const after = rewrite(before)
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8')
      changed.push(path.relative(root, file))
    }
  }
}

const residual = []
for (const file of walk(root)) {
  if (file.includes('rename-brand') || file.includes('check-brand') || file.includes('scan-nex')) {
    continue
  }
  const text = fs.readFileSync(file, 'utf8')
  if (
    /NEX\s*DEMO|NEX Demo|NEX<span class="text-accent">\s*Demo<\/span>|tracking-tight text-fg">NEX</i.test(
      text,
    )
  ) {
    residual.push(path.relative(root, file))
  }
}

console.log(
  JSON.stringify({ changedCount: changed.length, changed, residualCount: residual.length, residual }, null, 2),
)
