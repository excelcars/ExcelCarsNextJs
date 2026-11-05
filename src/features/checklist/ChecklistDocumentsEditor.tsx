'use client'

import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui'
import { ChecklistYesNoToggle } from './ChecklistYesNoToggle'
import { ChecklistDocumentTypeToggle } from './ChecklistDocumentTypeToggle'
import type { DocRow } from './actions'

export function ChecklistDocumentsEditor({ docs, suggestions, onChange, onRemove }: {
  docs: DocRow[]
  suggestions: readonly string[]
  onChange: (index: number, changes: Partial<DocRow>) => void
  onRemove: (index: number) => void
}) {
  return <div className="min-w-0 space-y-3">
    {docs.map((doc, index) => <fieldset key={index} className="grid min-w-0 grid-cols-2 items-end gap-3 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_44px]">
      <legend className="sr-only">Document {index + 1}</legend>
      <div className="col-span-2 min-w-0 md:col-span-1 [&_input]:min-h-11 [&_input]:min-w-0 [&_input]:w-full">
        <Input label={`Document ${index + 1}`} aria-label={`Document ${index + 1} name`} list="doc-name-suggestions" value={doc.documentName} onChange={event => onChange(index, { documentName: event.target.value })} />
      </div>
      <ChecklistYesNoToggle label="Applicable" ariaLabel={`Document ${index + 1} applicable`} value={doc.applicable} onChange={value => onChange(index, { applicable: value })} />
      <ChecklistYesNoToggle label="Received" ariaLabel={`Document ${index + 1} received`} value={doc.received} onChange={value => onChange(index, { received: value })} />
      <div className="col-span-2 flex min-w-0 flex-wrap items-end justify-between gap-2 md:contents">
        <ChecklistDocumentTypeToggle label="Document type" ariaLabel={`Document ${index + 1} type`} value={doc.originalCopy} onChange={value => onChange(index, { originalCopy: value })} />
        <button type="button" aria-label={`Remove document ${index + 1}`} onClick={() => onRemove(index)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600" title="Remove document"><Trash2 className="h-4 w-4" /></button>
      </div>
    </fieldset>)}
    <datalist id="doc-name-suggestions">{suggestions.map(name => <option key={name} value={name} />)}</datalist>
  </div>
}
