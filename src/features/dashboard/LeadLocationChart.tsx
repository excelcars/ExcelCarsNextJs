'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { N } from '@/components/ui'

export interface LeadLocationBreakdowns {
  month: { name: string; value: number }[]
  quarter: { name: string; value: number }[]
  year: { name: string; value: number }[]
  // Includes leads without a controlled location, which cannot be plotted by region.
  totalLeads?: { month: number; quarter: number; year: number }
}

export interface LeadRegionBreakdowns {
  all: LeadLocationBreakdowns
  bySource: Record<string, LeadLocationBreakdowns>
}

const PERIODS = [
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
] as const

export function LeadLocationChart({ breakdowns, selectedSourceName, selectedSourceCode, onClearSource, title = 'Leads by Location', emptyMessage = 'No inquiry location data for this period.' }: { breakdowns: LeadLocationBreakdowns; selectedSourceName?: string | null; selectedSourceCode?: string | null; onClearSource?: () => void; title?: string; emptyMessage?: string }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('month')
  const router = useRouter()
  const data = breakdowns[period]
  const regionalLeadTotal = useMemo(() => data.reduce((total, item) => total + item.value, 0), [data])
  const totalLeads = breakdowns.totalLeads?.[period] ?? regionalLeadTotal
  const periodLabel = period === 'month' ? 'This month' : 'This quarter'

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-0.5 text-sm">
        <span className="font-semibold text-gray-700">{title}</span>
        <div className="flex flex-wrap items-center gap-1" aria-label="Location report period">
          {PERIODS.map(item => <button key={item.key} type="button" onClick={() => setPeriod(item.key)} aria-pressed={period === item.key} className={`min-h-11 rounded px-3 py-1 text-xs font-semibold transition ${period === item.key ? 'bg-[#1B2A6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-[#1B2A6B]'}`}>{item.label}</button>)}
          {selectedSourceName ? <button type="button" onClick={onClearSource} className="min-h-11 max-w-full break-words rounded px-3 py-1 text-xs font-semibold text-[#1B2A6B] hover:bg-blue-50" title="Show every lead source">{selectedSourceName} ×</button> : null}
        </div>
      </div>
      <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600" aria-live="polite">
        <div className="font-semibold text-[#1B2A6B]">{selectedSourceName || 'All sources'} · {periodLabel}</div>
        <div className="mt-1">Leads in this period: <strong className="text-slate-800">{totalLeads.toLocaleString('en-IN')}</strong></div>
        <div className="mt-1">With a recorded region: {regionalLeadTotal.toLocaleString('en-IN')}{totalLeads > regionalLeadTotal ? ` · Region not recorded: ${(totalLeads - regionalLeadTotal).toLocaleString('en-IN')}` : ''}</div>
      </div>
      {data.length === 0 ? <p className="min-h-[180px] py-8 text-center text-sm text-gray-400">{emptyMessage}</p> : <div className="w-full min-w-0" style={{ height: Math.max(180, data.length * 28 + 36) }}>
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={118} interval={0} tick={{ fontSize: 13, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip wrapperStyle={{ pointerEvents: 'none' }} contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #E5E7EB' }} />
              <Bar dataKey="value" fill={N} radius={[0, 3, 3, 0]} barSize={16} isAnimationActive={false} cursor="pointer" onClick={(_, index: number) => {
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
