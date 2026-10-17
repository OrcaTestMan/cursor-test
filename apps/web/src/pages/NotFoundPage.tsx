import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-bold">없는 페이지입니다</h1>
      <p className="mt-2 text-sm text-gray-500">주소를 다시 확인해 주세요.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-blue-700 underline">
        홈으로 가기
      </Link>
    </div>
  )
}
