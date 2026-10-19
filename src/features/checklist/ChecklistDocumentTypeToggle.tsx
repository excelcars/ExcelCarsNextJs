'use client'

export function ChecklistDocumentTypeToggle({ label, value, onChange }: { label?: string; value: string; onChange: (value: 'Original' | 'Copy') => void }) {
  return <div>
    {label && <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>}
    <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white" role="group" aria-label={label ?? 'Original or Copy'}>
      <button type="button" aria-pressed={value === 'Original'} onClick={() => onChange('Original')}
        className={`px-2.5 py-2 text-sm font-medium transition ${value === 'Original' ? 'bg-[#1B2A6B] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} border-r border-gray-200`}>
        Original
      </button>
      <button type="button" aria-pressed={value === 'Copy'} onClick={() => onChange('Copy')}
        className={`px-2.5 py-2 text-sm font-medium transition ${value === 'Copy' ? 'bg-slate-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
        Copy
      </button>
    </div>
  </div>
}
