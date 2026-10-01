'use client'

export default function ExceptionReportError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <h1 className="text-lg font-semibold text-red-800">Unable to load the exception log</h1>
      <p className="mt-2 text-sm text-red-700">Please try again. If the problem continues, contact your system administrator.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-5 rounded-lg bg-[#1B2A6B] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  )
}
