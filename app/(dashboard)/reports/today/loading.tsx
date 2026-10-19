import { Loader2 } from 'lucide-react'

export default function TodayReportLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center" role="status" aria-live="polite">
      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-[#1B2A6B]" />
        Loading today activity report...
      </div>
    </div>
  )
}
