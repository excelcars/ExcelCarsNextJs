'use client'

import type { ReactNode } from 'react'
import { AlertTriangle, CircleHelp, ClipboardPenLine, ContactRound } from 'lucide-react'
import { Badge, Table } from '@/components/ui'
import { formatListDate, formatListMoney } from '@/lib/listFormatters'

type FollowupTableRow = {
  inquiryId: number; inquiryNo?: string | null; dateOfInquiry: Date | string | null; website: string | null; sourceDetail?: string | null; location?: string | null
  customerNameLegacy: string | null; mobileno: string | null; email: string | null; budgetOfCustomer?: string | number | null; classification: string | null; status?: string | null; subStatus: string | null; followUpDate: Date | string | null; visitedDateOfCustomer?: Date | string | null; remark: string | null
  followupInquiry?: Array<{ contactOutcome?: string | null }>; createdBy?: number | null; createdByUser?: { userName: string | null; displayName: string | null } | null
  customer: { custName: string; custMobile?: string | null; custEmail?: string | null } | null
  inquiryCarDetails: Array<{ inquiryCarDetailsId?: number; makeLegacy?: string | null; modelLegacy?: string | null; variantLegacy?: string | null; subVariant?: string | null; year: number | null; carVariantMaster: { variant: string | null; carMakeMaster: { make: string | null } | null; carModelMaster: { model: string | null } | null } | null }>
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (value: string | null | undefined) => (!value || JUNK_VALUES.has(value.trim().toLowerCase()) ? '' : value)
const fmtDate = (value: Date | string | null | undefined) => value ? new Date(value).toISOString().slice(0, 10) : ''
const isOverdue = (value: Date | string | null) => value ? new Date(value) < new Date(new Date().toDateString()) : false
const formatContactOutcome = (value: string | null | undefined) => ({ spoke_to_customer: 'Spoke to customer', no_answer: 'No answer', asked_to_call_back: 'Asked to call back', number_not_working: 'Number not working' }[value ?? ''] ?? '')

function DetailCell({ items }: { items: Array<[string, string | number | null | undefined]> }) {
  return <div className="space-y-0.5 text-xs leading-5 text-gray-600">{items.map(([label, value]) => <div key={label}><span className="font-semibold text-gray-700">{label}:</span>{' '}<span>{value === null || value === undefined || value === '' ? '—' : String(value)}</span></div>)}</div>
}

type InlineCells = { followup: ReactNode; classification: ReactNode; remark: ReactNode; actions: ReactNode }
type FollowupTableProps<T extends FollowupTableRow> = { rows: T[]; page: number; pageSize: number; onLogFollowup: (row: T) => void; renderInlineCells?: (row: T) => InlineCells | null; onViewFollowup: (inquiryId: number) => void; onEditInquiry: (inquiryId: number) => void }

export function FollowupTable<T extends FollowupTableRow>({ rows, page, pageSize, onLogFollowup, renderInlineCells, onViewFollowup, onEditInquiry }: FollowupTableProps<T>) {
  return (
    <div className="[&_th]:px-2 [&_td]:px-2 [&_input]:h-9 [&_input]:px-2 [&_label]:font-semibold [&_textarea]:px-2 [&_th:first-child]:w-12 [&_th:first-child]:min-w-12 [&_th:first-child]:max-w-12 [&_td:first-child]:w-12 [&_td:first-child]:min-w-12 [&_td:first-child]:max-w-12">
      <Table headers={['Sr. No.', 'Inquiry', 'Customer Details', 'Vehicle', 'Budget / Visited Date', 'Follow-up Status', 'Classification / Outcome', 'Remark', 'Actions']} empty={rows.length === 0} minWidthClass="min-w-[1100px]" stickyLastColumn>
        {rows.map((row, index) => {
          const name = row.customer?.custName ?? row.customerNameLegacy ?? ''
          const mobile = row.customer?.custMobile ?? row.mobileno
          const email = row.customer?.custEmail ?? row.email
          const overdue = isOverdue(row.followUpDate)
          const inquiryMadeBy = row.createdByUser?.displayName ?? row.createdByUser?.userName ?? (row.createdBy ? `User #${row.createdBy}` : '')
          const lastOutcome = formatContactOutcome(row.followupInquiry?.[0]?.contactOutcome)
          const inlineCells = renderInlineCells?.(row)
          return <tr key={row.inquiryId} className={`transition hover:bg-slate-50 ${inlineCells ? 'bg-slate-50/80 shadow-[inset_3px_0_0_#1B2A6B]' : ''}`}>
            <td className="px-2 py-3 text-center font-semibold text-gray-700">{((page - 1) * pageSize) + index + 1}</td>
            <td className="px-2 py-3"><DetailCell items={[['Inquiry No', row.inquiryNo], ['Inquiry Date', fmtDate(row.dateOfInquiry)], ['Source', `${row.website ?? ''}${row.sourceDetail ? ` (${row.sourceDetail})` : ''}`], ['Location', row.location]]} /></td>
            <td className="px-2 py-3"><DetailCell items={[['Name', name], ['Mobile', mobile], ['Email', email]]} /></td>
            <td className="px-2 py-3"><div className="space-y-2">{row.inquiryCarDetails.length > 0 ? row.inquiryCarDetails.map(car => <DetailCell key={car.inquiryCarDetailsId ?? `${car.makeLegacy}-${car.modelLegacy}-${car.variantLegacy}-${car.year ?? 'na'}`} items={[['Make', clean(car.carVariantMaster?.carMakeMaster?.make) || clean(car.makeLegacy)], ['Model', clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy)], ['Variant', clean(car.carVariantMaster?.variant) || clean(car.variantLegacy) || clean(car.subVariant)], ['Year', car.year]]} />) : <DetailCell items={[["Vehicle", '']]} />}</div></td>
            <td className="px-2 py-3"><DetailCell items={[['Budget', formatListMoney(row.budgetOfCustomer)], ['Visited Date', formatListDate(row.visitedDateOfCustomer)]]} /></td>
            <td className="px-2 py-3">{inlineCells?.followup ?? <div className={overdue ? 'text-red-600' : ''}><DetailCell items={[['Status', row.status], ['Sub-status', row.subStatus], ['Follow-up Date', fmtDate(row.followUpDate)]]} />{overdue ? <div className="mt-1 flex items-center gap-1 text-xs font-semibold"><AlertTriangle className="h-3.5 w-3.5" />Overdue</div> : null}</div>}</td>
            <td className="px-2 py-3">
              {inlineCells?.classification ?? <><div className="mb-1.5">{row.classification ? <Badge label={row.classification} /> : null}</div><DetailCell items={[['Last Outcome', lastOutcome], ['Inquiry Made By', inquiryMadeBy]]} /></>}
            </td>
            <td className="px-2 py-3">{inlineCells?.remark ?? <div className="max-w-[190px] text-xs leading-5 text-gray-600">{row.remark ?? '—'}</div>}</td>
            <td className="px-2 py-3"><div className="flex flex-wrap items-center gap-2">{inlineCells?.actions ?? <button onClick={() => onLogFollowup(row)} className="rounded p-1.5 text-gray-700 transition hover:bg-green-50 hover:text-green-700" title="Edit Follow-up"><ClipboardPenLine className="h-5 w-5" /></button>}<button onClick={() => onViewFollowup(row.inquiryId)} className="rounded p-1.5 text-gray-700 transition hover:bg-violet-50 hover:text-violet-700" title="View Follow-up"><ContactRound className="h-5 w-5" /></button><button onClick={() => onEditInquiry(row.inquiryId)} className="rounded p-1.5 text-gray-700 transition hover:bg-blue-50 hover:text-[#1B2A6B]" title="Edit Inquiry"><CircleHelp className="h-5 w-5" /></button></div></td>
          </tr>
        })}
      </Table>
    </div>
  )
}
