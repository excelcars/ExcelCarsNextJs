'use client'

import type { ReactNode } from 'react'
import { cleanListValue, formatListDate, formatListMoney } from '@/lib/listFormatters'

type Row = {
  inquiryId: number; dateOfInquiry: Date | string | null; website: string | null; sourceDetail: string | null; customerNameLegacy: string | null; mobileno: string | null; email: string | null; budgetOfCustomer: string | number | null; classification: string | null; visitedDateOfCustomer: Date | string | null; status: string | null; subStatus: string | null; followUpDate: Date | string | null; remark: string | null
  customer: { custName: string; custMobile: string | null; custEmail: string | null } | null
  assignedToUser?: { userName: string | null; displayName: string | null } | null
  inquiryCarDetails: Array<{ makeLegacy?: string | null; modelLegacy?: string | null; variantLegacy?: string | null; year: number | null; carVariantMaster: { variant: string | null; carMakeMaster: { make: string | null } | null; carModelMaster: { model: string | null } | null } | null }>
}

export function InquiryTableDataCells({ row, number, assignedToLabel, actions }: { row: Row; number: number; assignedToLabel: string; actions: ReactNode }) {
  const cars = row.inquiryCarDetails.length ? row.inquiryCarDetails : [null]
  return <>
    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{number}</td>
    <td className="px-4 py-3"><div className="space-y-1 text-sm text-gray-700"><div>Inquiry Date: {formatListDate(row.dateOfInquiry) || '—'}</div><div>Ref.: {row.website ?? '—'}{row.sourceDetail ? ` (${row.sourceDetail})` : ''}</div></div></td>
    <td className="px-4 py-3"><div className="space-y-1 text-sm text-gray-700"><div>Name: {row.customer?.custName ?? row.customerNameLegacy ?? '—'}</div><div>Mob: {row.customer?.custMobile ?? row.mobileno ?? '—'}</div><div>Email: {row.customer?.custEmail ?? row.email ?? '—'}</div></div></td>
    <td className="px-4 py-3"><div className="space-y-2 text-sm text-gray-700">{cars.map((car, index) => <div key={`${row.inquiryId}-car-${index}`}><div>Make: {cleanListValue(car?.carVariantMaster?.carMakeMaster?.make) || cleanListValue(car?.makeLegacy) || 'na'}</div><div>Model: {cleanListValue(car?.carVariantMaster?.carModelMaster?.model) || cleanListValue(car?.modelLegacy) || 'na'}</div><div>Variant: {cleanListValue(car?.carVariantMaster?.variant) || cleanListValue(car?.variantLegacy) || 'na'}</div><div>Year: {car?.year ?? 0}</div></div>)}</div></td>
    <td className="px-4 py-3"><div className="space-y-1 text-sm text-gray-700"><div>Budget: {formatListMoney(row.budgetOfCustomer)}</div><div>Class: {row.classification ?? '—'}</div><div>Assigned To: {assignedToLabel}</div></div></td>
    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatListDate(row.visitedDateOfCustomer) || '—'}</td>
    <td className="px-4 py-3"><div className="space-y-1 text-sm text-gray-700"><div>Status: {row.status ?? '—'}</div><div>Sub_Status: {row.subStatus ?? '—'}</div></div></td>
    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatListDate(row.followUpDate) || '—'}</td>
    <td className="max-w-[260px] break-words whitespace-normal px-4 py-3 text-sm text-gray-600">{row.remark?.trim() ? row.remark : '—'}</td>
    <td className="px-4 py-3">{actions}</td>
  </>
}
