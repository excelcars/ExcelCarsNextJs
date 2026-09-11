import { Pencil, Trash2 } from 'lucide-react'
import { LoadingOverlay, Table } from '@/components/ui'
import type { DealerRow } from './types'

export function DealersTable({ rows, loading, onEdit, onDelete }: {
  rows: DealerRow[]; loading: boolean; onEdit: (row: DealerRow) => void; onDelete: (dealerId: number) => void
}) {
  return <div className="relative" aria-busy={loading}>
    <LoadingOverlay show={loading} label="Loading dealers..." subtle />
    <Table headers={['Dealer', 'Contact', 'Address', 'Actions']} minWidthClass="min-w-[760px]" empty={rows.length === 0}>
      {rows.map(row => <tr key={row.dealerId} className="transition hover:bg-gray-50">
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900">{row.dealerName ?? '—'}</div>
          {row.dealerCompanyName && <div className="mt-1 text-sm text-gray-600">{row.dealerCompanyName}</div>}
          {row.dealerWebsite && <div className="mt-0.5 max-w-56 truncate text-xs text-gray-500" title={row.dealerWebsite}>{row.dealerWebsite}</div>}
        </td>
        <td className="px-4 py-3">
          <div className="font-mono text-sm text-gray-700">{row.dealerMobileNo ?? '—'}</div>
          {row.dealerMobileNo_2 && <div className="mt-0.5 font-mono text-xs text-gray-500">{row.dealerMobileNo_2}</div>}
          {row.dealerEmail && <div className="mt-0.5 max-w-56 truncate text-xs text-gray-500" title={row.dealerEmail}>{row.dealerEmail}</div>}
        </td>
        <td className="max-w-64 px-4 py-3 text-sm text-gray-600"><div className="truncate" title={row.dealerAddress ?? undefined}>{row.dealerAddress ?? '—'}</div></td>
        <td className="px-4 py-3"><div className="flex items-center gap-1">
          <button type="button" aria-label={`Edit ${row.dealerName ?? 'dealer'}`} onClick={() => onEdit(row)} className="rounded p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-[#1B2A6B]"><Pencil className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label={`Delete ${row.dealerName ?? 'dealer'}`} onClick={() => onDelete(row.dealerId)} className="rounded p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
        </div></td>
      </tr>)}
    </Table>
  </div>
}
