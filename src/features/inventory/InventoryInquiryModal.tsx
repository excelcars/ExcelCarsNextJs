import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge, Btn, Input, Modal } from '@/components/ui'
import { formatListDate } from '@/lib/listFormatters'
import type { InquiryOption, InventoryRow } from './inventoryTypes'

interface Props {
  row: InventoryRow | null
  query: string
  matches: InquiryOption[]
  selected: InquiryOption | null
  loading: boolean
  error: string
  syncing: boolean
  pendingRefresh: boolean
  vehicleLabel: (row: InventoryRow | InquiryOption['inquiryCarDetails'][number]) => string
  onClose: () => void
  onQueryChange: (value: string) => void
  onSelect: (inquiry: InquiryOption) => void
  onOpenInquiry: (id: number) => void
  onSync: () => void
}

export function InventoryInquiryModal({ row, query, matches, selected, loading, error, syncing, vehicleLabel, onClose, onQueryChange, onSelect, onOpenInquiry, onSync }: Props) {
  const [openingInquiryId, setOpeningInquiryId] = useState<number | null>(null)

  return <Modal title={`Update Inquiry${row ? ` — ${row.registrationNo ?? row.inventoryNumber ?? ''}` : ''}`} open={!!row} onClose={onClose} width="max-w-4xl">
    {row ? <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        <div><span className="font-medium text-gray-800">Vehicle:</span> {vehicleLabel(row)}</div>
        <div><span className="font-medium text-gray-800">Inventory Status:</span> {row.status ?? '—'}</div>
        <div><span className="font-medium text-gray-800">What this will do:</span> update the selected inquiry with this vehicle and move the lead to {row.status === 'Sold' ? 'Closed / Sold Car' : 'FollowUp / Booked Vehicle'}.</div>
        <div><span className="font-medium text-gray-800">No inquiry exists?</span> You can skip this step and keep the inventory save as-is.</div>
      </div>
      <Input label="Find Inquiry" value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search by inquiry no, customer, mobile, or email..." />
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="rounded-lg border border-gray-200">{loading ? <div className="px-4 py-6 text-sm text-gray-400">Loading inquiries...</div> : matches.length === 0 ? <div className="px-4 py-6 text-sm text-gray-400">No inquiries found.</div> : <div className="divide-y divide-gray-100">{matches.map(inquiry => { const car = inquiry.inquiryCarDetails[0]; const isSelected = selected?.inquiryId === inquiry.inquiryId; return <div key={inquiry.inquiryId} role="button" tabIndex={0} onClick={() => onSelect(inquiry)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onSelect(inquiry) }} className={`w-full cursor-pointer px-4 py-3 text-left transition ${isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>
        <div className="flex items-start justify-between gap-4"><div><div className="text-sm font-medium text-gray-900">{inquiry.customer?.custName ?? inquiry.customerNameLegacy ?? 'Unnamed Inquiry'}<span className="ml-2 font-mono text-xs text-gray-500">{inquiry.inquiryNo ?? `Inquiry #${inquiry.inquiryId}`}</span></div><div className="mt-0.5 text-xs text-gray-500">Inquiry Date: {formatListDate(inquiry.dateOfInquiry) || '—'} · {inquiry.mobileno ?? '—'} {inquiry.email ? `· ${inquiry.email}` : ''}</div><div className="mt-1 text-xs text-gray-600">Interested Car: {car ? vehicleLabel(car) : '—'}{car?.year ? ` · ${car.year}` : ''}</div></div><div className="flex items-center gap-2">{inquiry.classification ? <Badge label={inquiry.classification} /> : null}{inquiry.status ? <Badge label={inquiry.status} /> : null}<button type="button" disabled={openingInquiryId !== null} className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-[#1B2A6B] hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70" onClick={event => { event.stopPropagation(); setOpeningInquiryId(inquiry.inquiryId); onOpenInquiry(inquiry.inquiryId) }}>{openingInquiryId === inquiry.inquiryId ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Opening...</> : 'Open Inquiry'}</button></div></div>
      </div> })}</div>}</div>
      <div className="flex justify-end gap-3"><Btn variant="outline" onClick={onClose}>Skip for now</Btn><Btn onClick={onSync} disabled={syncing || !selected}>{syncing ? 'Updating...' : 'Update Inquiry'}</Btn></div>
    </div> : null}
  </Modal>
}
