'use client'

import { AlertTriangle, Eye, Pencil, Phone, PhoneCall } from 'lucide-react'
import { Badge, Table } from '@/components/ui'

type FollowupTableRow = {
  inquiryId: number
  dateOfInquiry: Date | string | null
  website: string | null
  sourceDetail?: string | null
  customerNameLegacy: string | null
  mobileno: string | null
  email: string | null
  budgetOfCustomer?: string | number | null
  classification: string | null
  status?: string | null
  subStatus: string | null
  followUpDate: Date | string | null
  visitedDateOfCustomer?: Date | string | null
  remark: string | null
  createdBy?: number | null
  createdByUser?: { userName: string | null; displayName: string | null } | null
  customer: { custName: string; custMobile?: string | null; custEmail?: string | null } | null
  inquiryCarDetails: Array<{
    inquiryCarDetailsId?: number
    makeLegacy?: string | null
    modelLegacy?: string | null
    variantLegacy?: string | null
    subVariant?: string | null
    year: number | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { make: string | null } | null
      carModelMaster: { model: string | null } | null
    } | null
  }>
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (value: string | null | undefined) => (!value || JUNK_VALUES.has(value.trim().toLowerCase()) ? '' : value)
const fmtDate = (value: Date | string | null | undefined) => value ? new Date(value).toISOString().slice(0, 10) : ''
const fmtMoney = (value: string | number | null | undefined) => value ? `₹${Number(value).toLocaleString('en-IN')}` : '—'
const isOverdue = (value: Date | string | null) => value ? new Date(value) < new Date(new Date().toDateString()) : false

type FollowupTableProps<T extends FollowupTableRow> = {
  rows: T[]
  onLogFollowup: (row: T) => void
  onViewFollowup: (inquiryId: number) => void
  onViewInquiry: (inquiryId: number) => void
  onEditInquiry: (inquiryId: number) => void
}

export function FollowupTable<T extends FollowupTableRow>({
  rows,
  onLogFollowup,
  onViewFollowup,
  onViewInquiry,
  onEditInquiry,
}: FollowupTableProps<T>) {
  return (
    <Table
      headers={[
        'Inquiry Date / Website',
        'Customer Details',
        'Car Details',
        'Budget / Visited Date',
        'Classification / Follow-up Status / Sub-status',
        'Follow-up Date / Inquiry Made By',
        'Remark',
        'Follow-up',
        'Inquiry',
      ]}
      empty={rows.length === 0}
    >
      {rows.map(row => {
        const name = row.customer?.custName ?? row.customerNameLegacy ?? '—'
        const overdue = isOverdue(row.followUpDate)
        const inquiryMadeBy = row.createdByUser?.displayName ?? row.createdByUser?.userName ?? (row.createdBy ? `User #${row.createdBy}` : '—')

        return (
          <tr key={row.inquiryId} className={`transition hover:bg-gray-50 ${overdue ? 'bg-red-50/40' : ''}`}>
            <td className="px-4 py-3">
              <div className="min-w-[160px] space-y-1 text-sm text-gray-700">
                <div><span className="font-medium text-gray-900">Inquiry Date:</span> {fmtDate(row.dateOfInquiry) || '—'}</div>
                <div className="break-words"><span className="font-medium text-gray-900">Website:</span> {row.website ?? '—'}{row.sourceDetail ? ` (${row.sourceDetail})` : ''}</div>
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">
              <div className="min-w-[180px] space-y-1">
                <div className="break-words font-medium text-gray-900">{name}</div>
                <div className="flex items-center gap-1 font-mono"><Phone className="h-3 w-3 text-gray-400" />{row.customer?.custMobile ?? row.mobileno ?? '—'}</div>
                <div className="break-words text-gray-600">{row.customer?.custEmail ?? row.email ?? '—'}</div>
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="min-w-[180px] space-y-3 text-sm text-gray-700">
                {row.inquiryCarDetails.length > 0 ? row.inquiryCarDetails.map(car => (
                  <div key={car.inquiryCarDetailsId ?? `${car.makeLegacy}-${car.modelLegacy}-${car.variantLegacy}-${car.year ?? 'na'}`} className="border-b border-dashed border-gray-200 pb-2 last:border-b-0 last:pb-0">
                    <div><span className="font-medium text-gray-900">Make:</span> {clean(car.carVariantMaster?.carMakeMaster?.make) || clean(car.makeLegacy) || '—'}</div>
                    <div><span className="font-medium text-gray-900">Model:</span> {clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy) || '—'}</div>
                    <div><span className="font-medium text-gray-900">Variant:</span> {clean(car.carVariantMaster?.variant) || clean(car.variantLegacy) || clean(car.subVariant) || '—'}</div>
                    <div><span className="font-medium text-gray-900">Year:</span> {car.year ?? '—'}</div>
                  </div>
                )) : <div>—</div>}
              </div>
            </td>
            <td className="min-w-[150px] px-4 py-3 text-sm text-gray-700">
              <div><span className="font-medium text-gray-900">Budget:</span> {fmtMoney(row.budgetOfCustomer)}</div>
              <div className="mt-2"><span className="font-medium text-gray-900">Visited Date:</span> {fmtDate(row.visitedDateOfCustomer) || '—'}</div>
            </td>
            <td className="min-w-[200px] px-4 py-3 text-sm text-gray-700">
              <div><span className="font-medium text-gray-900">Classification:</span> {row.classification ? <span className="ml-1 inline-block align-middle"><Badge label={row.classification} /></span> : ' —'}</div>
              <div className="mt-2"><span className="font-medium text-gray-900">Status:</span> {row.status ? <span className="ml-1 inline-block align-middle"><Badge label={row.status} /></span> : ' —'}</div>
              <div className="mt-2 break-words"><span className="font-medium text-gray-900">Sub-status:</span> {row.subStatus ?? '—'}</div>
            </td>
            <td className="min-w-[180px] px-4 py-3 text-sm">
              <div className={`flex items-center gap-1 ${overdue ? 'font-semibold text-red-600' : 'text-gray-700'}`}>
                {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
                <span className="font-medium text-gray-900">Follow-up Date:</span><span>{fmtDate(row.followUpDate) || '—'}</span>
              </div>
              <div className="mt-2 break-words text-gray-700"><span className="font-medium text-gray-900">Inquiry Made By:</span> {inquiryMadeBy}</div>
            </td>
            <td className="min-w-[160px] break-words px-4 py-3 text-sm text-gray-700">{row.remark ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="flex min-w-[96px] items-center justify-center gap-2">
                <button onClick={() => onLogFollowup(row)} className="inline-flex rounded p-1.5 text-gray-400 transition hover:bg-green-50 hover:text-green-600" title="Edit Follow-up"><PhoneCall className="h-3.5 w-3.5" /></button>
                <button onClick={() => onViewFollowup(row.inquiryId)} className="inline-flex rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700" title="View Follow-up"><Eye className="h-3.5 w-3.5" /></button>
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex min-w-[96px] items-center justify-center gap-2">
                <button onClick={() => onViewInquiry(row.inquiryId)} className="inline-flex rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700" title="View Inquiry"><Eye className="h-3.5 w-3.5" /></button>
                <button onClick={() => onEditInquiry(row.inquiryId)} className="inline-flex rounded p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-[#1B2A6B]" title="Edit Inquiry"><Pencil className="h-3.5 w-3.5" /></button>
              </div>
            </td>
          </tr>
        )
      })}
    </Table>
  )
}
