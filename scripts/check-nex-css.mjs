/**
 * 코드 안 CSS 문자열의 괄호와 문법을 검사한다.
 * boardLayout(), settleAlignStyle() 등을 실제 CSS 파서로 확인한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILES = [
  path.join(ROOT, 'apps', 'web', 'public', 'nex', 'nex-behavior.js'),
  path.join(ROOT, 'scripts', 'nex-behavior.js'),
]
const FN_NAMES = ['boardLayout', 'settleAlignStyle']
const errors = []

function sliceUntil(src, name) {
  const start = src.indexOf(`function ${name}(`)
  if (start < 0) return ''
  const end = src.indexOf('\nfunction ', start + 1)
  return end < 0 ? src.slice(start) : src.slice(start, end)
}

function readQuoted(src, from) {
  let out = ''
  for (let i = from + 1; i < src.length; i += 1) {
    const ch = src[i]
    if (ch === '\\') {
      out += src[i + 1] || ''
      i += 1
      continue
    }
    if (ch === "'") return { text: out, end: i + 1 }
    out += ch
  }
  throw new Error('닫히지 않은 CSS 문자열')
}

function extractCss(fnText) {
  const blocks = []
  let i = 0
  while (i < fnText.length) {
    const assign = fnText.indexOf('style.textContent', i)
    if (assign < 0) break
    const eq = fnText.indexOf('=', assign)
    let j = eq + 1
    while (j < fnText.length && /\s/.test(fnText[j])) j += 1
    if (fnText[j] === "'") {
      const one = readQuoted(fnText, j)
      blocks.push(one.text)
      i = one.end
      continue
    }
    if (fnText[j] === '[') {
      const parts = []
      j += 1
      while (j < fnText.length) {
        while (j < fnText.length && /[\s,]/.test(fnText[j])) j += 1
        if (fnText[j] === ']') {
          j += 1
          break
        }
        if (fnText[j] === "'") {
          const one = readQuoted(fnText, j)
          parts.push(one.text)
          j = one.end
          continue
        }
        throw new Error('settleAlignStyle 배열을 읽지 못했습니다')
      }
      blocks.push(parts.join(''))
      i = j
      continue
    }
    i = assign + 1
  }
  return blocks.join('\n')
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function braceReport(css) {
  let depth = 0
  let extraClose = 0
  let inStr = ''
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i]
    if (inStr) {
      if (ch === '\\') {
        i += 1
        continue
      }
      if (ch === inStr) inStr = ''
      continue
    }
    if (ch === '"' || ch === "'") {
      inStr = ch
      continue
    }
    if (ch === '{') depth += 1
    if (ch === '}') {
      depth -= 1
      if (depth < 0) {
        extraClose += 1
        depth = 0
      }
    }
  }
  return { depth, extraClose }
}

function parseCss(css) {
  const text = stripComments(css)
  const rules = []
  let i = 0
  const len = text.length

  function skipSpace() {
    while (i < len && /\s/.test(text[i])) i += 1
  }

  function readBlock() {
    if (text[i] !== '{') throw new Error(`${i}번째 글자: '{'가 필요합니다`)
    i += 1
    let depth = 1
    let inStr = ''
    const start = i
    while (i < len) {
      const ch = text[i]
      if (inStr) {
        if (ch === '\\') {
          i += 2
          continue
        }
        if (ch === inStr) inStr = ''
        i += 1
        continue
      }
      if (ch === '"' || ch === "'") {
        inStr = ch
        i += 1
        continue
      }
      if (ch === '{') depth += 1
      if (ch === '}') {
        depth -= 1
        if (depth === 0) {
          const body = text.slice(start, i)
          i += 1
          return body
        }
      }
      i += 1
    }
    throw new Error('닫히지 않은 CSS 블록')
  }

  function readRules() {
    while (i < len) {
      skipSpace()
      if (i >= len || text[i] === '}') return
      const start = i
      if (text.startsWith('@media', i) || text.startsWith('@supports', i) || text.startsWith('@keyframes', i)) {
        while (i < len && text[i] !== '{') i += 1
        const prelude = text.slice(start, i).trim()
        const body = readBlock()
        const innerStart = i - body.length - 1
        const saved = i
        i = innerStart
        const endAt = i + body.length
        const nested = []
        while (i < endAt) {
          skipSpace()
          if (i >= endAt) break
          const mark = i
          readRules()
          if (i === mark) throw new Error(`${prelude} 안을 파싱하지 못했습니다`)
        }
        i = saved
        rules.push({ kind: 'at', prelude })
        continue
      }
      while (i < len && text[i] !== '{') i += 1
      const selector = text.slice(start, i).trim()
      if (!selector) throw new Error(`${start}번째 글자: 선택자가 비어 있습니다`)
      readBlock()
      rules.push({ kind: 'rule', selector: selector.slice(0, 80) })
    }
  }

  readRules()
  skipSpace()
  if (i < len) throw new Error(`${i}번째 글자 이후 CSS가 남았습니다`)
  return rules
}

function parseWithPostcss(css, label) {
  try {
    const require = createRequire(import.meta.url)
    const postcss = require('postcss')
    postcss.parse(css, { from: label })
    return null
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return 'skip'
    return error.reason || error.message
  }
}

for (const file of FILES) {
  if (!fs.existsSync(file)) {
    errors.push(`${path.relative(ROOT, file)} 없음`)
    continue
  }
  const src = fs.readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, file)
  for (const name of FN_NAMES) {
    const fnText = sliceUntil(src, name)
    if (!fnText) {
      if (name === 'boardLayout') errors.push(`${rel}: ${name}() 없음`)
      continue
    }
    let css = ''
    try {
      css = extractCss(fnText)
    } catch (error) {
      errors.push(`${rel} ${name}(): ${error.message}`)
      continue
    }
    if (!css.trim()) {
      errors.push(`${rel} ${name}(): CSS 문자열이 없습니다`)
      continue
    }
    const braces = braceReport(css)
    if (braces.depth !== 0 || braces.extraClose) {
      errors.push(`${rel} ${name}(): 괄호 불일치 depth=${braces.depth} extraClose=${braces.extraClose} len=${css.length}`)
    }
    try {
      const rules = parseCss(css)
      console.log(`${rel} ${name}(): rules=${rules.length} len=${css.length}`)
    } catch (error) {
      errors.push(`${rel} ${name}(): 파서 ${error.message}`)
    }
    const postcssError = parseWithPostcss(css, `${rel}:${name}`)
    if (postcssError && postcssError !== 'skip') {
      errors.push(`${rel} ${name}(): postcss ${postcssError}`)
    } else if (postcssError === 'skip') {
      console.log(`${rel} ${name}(): postcss 없음, 내장 파서만 사용`)
    } else {
      console.log(`${rel} ${name}(): postcss ok`)
    }
  }
}

if (errors.length) {
  console.error(`nex-css check failed (${errors.length})`)
  errors.forEach((line) => console.error(line))
  process.exit(1)
}

console.log('nex-css check passed')
