'use client'

import type { ReactNode } from 'react'
import { Badge } from '@/components/ui'
import { cleanListValue, formatListDate, formatListMoney } from '@/lib/listFormatters'
import type { InquiryListRow } from './InquiryTableDataCells'
import { PartnerInquiryDetails } from './PartnerInquiryDetails'
import { QuickVehicleMapping } from './QuickVehicleMapping'
import { websiteVehicleRequest } from './websiteInquiryDisplay'

export function InquiryMobileCard({ row, number, assignedToLabel, actions }: { row: InquiryListRow; number: number; assignedToLabel: string; actions: ReactNode }) {
  const mobile = row.customer?.custMobile ?? row.mobileno
  const email = row.customer?.custEmail ?? row.email
  const websiteVehicle = websiteVehicleRequest(row)
  return (
    <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-blue-700">#{number} · {row.inquiryNo ?? `Inquiry/${row.inquiryId}`}</span>
        <span className="text-xs text-gray-500">{formatListDate(row.dateOfInquiry) || '—'}</span>
      </div>
      <h2 className="mt-2 text-base font-bold text-gray-900">{row.customer?.custName ?? row.customerNameLegacy ?? '—'}</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {row.classification ? <Badge label={row.classification} /> : null}
        {row.status ? <Badge label={row.status} /> : null}
      </div>
      <div className="mt-3 space-y-1 text-sm text-gray-600">
        {mobile ? <a href={`tel:${mobile}`} className="flex min-h-11 items-center font-medium text-blue-700" aria-label={`Call ${mobile}`}>{mobile}</a> : <div>No mobile number</div>}
        {email ? <a href={`mailto:${email}`} className="flex min-h-11 items-center text-blue-700">{email}</a> : null}
        {row.location ? <div>{row.location}</div> : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
        {[
          ['Budget', formatListMoney(row.budgetOfCustomer)],
          ['Assigned to', assignedToLabel],
          ['Follow-up', formatListDate(row.followUpDate) || '—'],
          ['Visited', formatListDate(row.visitedDateOfCustomer) || '—'],
          ['Sub-status', row.subStatus || '—'],
          ['Source', `${row.website || '—'}${row.sourceDetail ? ` (${row.sourceDetail})` : ''}`],
        ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-0.5 font-medium text-gray-800">{value}</dd></div>)}
      </dl>
      <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
        <h3 className="mb-1 text-xs font-semibold text-gray-500">Interested vehicles</h3>
        {row.inquiryCarDetails.length ? row.inquiryCarDetails.map((car, index) => <div key={index} className="space-y-1 py-1"><div>{[
          cleanListValue(car.carVariantMaster?.carMakeMaster?.make) || cleanListValue(car.makeLegacy),
          cleanListValue(car.carVariantMaster?.carModelMaster?.model) || cleanListValue(car.modelLegacy),
          cleanListValue(car.carVariantMaster?.variant) || cleanListValue(car.variantLegacy),
          car.year,
        ].filter(Boolean).join(' · ') || '—'}</div>
          {car.subVariant ? <p><span className="font-medium">Vehicle requested: </span>{car.subVariant}</p> : null}
          {(row.website?.toLowerCase() === 'cardekho' || websiteVehicle) && car.subVariant && !car.carVariantMaster && (!websiteVehicle || (!car.makeLegacy && !car.modelLegacy && !car.variantLegacy)) ? <QuickVehicleMapping inquiryId={row.inquiryId} vehicleDescription={car.subVariant} /> : null}
        </div>) : websiteVehicle ? <><p><span className="font-medium">Vehicle requested: </span>{websiteVehicle}</p><QuickVehicleMapping inquiryId={row.inquiryId} vehicleDescription={websiteVehicle} /></> : <div>—</div>}
        {row.sourceDetail?.startsWith('Partner lead ID:') ? <PartnerInquiryDetails inquiryId={row.inquiryId} /> : null}
      </div>
      {row.remark?.trim() ? <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600"><span className="font-semibold">Remark: </span>{row.remark}</p> : null}
      <div className="mt-4 border-t border-gray-100 pt-3">{actions}</div>
    </article>
  )
}
