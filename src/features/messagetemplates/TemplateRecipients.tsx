import { X } from 'lucide-react'
import { Input, Select } from '@/components/ui'
import type { RecipientGroup, RecipientOption } from './recipients'

export function TemplateRecipients({ groups, group, query, rows, selected, searching, error, onGroupChange, onQueryChange, onToggle }: {
  groups: readonly RecipientGroup[]; group: RecipientGroup; query: string; rows: RecipientOption[]; selected: RecipientOption[]; searching: boolean; error: string
  onGroupChange: (value: RecipientGroup) => void; onQueryChange: (value: string) => void; onToggle: (recipient: RecipientOption) => void
}) {
  return <div className="min-w-0 space-y-3 rounded-lg border border-gray-200 p-3">
    <div><h3 className="text-sm font-medium text-gray-800">Choose recipients</h3><p className="mt-0.5 text-xs text-gray-500">Search a group, then select one or more people with email addresses.</p></div>
    <div className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] [&>div]:min-w-0 [&_input]:min-w-0 [&_input]:min-h-11 [&_select]:min-h-11">
      <Select aria-label="Recipient group" label="Group" value={group} onChange={event => onGroupChange(event.target.value as RecipientGroup)}>{groups.map(name => <option key={name} value={name}>{name}</option>)}</Select>
      <Input aria-label="Search recipients" label="Search" value={query} onChange={event => onQueryChange(event.target.value)} placeholder={searching ? 'Searching...' : 'Name, mobile, or email'} />
    </div>
    {error && <p className="break-words text-xs text-amber-700">{error}</p>}
    {rows.length > 0 && <div className="max-h-40 min-w-0 divide-y divide-gray-100 overflow-y-auto rounded border border-gray-100">{rows.map(recipient => <label key={`${recipient.group}:${recipient.id}`} className="flex min-h-11 min-w-0 cursor-pointer gap-2 px-3 py-2 text-sm hover:bg-gray-50">
      <input type="checkbox" checked={selected.some(item => item.group === recipient.group && item.id === recipient.id)} onChange={() => onToggle(recipient)} className="mt-0.5 h-5 w-5 shrink-0" />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]"><span className="font-medium text-gray-800">{recipient.name}</span><span className="block text-xs text-gray-500">{recipient.email}{recipient.mobile ? ` · ${recipient.mobile}` : ''}</span></span>
    </label>)}</div>}
    {selected.length > 0 && <div className="flex min-w-0 flex-wrap gap-1.5">{selected.map(recipient => <span key={`${recipient.group}:${recipient.id}`} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs text-[#1B2A6B]">
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{recipient.name}</span><button type="button" aria-label={`Remove ${recipient.name}`} onClick={() => onToggle(recipient)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded hover:bg-blue-100"><X className="h-4 w-4" /></button>
    </span>)}</div>}
  </div>
}
