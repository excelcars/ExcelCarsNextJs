'use client'

import { Badge } from '@/components/ui'
import { formatListDate, formatListMoney } from '@/lib/listFormatters'
import type { FollowupTableProps, FollowupTableRow } from './FollowupTable'

const clean = (value: string | null | undefined) => !value || ['null', 'na', 'n/a'].includes(value.trim().toLowerCase()) ? '' : value

export function FollowupMobileCards<T extends FollowupTableRow>({ rows, page, pageSize, onLogFollowup, renderInlineCells, onViewFollowup, onEditInquiry }: FollowupTableProps<T>) {
  return <div aria-label="Follow-up queue" className="grid min-w-0 gap-3 xl:hidden">
    {rows.length === 0 ? <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No records found</p> : rows.map((row, index) => {
      const inline = renderInlineCells?.(row)
      const overdue = row.followUpDate ? new Date(row.followUpDate) < new Date(new Date().toDateString()) : false
      const outcome = ({ spoke_to_customer: 'Spoke to customer', no_answer: 'No answer', asked_to_call_back: 'Asked to call back', number_not_working: 'Number not working' } as Record<string, string>)[row.followupInquiry?.[0]?.contactOutcome ?? ''] || '—'
      return <article key={row.inquiryId} aria-labelledby={`followup-card-${row.inquiryId}`} className={`min-w-0 break-words [overflow-wrap:anywhere] rounded-xl border bg-white p-4 shadow-sm ${inline ? 'border-[#1B2A6B] ring-1 ring-[#1B2A6B]/10' : 'border-gray-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500"><span>#{(page - 1) * pageSize + index + 1} · {row.inquiryNo || `Inquiry/${row.inquiryId}`}</span>{row.classification && <Badge label={row.classification} />}</div>
        <h2 id={`followup-card-${row.inquiryId}`} className="mt-3 text-lg font-bold text-gray-900">{row.customer?.custName ?? row.customerNameLegacy ?? 'Unnamed inquiry'}</h2>
        <p className="mt-1 text-sm text-gray-600">{row.customer?.custMobile ?? row.mobileno ?? '—'}</p>
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${overdue ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-gray-700'}`}>
          <div className="font-semibold">{overdue ? 'Overdue · ' : 'Follow-up · '}{formatListDate(row.followUpDate) || '—'}</div>
          <p className="mt-1">{row.status || '—'}{row.subStatus ? ` · ${row.subStatus}` : ''}</p>
        </div>
        <details className="mt-2">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#1B2A6B]">Inquiry and vehicle details</summary>
          <dl className="grid min-w-0 gap-3 pb-3 text-sm">
            {[
              ['Email', row.customer?.custEmail ?? row.email], ['Inquiry date', formatListDate(row.dateOfInquiry)],
              ['Source', [row.website, row.sourceDetail].filter(Boolean).join(' · ')], ['Location', row.location],
              ['Budget', formatListMoney(row.budgetOfCustomer)], ['Visited date', formatListDate(row.visitedDateOfCustomer)],
              ['Last outcome', outcome], ['Inquiry made by', row.createdByUser?.displayName ?? row.createdByUser?.userName ?? (row.createdBy ? `User #${row.createdBy}` : '')],
            ].map(([label, value]) => <div key={label}><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-0.5 text-gray-800">{value || '—'}</dd></div>)}
            <div><dt className="text-xs text-gray-500">Vehicles</dt><dd className="mt-1 space-y-2 text-gray-800">{row.inquiryCarDetails.length ? row.inquiryCarDetails.map((car, position) => <p key={car.inquiryCarDetailsId ?? position}>{[clean(car.carVariantMaster?.carMakeMaster?.make) || clean(car.makeLegacy), clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy), clean(car.carVariantMaster?.variant) || clean(car.variantLegacy) || clean(car.subVariant), car.year].filter(Boolean).join(' · ') || '—'}</p>) : '—'}</dd></div>
          </dl>
        </details>
        {inline ? <div className="min-w-0 space-y-4 border-t border-gray-100 pt-4 [&_input]:min-w-0 [&_input]:w-full [&_input]:min-h-11 [&_button]:min-h-11 [&_textarea]:min-w-0 [&_textarea]:w-full">
          <h3 className="text-sm font-semibold text-[#1B2A6B]">Update follow-up</h3>
          {inline.classification}
          {inline.followup}
          {inline.remark}
          <div className="flex flex-wrap gap-2">{inline.actions}</div>
        </div> : <>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700"><span className="font-semibold">Remark: </span>{row.remark || '—'}</div>
          <button type="button" onClick={() => onLogFollowup(row)} className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-[#1B2A6B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#12204f]">Update follow-up</button>
        </>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onViewFollowup(row.inquiryId)} className="min-h-11 rounded-lg border border-gray-200 px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">View history</button>
          <button type="button" onClick={() => onEditInquiry(row.inquiryId)} className="min-h-11 rounded-lg border border-gray-200 px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Edit inquiry</button>
        </div>
      </article>
    })}
  </div>
}
