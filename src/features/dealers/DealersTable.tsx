import { Mail, Pencil, Phone, Trash2 } from 'lucide-react'
import { LoadingOverlay, Table } from '@/components/ui'
import type { DealerRow } from './types'

export function DealersTable({ rows, loading, onEdit, onDelete }: {
  rows: DealerRow[]; loading: boolean; onEdit: (row: DealerRow) => void; onDelete: (dealerId: number) => void
}) {
  return <div className="relative min-w-0" aria-busy={loading}>
    <LoadingOverlay show={loading} label="Loading dealers..." subtle />
    <div className="space-y-3 lg:hidden">
      {rows.length === 0 ? <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">No dealers found.</div> : rows.map(row => (
        <article key={row.dealerId} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm [overflow-wrap:anywhere]">
          <h2 className="text-base font-bold text-gray-900">{row.dealerName ?? '—'}</h2>
          {row.dealerCompanyName ? <p className="mt-1 text-sm text-gray-600">{row.dealerCompanyName}</p> : null}
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-xs text-gray-500">Primary mobile</dt><dd>{row.dealerMobileNo ? <a href={`tel:${row.dealerMobileNo}`} className="inline-flex min-h-11 items-center gap-2 text-blue-700"><Phone aria-hidden="true" className="h-4 w-4 shrink-0" />{row.dealerMobileNo}</a> : '—'}</dd></div>
            {row.dealerMobileNo_2 ? <div><dt className="text-xs text-gray-500">Mobile 2</dt><dd><a href={`tel:${row.dealerMobileNo_2}`} className="inline-flex min-h-11 items-center gap-2 text-blue-700"><Phone aria-hidden="true" className="h-4 w-4 shrink-0" />{row.dealerMobileNo_2}</a></dd></div> : null}
            {row.dealerEmail ? <div><dt className="text-xs text-gray-500">Email</dt><dd><a href={`mailto:${row.dealerEmail}`} className="inline-flex min-h-11 items-center gap-2 text-blue-700"><Mail aria-hidden="true" className="h-4 w-4 shrink-0" />{row.dealerEmail}</a></dd></div> : null}
            <div><dt className="text-xs text-gray-500">Address</dt><dd className="mt-1 whitespace-pre-wrap text-gray-700">{row.dealerAddress ?? '—'}</dd></div>
            {row.dealerWebsite ? <div><dt className="text-xs text-gray-500">Website</dt><dd className="mt-1 text-gray-700">{row.dealerWebsite}</dd></div> : null}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
            <button type="button" aria-label={`Edit ${row.dealerName ?? 'dealer'}`} onClick={() => onEdit(row)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 text-sm font-medium text-blue-700 hover:bg-blue-50"><Pencil aria-hidden="true" className="h-4 w-4" />Edit</button>
            <button type="button" aria-label={`Delete ${row.dealerName ?? 'dealer'}`} onClick={() => onDelete(row.dealerId)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 aria-hidden="true" className="h-4 w-4" />Delete</button>
          </div>
        </article>
      ))}
    </div>
    <div className="hidden lg:block">
    <Table headers={['Dealer', 'Contact', 'Address', 'Actions']} minWidthClass="min-w-[760px]" empty={rows.length === 0}>
      {rows.map(row => <tr key={row.dealerId} className="transition hover:bg-gray-50">
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900">{row.dealerName ?? '—'}</div>
          {row.dealerCompanyName && <div className="mt-1 text-sm text-gray-600">{row.dealerCompanyName}</div>}
          {row.dealerWebsite && <div className="mt-0.5 max-w-56 truncate text-sm text-gray-500" title={row.dealerWebsite}>{row.dealerWebsite}</div>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-sm text-gray-700"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />{row.dealerMobileNo ?? '—'}</div>
          {row.dealerMobileNo_2 && <div className="mt-0.5 flex items-center gap-2 font-mono text-sm text-gray-500"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />{row.dealerMobileNo_2}</div>}
          {row.dealerEmail && <div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-gray-500" title={row.dealerEmail}><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{row.dealerEmail}</span></div>}
        </td>
        <td className="max-w-64 px-4 py-3 text-sm text-gray-600"><div className="truncate" title={row.dealerAddress ?? undefined}>{row.dealerAddress ?? '—'}</div></td>
        <td className="px-4 py-3"><div className="flex items-center gap-1">
          <button type="button" aria-label={`Edit ${row.dealerName ?? 'dealer'}`} onClick={() => onEdit(row)} className="rounded p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-[#1B2A6B]"><Pencil className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label={`Delete ${row.dealerName ?? 'dealer'}`} onClick={() => onDelete(row.dealerId)} className="rounded p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
        </div></td>
      </tr>)}
    </Table>
    </div>
  </div>
}
