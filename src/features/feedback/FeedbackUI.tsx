'use client'

import { ChevronLeft, ChevronRight, Download, Eye, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { Btn, SearchBar, Table } from '@/components/ui'
import { FEEDBACK_PAGE_SIZES, QUESTIONS } from './constants'
import type { Detail, ListRow } from './types'

const clean = (value: string | null) => !value || ['null', 'na', 'n/a'].includes(value.trim().toLowerCase()) ? '' : value
const vehicleName = (row: ListRow) => [clean(row.carMakeLegacy), clean(row.carModelLegacy), clean(row.carVariantLegacy)].filter(Boolean).join(' ') || '—'
const displayDate = (value: Date | string | null) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : '—'
const displayDateTime = (value: Date | string | null) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(value)) : '—'

export function FeedbackHeader({ total, exporting, pending, onExport, onSend, onAdd }: {
  total: number; exporting: boolean; pending: boolean; onExport: () => void; onSend: () => void; onAdd: () => void
}) {
  return <header className="mb-6 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
    <div><h1 className="text-xl font-bold text-gray-900">Customer Feedback</h1><p className="mt-0.5 text-sm text-gray-500">{total} response{total === 1 ? '' : 's'}</p></div>
    <div className="grid min-w-0 gap-2 sm:grid-cols-3 xl:flex [&_button]:min-h-11 [&_button]:justify-center [&_svg]:shrink-0">
      <Btn size="sm" variant="outline" onClick={onExport} disabled={exporting || pending}><Download aria-hidden="true" className="h-4 w-4" />{exporting ? 'Exporting...' : 'Export'}</Btn>
      <Btn size="sm" variant="outline" onClick={onSend}><Send aria-hidden="true" className="h-4 w-4" />Send Feedback</Btn>
      <Btn size="sm" onClick={onAdd} disabled={pending}><Plus aria-hidden="true" className="h-4 w-4" />Add Feedback</Btn>
    </div>
  </header>
}

export function FeedbackFilters({ search, hasSearch, pageSize, sort, dir, pending, onSearch, onSubmit, onClear, onSort, onPageSize }: {
  search: string; hasSearch: boolean; pageSize: number; sort: string; dir: string; pending: boolean
  onSearch: (value: string) => void; onSubmit: () => void; onClear: () => void; onSort: (sort: string, dir: string) => void; onPageSize: (value: number) => void
}) {
  return <form aria-label="Feedback filters" className="mb-4 grid min-w-0 gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:p-4" onSubmit={event => { event.preventDefault(); onSubmit() }}>
    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] [&_input]:min-h-11 [&_input]:text-base sm:[&_input]:text-sm [&_button]:min-h-11 [&_button]:justify-center">
      <SearchBar value={search} onChange={onSearch} placeholder="Name, mobile, email, registration..." disabled={pending} />
      <Btn type="submit" variant="outline" disabled={pending}>{pending ? 'Searching...' : 'Search'}</Btn>
      {hasSearch && <Btn variant="ghost" onClick={onClear} disabled={pending}>Clear</Btn>}
    </div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 [&_select]:min-h-11 [&_select]:min-w-0 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-gray-300 [&_select]:bg-white [&_select]:px-3 [&_select]:text-base sm:[&_select]:text-sm">
      <label className="grid min-w-0 gap-1 text-sm text-gray-600">Sort feedback<select disabled={pending} aria-label="Sort feedback" value={`${sort}:${dir}`} onChange={event => { const [field, direction] = event.target.value.split(':'); onSort(field, direction) }}>
        <option value="feedbackId:desc">Newest first</option><option value="feedbackId:asc">Oldest first</option><option value="customerName:asc">Customer A–Z</option><option value="customerName:desc">Customer Z–A</option><option value="carRegistrationNo:asc">Registration A–Z</option><option value="carRegistrationNo:desc">Registration Z–A</option>
      </select></label>
      <label className="grid min-w-0 gap-1 text-sm text-gray-600">Page size<select disabled={pending} aria-label="Page size" value={pageSize} onChange={event => onPageSize(Number(event.target.value))}>{FEEDBACK_PAGE_SIZES.map(size => <option key={size} value={size}>{size} / page</option>)}</select></label>
    </div>
  </form>
}

type ListProps = { rows: ListRow[]; onView: (id: number) => void; onEdit: (id: number) => void; onDelete: (id: number) => void }

function FeedbackActions({ row, onView, onEdit, onDelete, mobile = false }: Omit<ListProps, 'rows'> & { row: ListRow; mobile?: boolean }) {
  return <div className={mobile ? 'mt-4 grid grid-cols-2 gap-2' : 'flex flex-wrap gap-1'}>
    {[
      { label: 'View feedback', text: 'View', Icon: Eye, action: () => onView(row.feedbackId), danger: false },
      ...(!row.submittedAt ? [{ label: 'Edit feedback', text: 'Edit', Icon: Pencil, action: () => onEdit(row.feedbackId), danger: false }] : []),
      { label: 'Delete feedback', text: 'Delete', Icon: Trash2, action: () => onDelete(row.feedbackId), danger: true },
    ].map(({ label, text, Icon, action, danger }) => <button key={label} type="button" aria-label={label} onClick={action} className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg p-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2A6B] ${danger ? 'text-red-600 hover:bg-red-50' : 'text-[#1B2A6B] hover:bg-blue-50'} ${mobile ? 'border border-gray-200' : ''}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{mobile && <span>{text}</span>}</button>)}
  </div>
}

