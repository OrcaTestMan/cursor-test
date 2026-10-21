/**
 * 운영 알림 단일 함수.
 * 항상 로그 파일에 남긴다.
 * TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID 가 둘 다 있을 때만 텔레그램 발송.
 * 값이 비어 있거나 발송이 실패해도 예외를 던지지 않는다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const logDir = path.join(root, 'logs')

function logPath() {
  const day = new Date().toISOString().slice(0, 10)
  return path.join(logDir, `notify-${day}.log`)
}

export async function sendNotify({
  level = 'info',
  title,
  detail = '',
  extra = null,
} = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level: String(level || 'info'),
    title: String(title || '(no title)'),
    detail: String(detail || ''),
    extra,
  }
  const line = JSON.stringify(payload)
  try {
    fs.mkdirSync(logDir, { recursive: true })
    fs.appendFileSync(logPath(), line + '\n', 'utf8')
  } catch (err) {
    console.error('notify log write failed', err?.message || err)
  }

  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim()
  if (!token || !chatId) {
    return { logged: true, telegram: false }
  }

  try {
    const text = [`[${payload.level}] ${payload.title}`, payload.detail]
      .filter(Boolean)
      .join('\n')
      .slice(0, 3500)
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      fs.appendFileSync(
        logPath(),
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          title: 'telegram send failed',
          detail: `${res.status} ${body}`.slice(0, 500),
        }) + '\n',
        'utf8',
      )
      return { logged: true, telegram: false }
    }
    return { logged: true, telegram: true }
  } catch (err) {
    try {
      fs.appendFileSync(
        logPath(),
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          title: 'telegram send error',
          detail: String(err?.message || err),
        }) + '\n',
        'utf8',
      )
    } catch {
      /* ignore */
    }
    return { logged: true, telegram: false }
  }
}
