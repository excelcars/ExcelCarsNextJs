'use client'

export interface LeadSourceBreakdown {
  name: string
  sourceCode?: string
  value: number
}

export function LeadSourceChart({ data, totalLeads, selectedSourceCode, onSelectSource, title = 'Leads by Source', emptyMessage = 'No inquiry source data yet.' }: { data: LeadSourceBreakdown[]; totalLeads: number; selectedSourceCode?: string | null; onSelectSource?: (source: LeadSourceBreakdown) => void; title?: string; emptyMessage?: string }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p>
  }

  const largestValue = Math.max(1, ...data.map(source => source.value))
  const selectedSource = data.find(source => source.sourceCode && source.sourceCode === selectedSourceCode)

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-sm">
        <span className="font-semibold text-gray-700">{title}</span>
        <span className="text-gray-500">All-time leads: <strong className="text-gray-800">{totalLeads.toLocaleString('en-IN')}</strong></span>
      </div>
      <p className="mb-3 px-1 text-xs text-slate-500">Select a source to filter regions. Select it again to show all sources.</p>
      <div className="grid w-full min-w-0 gap-1" aria-label="Lead source counts">
        {data.map(source => {
          const selected = Boolean(source.sourceCode && selectedSourceCode === source.sourceCode)
          const content = <><span className="min-w-0 break-words text-left text-xs font-medium text-slate-600">{source.name}</span><span className="h-3.5 min-w-0 overflow-hidden rounded bg-slate-100" aria-hidden="true"><span className={`block h-full rounded transition-[width] ${selected ? 'bg-[#d7194a]' : 'bg-[#1B2A6B]'}`} style={{ width: `${source.value / largestValue * 100}%` }} /></span><strong className="text-right text-xs tabular-nums text-slate-800">{source.value.toLocaleString('en-IN')}</strong></>
          const className = `grid min-h-11 min-w-0 grid-cols-[84px_minmax(0,1fr)_56px] items-center gap-2 rounded-lg px-2 sm:grid-cols-[96px_minmax(0,1fr)_64px] ${selected ? 'bg-rose-50 ring-1 ring-rose-200' : ''}`
          return source.sourceCode && onSelectSource
            ? <button key={source.sourceCode} type="button" aria-pressed={selected} aria-label={`${source.name}: ${source.value.toLocaleString('en-IN')} leads. Filter regions.`} onClick={() => onSelectSource(source)} className={`${className} cursor-pointer hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>{content}</button>
            : <div key={source.sourceCode ?? source.name} className={className}>{content}</div>
        })}
      </div>
      <div role="status" className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
        {selectedSource ? <><strong className="text-[#1B2A6B]">{selectedSource.name}: {selectedSource.value.toLocaleString('en-IN')} all-time leads</strong><span className="block">Region breakdown is filtered to {selectedSource.name}.</span></> : 'Region breakdown includes all sources.'}
      </div>
    </div>
  )
}
