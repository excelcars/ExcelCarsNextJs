'use client'

export function ChecklistYesNoToggle({ label, value, onChange }: { label?: string; value: string; onChange: (value: 'Yes' | 'No') => void }) {
  return <div>
    {label && <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>}
    <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white" role="group" aria-label={label ?? 'Yes or No'}>
      {(['Yes', 'No'] as const).map(option => {
        const selected = value === option
        return <button key={option} type="button" aria-pressed={selected} onClick={() => onChange(option)}
          className={`min-w-10 px-2.5 py-2 text-sm font-medium transition ${selected ? 'bg-[#1B2A6B] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} ${option === 'Yes' ? 'border-r border-gray-200' : ''}`}>
          {option}
        </button>
      })}
    </div>
  </div>
}
