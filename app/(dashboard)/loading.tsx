export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="h-8 w-56 animate-pulse rounded bg-gray-200" />

      <div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-white" />

      <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-white" />

      <span className="sr-only">Loading page content...</span>
    </div>
  )
}
