'use client'

export function ChecklistYesNoToggle({ label, value, onChange }: { label?: string; value: string; onChange: (value: 'Yes' | 'No') => void }) {
  const isYes = value === 'Yes'
  return <div>
    {label && <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>}
    <button type="button" role="switch" aria-checked={isYes} aria-label={label ?? 'Yes or No'} onClick={() => onChange(isYes ? 'No' : 'Yes')}
      className={`inline-flex h-9 min-w-16 items-center gap-1.5 rounded-md border px-2 text-sm font-medium transition ${isYes ? 'border-[#1B2A6B] bg-blue-50 text-[#1B2A6B]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
      <span className={`flex h-4 w-7 items-center rounded-full p-0.5 transition ${isYes ? 'justify-end bg-[#1B2A6B]' : 'justify-start bg-gray-300'}`}><span className="h-3 w-3 rounded-full bg-white shadow" /></span>
      {isYes ? 'Yes' : 'No'}
    </button>
  </div>
}
