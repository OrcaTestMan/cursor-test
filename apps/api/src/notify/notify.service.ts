import { Injectable } from '@nestjs/common'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

@Injectable()
export class NotifyService {
  /** 알림 단일 진입점. 토큰이 없으면 로그만 남기고 끝낸다. */
  async notify(input: {
    level?: string
    title: string
    detail?: string
    extra?: unknown
  }) {
    const file = pathToFileURL(
      path.resolve(process.cwd(), 'scripts/lib/notify.mjs'),
    ).href
    const mod = (await import(file)) as {
      sendNotify: (payload: typeof input) => Promise<unknown>
    }
    return mod.sendNotify(input)
  }
}
