'use client'

import { Btn, Modal } from '@/components/ui'
import { formatCustomerDate, type CustomerRow } from './types'

function ViewField({ label, value }: { label: string; value: string | null | undefined }) {
  return <div><div className="text-xs font-medium text-gray-500">{label}</div><div className="mt-1 break-words text-sm text-gray-800">{value?.trim() || '—'}</div></div>
}

export function CustomerViewModal({ row, onClose }: { row: CustomerRow | null; onClose: () => void }) {
  return (
    <Modal title={`View Customer${row ? ` — ${row.custName}` : ''}`} open={!!row} onClose={onClose} width="max-w-3xl">
      {row && <div className="space-y-5">
        <section className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer Summary</div><div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3"><ViewField label="Name" value={row.custName} /><ViewField label="Type" value={row.type} /><ViewField label="Company Name" value={row.companyName} /></div></section>
        <section className="rounded-lg border border-gray-200 bg-white px-4 py-4"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact Details</div><div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3"><ViewField label="Mobile" value={row.custMobile} /><ViewField label="Mobile 2" value={row.mobile_2} /><ViewField label="Email" value={row.custEmail} /></div></section>
        <section className="rounded-lg border border-gray-200 bg-white px-4 py-4"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Additional Details</div><div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3"><ViewField label="Date of Birth" value={formatCustomerDate(row.custDob)} /><ViewField label="Anniversary Date" value={formatCustomerDate(row.custAnniversaryDt)} /><ViewField label="Address" value={row.custAddress} /><ViewField label="Comments" value={row.comments} /></div></section>
        <div className="flex justify-end"><Btn variant="outline" onClick={onClose}>Close</Btn></div>
      </div>}
    </Modal>
  )
}
