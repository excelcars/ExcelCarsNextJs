import { Textarea } from '@/components/ui'

export function LogFollowupRemark({
  lastRemark,
  value,
  error,
  onChange,
}: {
  lastRemark: string | null | undefined
  value: string
  error: boolean | undefined
  onChange: (value: string) => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded border border-[#1B2A6B]/20 bg-blue-50 text-xs font-semibold text-[#1B2A6B]">2</div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-gray-900">What was said?</div>
          <div className="text-sm text-gray-500">Write the practical note the next person needs.</div>
          {lastRemark?.trim() ? <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"><span className="font-medium text-gray-900">Last remark:</span> {lastRemark}</div> : null}
          <div className="mt-4">
            <Textarea label="Remark *" value={value} onChange={event => onChange(event.target.value)} placeholder="Asking price, condition, kms, whether they spoke to anyone else, next expectation..." error={error} className="min-h-[120px]" />
            <div className="mt-1 text-xs text-gray-500">This is the main human note. Everything else is structured status.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