export function FeedbackList({ rows, onView, onEdit, onDelete }: ListProps) {
  return <>
    <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:hidden">
      {rows.length === 0 ? <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 md:col-span-2">No records found</div> : rows.map(row => <article key={row.feedbackId} aria-labelledby={`feedback-${row.feedbackId}`} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm [overflow-wrap:anywhere]">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500"><span>Feedback #{row.feedbackId}</span><span>{row.submittedAt ? 'Customer response' : 'Staff entry'}</span></div>
        <h2 id={`feedback-${row.feedbackId}`} className="mt-2 text-lg font-semibold text-gray-900">{row.customerName ?? '—'}</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="text-xs text-gray-500">Contact</dt><dd className="mt-1 text-gray-800">{row.customerMob ?? '—'}</dd><dd className="text-gray-600">{row.customerEmail ?? '—'}</dd></div>
          <div><dt className="text-xs text-gray-500">Vehicle</dt><dd className="mt-1 font-medium text-gray-800">{vehicleName(row)}</dd><dd className="font-mono text-gray-600">{row.carRegistrationNo ?? '—'}</dd></div>
          {row.submittedAt && <div><dt className="text-xs text-gray-500">Submitted at</dt><dd>{displayDateTime(row.submittedAt)}</dd></div>}
        </dl>
        <dl className="mt-4 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
          {([['Satisfaction', row.answer_1], ['Experience', row.answer_2], ['Recommend', row.answer_4]] as const).map(([label, value]) => <div key={label} className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1"><dt className="text-gray-500">{label}</dt><dd className="font-medium text-gray-900">{value ?? '—'}</dd></div>)}
        </dl>
        <FeedbackActions row={row} onView={onView} onEdit={onEdit} onDelete={onDelete} mobile />
      </article>)}
    </div>
    <div className="hidden xl:block">
      <Table headers={['Customer', 'Contact', 'Vehicle', 'Satisfaction', 'Experience', 'Recommend', 'Actions']} empty={rows.length === 0} compact minWidthClass="min-w-[1200px]" columnWidths={['15%', '19%', '20%', '10%', '10%', '12%', '14%']}>
        {rows.map(row => <tr key={row.feedbackId} className="hover:bg-gray-50">
          <td className="font-medium">{row.customerName ?? '—'}</td><td>{row.customerMob ?? '—'}<br /><span className="text-gray-500">{row.customerEmail ?? ''}</span></td>
          <td>{vehicleName(row)}<br /><span className="text-gray-500">{row.carRegistrationNo ?? ''}</span></td>
          <td>{row.answer_1 ?? '—'}</td><td>{row.answer_2 ?? '—'}</td><td>{row.answer_4 ?? '—'}</td>
          <td><FeedbackActions row={row} onView={onView} onEdit={onEdit} onDelete={onDelete} /></td>
        </tr>)}
      </Table>
    </div>
  </>
}

export function FeedbackPagination({ total, page, pageCount, pending, onPage }: { total: number; page: number; pageCount: number; pending: boolean; onPage: (value: number) => void }) {
  return <nav aria-label="Feedback pagination" className="mt-4 flex min-w-0 flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
    <span aria-live="polite">{total} total · Page {page} of {pageCount}</span>
    <div className="grid grid-cols-2 gap-2 sm:flex [&_button]:min-h-11 [&_button]:justify-center"><Btn size="sm" variant="outline" disabled={pending || page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft aria-hidden="true" className="h-4 w-4" />Previous</Btn><Btn size="sm" variant="outline" disabled={pending || page >= pageCount} onClick={() => onPage(page + 1)}>Next<ChevronRight aria-hidden="true" className="h-4 w-4" /></Btn></div>
  </nav>
}

export function FeedbackDetails({ view }: { view: Detail }) {
  return (
            <div className="min-w-0 space-y-4 text-sm [overflow-wrap:anywhere]">
              <div>
                <b>Customer:</b> {view.customerName ?? "—"} ·{" "}
                {view.customerMob ?? "—"} · {view.customerEmail ?? "—"}
              </div>
              {view.submittedAt && (
                <div>
                  <b>Submitted at:</b> {displayDateTime(view.submittedAt)}{" "}
                  (customer response)
                </div>
              )}
              <div>
                <b>DOB / Anniversary:</b> {displayDate(view.customerDob)} /{" "}
                {displayDate(view.customerAnniversaryDt)}
              </div>
              <div>
                <b>Vehicle:</b>{" "}
                {[
                  clean(view.carMakeLegacy),
                  clean(view.carModelLegacy),
                  clean(view.carVariantLegacy),
                ]
                  .filter(Boolean)
                  .join(" ") || "—"}{" "}
                · {view.carYear ?? "—"} · {view.carRegistrationNo ?? "—"}
              </div>
              {QUESTIONS.map((question, index) => (
                <div key={question.key}>
                  <b>
                    {index + 1}. {question.text}
                  </b>
                  <br />
                  {(view[question.key as keyof Detail] as string) ?? "—"}
                </div>
              ))}
              <div>
                <b>Comments:</b>
                <div className="whitespace-pre-wrap">
                  {view.comments || "—"}
                </div>
              </div>
            </div>
  );
}
