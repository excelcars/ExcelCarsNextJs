export interface ContactOutcomeOption {
  key: string
  value: string
  title: string
  hint: string
}

export function LogFollowupContactOutcome({
  options,
  selectedValue,
  onSelect,
}: {
  options: readonly ContactOutcomeOption[]
  selectedValue: string
  onSelect: (option: ContactOutcomeOption) => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded border border-[#1B2A6B]/20 bg-blue-50 text-xs font-semibold text-[#1B2A6B]">1</div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-gray-900">Did you reach them?</div>
          <div className="text-sm text-gray-500">This can prefill the follow-up outcome.</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {options.map(option => (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelect(option)}
                className={`rounded-xl border px-4 py-3 text-left transition ${selectedValue === option.value ? 'border-[#1B2A6B] bg-blue-50' : 'border-gray-200 bg-white hover:border-[#1B2A6B]/35 hover:bg-gray-50'}`}
              >
                <div className="text-sm font-semibold text-gray-900">{option.title}</div>
                <div className="mt-1 text-xs text-gray-500">{option.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
