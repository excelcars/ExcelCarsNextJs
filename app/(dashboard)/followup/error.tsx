'use client'

export default function FollowupError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <h1 className="text-lg font-semibold text-red-800">Unable to load follow-ups</h1>
      <p className="mt-2 text-sm text-red-700">Something went wrong displaying this page. Please retry. If it still fails, reload the page.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-[#1B2A6B] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Retry
        </button>
        <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Reload page
        </button>
      </div>
    </div>
  )
}
