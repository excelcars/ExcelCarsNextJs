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

  const barSize = data.length > 5 ? 13 : 16

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-sm">
        <span className="font-semibold text-gray-700">{title}</span>
        <span className="text-gray-500">Total leads: <strong className="text-gray-800">{totalLeads.toLocaleString('en-IN')}</strong></span>
      </div>
      <div className="w-full min-w-0" style={{ height: Math.max(180, data.length * 28 + 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 6, right: 8, bottom: 6, left: 0 }} barCategoryGap="14%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={118} interval={0} minTickGap={0} tick={{ fontSize: 13, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip wrapperStyle={{ pointerEvents: 'none' }} contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #E5E7EB' }} />
            <Bar dataKey="value" fill={N} radius={[0, 3, 3, 0]} barSize={barSize} isAnimationActive={false} cursor={onSelectSource ? 'pointer' : 'default'} onClick={(_, index: number) => {
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
