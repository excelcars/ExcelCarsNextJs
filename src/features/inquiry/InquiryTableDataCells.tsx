'use client'

import type { ReactNode } from 'react'
import { cleanListValue, formatListDate, formatListMoney } from '@/lib/listFormatters'
import { Badge } from '@/components/ui'

type Row = {
  inquiryId: number; inquiryNo?: string | null; dateOfInquiry: Date | string | null; website: string | null; sourceDetail: string | null; customerNameLegacy: string | null; mobileno: string | null; email: string | null; budgetOfCustomer: string | number | null; classification: string | null; visitedDateOfCustomer: Date | string | null; status: string | null; subStatus: string | null; followUpDate: Date | string | null; remark: string | null
  customer: { custName: string; custMobile: string | null; custEmail: string | null } | null
  assignedToUser?: { userName: string | null; displayName: string | null } | null
  inquiryCarDetails: Array<{ makeLegacy?: string | null; modelLegacy?: string | null; variantLegacy?: string | null; year: number | null; carVariantMaster: { variant: string | null; carMakeMaster: { make: string | null } | null; carModelMaster: { model: string | null } | null } | null }>
}

export function InquiryTableDataCells({ row, number, assignedToLabel, actions }: { row: Row; number: number; assignedToLabel: string; actions: ReactNode }) {
  const cars = row.inquiryCarDetails.length ? row.inquiryCarDetails : [null]
  const detailClass = 'space-y-0.5 text-xs leading-5 text-gray-600'
  return <>
    <td className="px-2 py-3 text-center font-semibold text-gray-700">{number}</td>
    <td className="px-2 py-3"><div className={detailClass}><div><span className="font-semibold text-gray-700">Inquiry No:</span> {row.inquiryNo ?? `Inquiry/${row.inquiryId}`}</div><div><span className="font-semibold text-gray-700">Inquiry Date:</span> {formatListDate(row.dateOfInquiry) || '—'}</div><div><span className="font-semibold text-gray-700">Source:</span> {row.website ?? '—'}{row.sourceDetail ? ` (${row.sourceDetail})` : ''}</div></div></td>
    <td className="px-2 py-3"><div className={detailClass}><div><span className="font-semibold text-gray-700">Customer:</span> {row.customer?.custName ?? row.customerNameLegacy ?? '—'}</div><div><span className="font-semibold text-gray-700">Mobile:</span> {row.customer?.custMobile ?? row.mobileno ?? '—'}</div><div><span className="font-semibold text-gray-700">Email:</span> {row.customer?.custEmail ?? row.email ?? '—'}</div></div></td>
    <td className="px-2 py-3"><div className="space-y-2">{cars.map((car, index) => <div key={`${row.inquiryId}-car-${index}`} className={detailClass}><div><span className="font-semibold text-gray-700">Make:</span> {cleanListValue(car?.carVariantMaster?.carMakeMaster?.make) || cleanListValue(car?.makeLegacy) || '—'}</div><div><span className="font-semibold text-gray-700">Model:</span> {cleanListValue(car?.carVariantMaster?.carModelMaster?.model) || cleanListValue(car?.modelLegacy) || '—'}</div><div><span className="font-semibold text-gray-700">Variant:</span> {cleanListValue(car?.carVariantMaster?.variant) || cleanListValue(car?.variantLegacy) || '—'}</div><div><span className="font-semibold text-gray-700">Year:</span> {car?.year ?? '—'}</div></div>)}</div></td>
    <td className="px-2 py-3"><div className={detailClass}><div><span className="font-semibold text-gray-700">Budget:</span> {formatListMoney(row.budgetOfCustomer)}</div><div><span className="font-semibold text-gray-700">Assigned To:</span> {assignedToLabel}</div></div></td>
    <td className="px-2 py-3"><div className={detailClass}><div className="mb-1.5 flex flex-wrap gap-1.5">{row.classification ? <Badge label={row.classification} /> : null}{row.status ? <Badge label={row.status} /> : null}</div><div><span className="font-semibold text-gray-700">Sub-status:</span> {row.subStatus ?? '—'}</div><div><span className="font-semibold text-gray-700">Follow-up:</span> {formatListDate(row.followUpDate) || '—'}</div><div><span className="font-semibold text-gray-700">Visited:</span> {formatListDate(row.visitedDateOfCustomer) || '—'}</div></div></td>
    <td className="max-w-[220px] break-words whitespace-normal px-2 py-3 text-xs leading-5 text-gray-600">{row.remark?.trim() ? row.remark : '—'}</td>
    <td className="px-2 py-3">{actions}</td>
  </>
}
