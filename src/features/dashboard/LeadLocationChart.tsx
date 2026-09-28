'use client'

import { useMemo, useState } from 'react'
import { LeadSourceChart } from './LeadSourceChart'

export interface LeadLocationBreakdowns {
  month: { name: string; value: number }[]
  quarter: { name: string; value: number }[]
  year: { name: string; value: number }[]
}

const PERIODS = [
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
] as const

export function LeadLocationChart({ breakdowns, title = 'Leads by Location', emptyMessage = 'No inquiry location data for this period.' }: { breakdowns: LeadLocationBreakdowns; title?: string; emptyMessage?: string }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('month')
  const data = breakdowns[period]
  const totalLeads = useMemo(() => data.reduce((total, item) => total + item.value, 0), [data])

  return (
    <div className="h-full">
      <div className="mb-2 flex flex-wrap gap-1" aria-label="Location report period">
        {PERIODS.map(item => <button key={item.key} type="button" onClick={() => setPeriod(item.key)} aria-pressed={period === item.key} className={`rounded px-2 py-1 text-[11px] font-semibold transition ${period === item.key ? 'bg-[#1B2A6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-[#1B2A6B]'}`}>{item.label}</button>)}
      </div>
      <div className="h-[calc(100%-32px)]">
        <LeadSourceChart data={data} totalLeads={totalLeads} title={title} emptyMessage={emptyMessage} />
      </div>
    </div>
  )
}
