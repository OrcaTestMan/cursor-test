export function Loading({ text = '불러오는 중...' }: { text?: string }) {
  return <p className="py-6 text-center text-sm text-gray-500">{text}</p>
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p className="whitespace-pre-line">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 underline">
          다시 시도
        </button>
      )}
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-gray-500">{text}</p>
}
