'use client'

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { N } from '@/components/ui'

export interface LeadSourceBreakdown {
  name: string
  sourceCode?: string
  value: number
}

export function LeadSourceChart({ data, totalLeads, selectedSourceCode, onSelectSource, title = 'Leads by Source', emptyMessage = 'No inquiry source data yet.' }: { data: LeadSourceBreakdown[]; totalLeads: number; selectedSourceCode?: string | null; onSelectSource?: (source: LeadSourceBreakdown) => void; title?: string; emptyMessage?: string }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p>
  }

  return (
    <div className="h-full">
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
            <Bar dataKey="value" fill={N} radius={[0, 3, 3, 0]} barSize={16} cursor={onSelectSource ? 'pointer' : 'default'} onClick={(_, index: number) => {
              const source = data[index]
              if (source?.sourceCode) onSelectSource?.(source)
            }}>
              {data.map(source => <Cell key={source.name} fill={selectedSourceCode === source.sourceCode ? '#d7194a' : N} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
