import { useEffect } from 'react'
import { useOutletContext } from 'react-router'
import { formatShort } from './format'
import type { AdminUser, ReportReason, ReportStatus, ReportTarget, UserStatus } from './types'

export type AdminOutletContext = { refreshCounts: () => void }

export function useAdminContext(): AdminOutletContext {
  return useOutletContext<AdminOutletContext>()
}

export function useAdminTitle(page: string) {
  useEffect(() => {
    document.title = `${page} · 운영 콘솔`
  }, [page])
}

export const ADMIN_USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: '활성',
  blocked: '차단',
  deleted: '탈퇴',
}

/** 차단 기간 선택지. 값은 `blockDays`(0이면 영구) */
export const BLOCK_DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1일' },
  { value: 3, label: '3일' },
  { value: 7, label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' },
  { value: 0, label: '영구' },
]

export function blockedUntilText(user: Pick<AdminUser, 'status' | 'blockedUntil'>): string | null {
  if (user.status !== 'blocked') return null
  return user.blockedUntil ? `~ ${formatShort(user.blockedUntil)}까지` : '영구'
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  abuse: '욕설·비방',
  obscene: '음란',
  spam: '광고·도배',
  privacy: '개인정보 노출',
  etc: '기타',
}

export const REPORT_REASONS = Object.keys(REPORT_REASON_LABELS) as ReportReason[]

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '처리 대기',
  resolved: '처리 완료',
  rejected: '기각',
}

export const REPORT_TARGET_LABELS: Record<ReportTarget, string> = {
  post: '글',
  comment: '댓글',
  chat: '응원방',
}

export const LOG_ACTION_GROUPS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'user.', label: '회원' },
  { value: 'post.', label: '글' },
  { value: 'comment.', label: '댓글' },
  { value: 'match.', label: '경기' },
  { value: 'league.', label: '리그' },
  { value: 'report.', label: '신고' },
  { value: 'settings.', label: '설정' },
  { value: 'word.', label: '금칙어' },
  { value: 'inquiry.', label: '문의' },
  { value: 'message.', label: '쪽지' },
]

const LOG_TARGET_LABELS: Record<string, string> = {
  user: '회원',
  post: '글',
  comment: '댓글',
  match: '경기',
  league: '리그',
  report: '신고',
  settings: '설정',
  word: '금칙어',
  inquiry: '문의',
  message: '쪽지',
}

const LOG_ACTION_LABELS: Record<string, string> = {
  'user.block': '회원 차단',
  'user.unblock': '차단 해제',
  'user.role': '권한 변경',
  'user.update': '회원 정보 변경',
  'user.reset_password': '비밀번호 초기화',
  'user.resetPassword': '비밀번호 초기화',
  'user.password_reset': '비밀번호 초기화',
  'post.hide': '글 숨김',
  'post.show': '글 노출',
  'post.approve': '글 승인',
  'post.status': '글 상태 변경',
  'post.update': '글 변경',
  'post.delete': '글 삭제',
  'post.best_exclude': '인기글 제외',
  'post.best_include': '인기글 포함',
  'post.best': '인기글 설정 변경',
  'comment.hide': '댓글 숨김',
  'comment.show': '댓글 노출',
  'comment.approve': '댓글 승인',
  'comment.status': '댓글 상태 변경',
  'comment.delete': '댓글 삭제',
  'match.create': '경기 등록',
  'match.update': '경기 수정',
  'match.delete': '경기 삭제',
  'league.create': '리그 등록',
  'league.update': '리그 수정',
  'league.delete': '리그 삭제',
  'report.resolve': '신고 처리',
  'report.hide': '신고 처리(숨김)',
  'report.delete': '신고 처리(삭제)',
  'report.dismiss': '신고 기각',
  'settings.update': '설정 변경',
  'word.create': '금칙어 추가',
  'word.add': '금칙어 추가',
  'word.delete': '금칙어 삭제',
  'inquiry.answer': '문의 답변',
  'message.send': '쪽지 발송',
}

export function logActionLabel(action: string): string {
  return LOG_ACTION_LABELS[action] ?? action
}

export function logTargetLabel(targetType: string): string {
  return LOG_TARGET_LABELS[targetType] ?? targetType
}

export const TAG_MAX_COUNT = 20
export const TAG_MAX_LENGTH = 20
