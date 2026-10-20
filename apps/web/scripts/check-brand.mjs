import fs from 'node:fs'

const t = fs.readFileSync('public/nex/risk.html', 'utf8')
const logoOld = 'NEX<span class="text-accent"> Demo</span>'
const logoNew = 'Noname<span class="text-accent"> Demo</span>'
console.log('old logo count', t.split(logoOld).length - 1)
console.log('new logo count', t.split(logoNew).length - 1)
console.log('NEX DEMO count', t.split('NEX DEMO').length - 1)
console.log('Noname Demo count', t.split('Noname Demo').length - 1)
const j = t.indexOf('font-black tracking-tight text-fg')
console.log('logo snippet', JSON.stringify(t.slice(j, j + 140)))
console.log('title', (t.match(/<title>[^<]+<\/title>/) || [])[0])

// find any remaining NEX near Demo
let idx = 0
let n = 0
while ((idx = t.indexOf('NEX', idx)) !== -1 && n < 8) {
  console.log('NEX@', idx, JSON.stringify(t.slice(idx, idx + 60)))
  idx += 3
  n += 1
}
