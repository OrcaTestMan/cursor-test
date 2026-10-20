import fs from 'node:fs'
import path from 'node:path'

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(html|js)$/i.test(e.name)) out.push(p)
  }
  return out
}

const files = walk('public/nex').concat(['index.html'].filter((f) => fs.existsSync(f)))
const report = []
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  // Visible brand-ish: NEX not part of /nex/ path, nex_, nex-, .nex, nex.
  const samples = []
  for (const m of text.matchAll(/NEX/g)) {
    const start = Math.max(0, m.index - 20)
    const end = Math.min(text.length, m.index + 40)
    const ctx = text.slice(start, end).replace(/\s+/g, ' ')
    // skip URL path /nex/ and file names like nex-behavior already lowercase
    if (/\/nex\//i.test(ctx)) continue
    if (/nex_/i.test(ctx)) continue
    samples.push(ctx)
    if (samples.length >= 5) break
  }
  if (samples.length) {
    report.push({ file, samples })
  }
}
console.log(JSON.stringify(report, null, 2))
console.log('filesWithNEX', report.length)
