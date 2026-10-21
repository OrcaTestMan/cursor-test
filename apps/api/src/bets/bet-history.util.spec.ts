import { describe, expect, it } from 'vitest'
import {
  decodeCursor,
  encodeCursor,
  folderLabel,
  ledgerKind,
  paidAmount,
  parseStatusFilter,
  statusLabel,
} from './bet-history.util.js'

describe('bet-history.util', () => {
  it('상태 필터와 화면 라벨을 맞춘다', () => {
    expect(parseStatusFilter('진행')).toBe('진행 중')
    expect(parseStatusFilter('낙첨')).toBe('미적중')
    expect(statusLabel('진행 중')).toBe('진행')
    expect(statusLabel('미적중')).toBe('낙첨')
  })

  it('지급액은 적중·취소·적특만 잡는다', () => {
    expect(paidAmount('적중', 10000, 20000)).toBe(20000)
    expect(paidAmount('취소', 10000, 20000)).toBe(10000)
    expect(paidAmount('적특', 10000, 20000)).toBe(10000)
    expect(paidAmount('미적중', 10000, 20000)).toBe(0)
    expect(paidAmount('진행 중', 10000, 20000)).toBe(0)
  })

  it('원장 종류와 폴더 라벨을 구분한다', () => {
    expect(ledgerKind('bet_place', -10000)).toBe('차감')
    expect(ledgerKind('bet_win', 20000)).toBe('지급')
    expect(ledgerKind('bet_cancel', 10000)).toBe('환불')
    expect(ledgerKind('bet_push', 10000)).toBe('환불')
    expect(folderLabel('multi', 2)).toBe('다폴더')
    expect(folderLabel('single', 1)).toBe('단폴더')
  })

  it('커서를 왕복한다', () => {
    const at = new Date('2026-10-21T00:00:00.000Z')
    const cursor = encodeCursor(at, 12)
    expect(decodeCursor(cursor)).toEqual({ placedAt: at, id: 12 })
    expect(decodeCursor('bad')).toBeUndefined()
  })
})
