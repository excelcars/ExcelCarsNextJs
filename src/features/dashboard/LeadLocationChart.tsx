'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { N } from '@/components/ui'

export interface LeadLocationBreakdowns {
  month: { name: string; value: number }[]
  quarter: { name: string; value: number }[]
  year: { name: string; value: number }[]
}

export interface LeadRegionBreakdowns {
  all: LeadLocationBreakdowns
  bySource: Record<string, LeadLocationBreakdowns>
}

const PERIODS = [
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
] as const

export function LeadLocationChart({ breakdowns, selectedSourceName, selectedSourceCode, onClearSource, title = 'Leads by Location', emptyMessage = 'No inquiry location data for this period.' }: { breakdowns: LeadLocationBreakdowns; selectedSourceName?: string | null; selectedSourceCode?: string | null; onClearSource?: () => void; title?: string; emptyMessage?: string }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('month')
  const router = useRouter()
  const data = breakdowns[period]
  const totalLeads = useMemo(() => data.reduce((total, item) => total + item.value, 0), [data])

  return (
    <div className="h-full">
      <div className="mb-2 flex flex-wrap items-center gap-1" aria-label="Location report period">
        {PERIODS.map(item => <button key={item.key} type="button" onClick={() => setPeriod(item.key)} aria-pressed={period === item.key} className={`rounded px-2 py-1 text-[11px] font-semibold transition ${period === item.key ? 'bg-[#1B2A6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-[#1B2A6B]'}`}>{item.label}</button>)}
        {selectedSourceName ? <button type="button" onClick={onClearSource} className="ml-1 rounded px-2 py-1 text-[11px] font-semibold text-[#1B2A6B] hover:bg-blue-50" title="Show every lead source">{selectedSourceName} ×</button> : null}
      </div>
      {data.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p> : <div className="h-[calc(100%-32px)]">
        <div className="flex items-center justify-between gap-3 px-1 text-xs">
          <span className="font-semibold text-gray-700">{title}</span>
          <span className="text-gray-500">Total leads: <strong className="text-gray-800">{totalLeads.toLocaleString('en-IN')}</strong></span>
        </div>
        <div className="h-[calc(100%-24px)]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} />
              <Bar dataKey="value" fill={N} radius={[0, 3, 3, 0]} barSize={16} cursor="pointer" onClick={(_, index: number) => {
                const region = data[index]?.name
                if (region) router.push(`/inquiry?region=${encodeURIComponent(region)}&regionPeriod=${period}${selectedSourceCode ? `&source=${encodeURIComponent(selectedSourceCode)}` : ''}&quickFilter=all`)
              }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}
    </div>
  )
}
