export default function DashboardLoading() {
  return (
    <div className="flex min-h-full w-full flex-col gap-6" role="status" aria-label="Loading page">
      <div className="flex min-h-[calc(100vh-7rem)] flex-1 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white">
        <span className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-[#C8102E]" />
        <p className="mt-4 text-sm font-medium text-gray-600">Loading page...</p>
        <span className="sr-only">Loading page content...</span>
      </div>
    </div>
  )
}
