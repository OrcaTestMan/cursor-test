import { Link, useLocation } from 'react-router'
import { CenteredMessage } from '../components/ui'
import { btnPrimary } from '../lib/styles'

export default function NotFoundPage() {
  const admin = useLocation().pathname.startsWith('/admin')
  return (
    <CenteredMessage
      title="페이지를 찾을 수 없습니다."
      description="주소가 바뀌었거나 삭제된 페이지입니다."
      action={
        <Link to={admin ? '/admin' : '/'} className={btnPrimary}>
          {admin ? '운영 콘솔로' : '홈으로'}
        </Link>
      }
    />
  )
}
