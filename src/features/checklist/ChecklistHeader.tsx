import { Download, Plus } from 'lucide-react'
import { Btn, Input, SearchBar } from '@/components/ui'

export function ChecklistHeader({ total, filtered, exporting, onExport, onAdd }: {
  total: number; filtered: boolean; exporting: boolean; onExport: (format: 'summary' | 'details') => void; onAdd: () => void
}) {
  return <header className="mb-5 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
    <div className="min-w-0"><h1 className="text-xl font-bold text-gray-900">Checklist / Documents</h1><p className="mt-0.5 text-sm text-gray-500">{total} vehicle checklists</p></div>
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap [&_button]:min-h-11 [&_button]:justify-center [&_button]:text-[14px] [&_svg]:shrink-0">
      <Btn variant="outline" size="sm" onClick={() => onExport('summary')} disabled={exporting || total === 0}><Download className="h-3.5 w-3.5" />{exporting ? 'Exporting...' : `${filtered ? 'Export Filtered' : 'Export Summary'} (${total})`}</Btn>
      <Btn variant="outline" size="sm" onClick={() => onExport('details')} disabled={exporting || total === 0}><Download className="h-3.5 w-3.5" />{exporting ? 'Exporting...' : 'Export Detail Rows'}</Btn>
      <Btn size="sm" className="col-span-2" onClick={onAdd}><Plus className="h-3.5 w-3.5" />Add Checklist</Btn>
    </div>
  </header>
}

export function ChecklistFilters({ total, search, registration, pending, onSearch, onRegistration }: {
  total: number; search: string; registration: string; pending: boolean; onSearch: (value: string) => void; onRegistration: (value: string) => void
}) {
  return <div className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center [&_input]:min-h-11 [&_input]:min-w-0 [&>div]:min-w-0">
    <SearchBar value={search} onChange={onSearch} placeholder="Search reg no, customer..." disabled={pending} />
    <Input aria-label="Exact registration number" value={registration} onChange={event => onRegistration(event.target.value)} placeholder="Exact registration no..." disabled={pending} />
    <span className="text-xs text-gray-500">{total} checklist records</span>
  </div>
}
