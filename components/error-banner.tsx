export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-md border border-red-300/30 px-2 py-1 text-xs font-medium hover:bg-red-400/10"
      >
        Retry
      </button>
    </div>
  )
}
