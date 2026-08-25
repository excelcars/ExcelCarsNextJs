'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { Badge, Btn, Table, PageHeader, SearchBar } from '@/components/ui'
import type { OutstandingRow } from './queries'

const TYPES = ['RTO', 'Insurance', 'Loan'] as const
const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function toCsv(rows: OutstandingRow[]): string {
  const headers = ['Type', 'Reg No', 'Customer', 'Payout Amount', 'Received', 'Balance']
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push([r.type, r.registrationNo, r.customerName, r.payoutAmount, r.amountReceived, r.balance]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  }
  return lines.join('\n')
}

function downloadCsv(rows: OutstandingRow[]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'outstanding-payments.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function OutstandingClient({ initialData }: { initialData: OutstandingRow[] }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return initialData.filter(r => {
      const matches = !q || (r.registrationNo ?? '').toLowerCase().includes(q) || (r.customerName ?? '').toLowerCase().includes(q)
      return matches && (filterType === 'All' || r.type === filterType)
    })
  }, [initialData, search, filterType])

  const total = useMemo(() => filtered.reduce((sum, r) => sum + r.balance, 0), [filtered])

  return (
    <div>
      <PageHeader
        title="Outstanding Payments"
        subtitle={`${filtered.length} records · RTO, Insurance & Loan referral payouts`}
        action={<Btn variant="outline" size="sm" onClick={() => downloadCsv(filtered)}><Download className="w-3.5 h-3.5" />Export</Btn>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Reg no, customer..." />
        <div className="flex flex-wrap gap-1.5">
          {['All', ...TYPES].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterType === t ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={filterType === t ? { backgroundColor: '#1B2A6B' } : {}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <Table headers={['Type', 'Reg No', 'Customer', 'Payout Amount', 'Received', 'Balance']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.key} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3"><Badge label={r.type} /></td>
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">
              {r.registrationNo ? (
                <Link
                  href={
                    r.type === 'RTO'
                      ? `/rto?registrationNo=${encodeURIComponent(r.registrationNo)}`
                      : r.type === 'Insurance'
                      ? `/insurance?search=${encodeURIComponent(r.registrationNo)}`
                      : `/loan?search=${encodeURIComponent(r.registrationNo)}`
                  }
                  className="hover:underline text-blue-800"
                >
                  {r.registrationNo}
                </Link>
              ) : (
                '—'
              )}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">{r.customerName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.payoutAmount)}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.amountReceived)}</td>
            <td className={`px-4 py-3 text-sm font-semibold ${r.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtMoney(r.balance)}</td>
          </tr>
        ))}
        {filtered.length > 0 && (
          <tr className="bg-gray-50 font-semibold">
            <td className="px-4 py-3" colSpan={5}>Total Outstanding</td>
            <td className={`px-4 py-3 ${total > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtMoney(total)}</td>
          </tr>
        )}
      </Table>
    </div>
  )
}
