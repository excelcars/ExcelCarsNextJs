'use client'

import { useState, type ComponentProps } from 'react'
import { FollowupTable, type FollowupTableRow } from '../../../../../src/features/followup/FollowupTable'
import { FollowupFilters } from '../../../../../src/features/followup/FollowupFilters'
import { FollowupHeader } from '../../../../../src/features/followup/FollowupHeader'
import { FollowupHistoryModal } from '../../../../../src/features/followup/FollowupHistoryModal'
import { FollowupHistoryList } from '../../../../../src/features/followup/FollowupHistoryList'
import { FormDropdown } from '../../../../../src/components/FormDropdown'
import { Btn, Input, Modal, Textarea } from '../../../../../src/components/ui'
import { ListPagination } from '../../../../../src/components/ListPagination'
import { formatListDate } from '../../../../../src/lib/listFormatters'
import { validateFollowupLogInput } from '../../../../../src/lib/inquiryFollowupValidation'

const initialRows: FollowupTableRow[] = Array.from({ length: 3 }, (_, index) => ({
  inquiryId: index + 1, inquiryNo: `INQ/2026/${index + 1}`, dateOfInquiry: '2026-10-01', website: 'Reference', sourceDetail: 'Sample dealer referral', location: 'Sample location with a long name',
  customerNameLegacy: `Sample customer ${index + 1} with a long name`, mobileno: '0000000000', email: 'sample-long-customer-email@example.test', budgetOfCustomer: '1250000', classification: ['Hot', 'Warm', 'Cold'][index], status: 'FollowUp', subStatus: 'Negotiation', followUpDate: index === 0 ? '2026-01-01' : '2099-11-10', visitedDateOfCustomer: '2026-10-22', remark: 'Customer requested the service history and a test drive. '.repeat(3), customer: null,
  createdBy: 1, createdByUser: { displayName: 'Sample employee with a long name', userName: 'sample' },
  followupInquiry: [{ contactOutcome: 'asked_to_call_back' }],
  inquiryCarDetails: [{ year: 2024, carVariantMaster: null, makeLegacy: 'Hyundai', modelLegacy: 'Creta', variantLegacy: 'SX Optional Automatic Long Wheelbase Limited Edition' }],
}))
const defaultFilters = { search: '', status: 'All', contactOutcome: '', customerName: '', subStatus: '', website: '', customerMobile: '', userId: '', makeId: '', modelId: '', variantId: '', classification: 'All', inquiryDateFrom: '', inquiryDateTo: '', followUpDateFrom: '', followUpDateTo: '', visitedDateFrom: '', visitedDateTo: '', budgetFrom: '', budgetTo: '' }
const initialForm = { classification: 'Warm', status: 'FollowUp', subStatus: 'Negotiation', nextFollowUpDate: '', comments: '', contactOutcome: '' }

export default function FollowupPreview() {
  const [rows, setRows] = useState(initialRows)
  const [filters, setFilters] = useState(defaultFilters)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [historyId, setHistoryId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const updateFilter = (key: keyof typeof defaultFilters, value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }
  const callbacks = Object.fromEntries(Object.keys(defaultFilters).map(key => [`on${({ makeId: 'Make', modelId: 'Model', variantId: 'Variant' } as Record<string, string>)[key] ?? key.charAt(0).toUpperCase() + key.slice(1)}Change`, (value: string) => updateFilter(key as keyof typeof defaultFilters, value)])) as Record<Extract<keyof ComponentProps<typeof FollowupFilters>, `on${string}Change`>, (value: string) => void>
  const filterProps: ComponentProps<typeof FollowupFilters> = { ...filters, ...callbacks, restricted: false, currentUserId: '1', isRoutePending: false, statuses: ['Open', 'FollowUp', 'Closed'], classifications: ['Hot', 'Warm', 'Cold'], contactOutcomes: [{ value: 'asked_to_call_back', title: 'Asked to call back' }], sourceOptions: [], users: [{ userId: 1, userName: 'sample', displayName: 'Sample employee with a long name' }], makes: [], models: [], variants: [], userLabel: user => user.displayName || 'Sample' }
  const filtered = rows.filter(row => JSON.stringify(row).toLowerCase().includes(filters.search.toLowerCase()) && (filters.status === 'All' || row.status === filters.status) && (filters.classification === 'All' || row.classification === filters.classification) && (!filters.customerName || row.customerNameLegacy?.includes(filters.customerName)) && (!filters.followUpDateFrom || String(row.followUpDate) >= filters.followUpDateFrom) && (!filters.followUpDateTo || String(row.followUpDate) <= filters.followUpDateTo) && (!filters.budgetFrom || Number(row.budgetOfCustomer) >= Number(filters.budgetFrom)) && (!filters.budgetTo || Number(row.budgetOfCustomer) <= Number(filters.budgetTo)))
  const openLog = (row: FollowupTableRow) => { setEditing(row.inquiryId); setForm({ classification: row.classification || 'Warm', status: row.status || 'FollowUp', subStatus: row.subStatus || '', nextFollowUpDate: '', comments: '', contactOutcome: row.followupInquiry?.[0]?.contactOutcome || '' }); setError('') }
  const save = () => {
    const result = validateFollowupLogInput(form)
    if (result.error) { setError(result.error); return }
    setRows(current => current.map(row => row.inquiryId === editing ? { ...row, classification: form.classification, status: form.status, subStatus: form.subStatus, followUpDate: form.nextFollowUpDate || null, remark: form.comments } : row))
    setEditing(null)
    setFeedback('Follow-up saved in preview only')
  }
  return <main className="min-w-0 bg-gray-50 p-3 sm:p-6">
    <FollowupHeader subtitle={`${filtered.length} matching inquiries`} total={filtered.length} filtered={filters.search !== ''} exporting={false} onExport={() => setFeedback('Mock export')} />
    <FollowupFilters {...filterProps} />
    <div className="mb-4 flex justify-end"><Btn className="min-h-11" variant="outline" onClick={() => { setFilters(defaultFilters); setPage(1) }}>Reset Filters</Btn></div>
    <FollowupTable rows={filtered.slice((page - 1) * 2, page * 2)} page={page} pageSize={2} onLogFollowup={openLog} onViewFollowup={setHistoryId} onEditInquiry={id => setFeedback(`Edit inquiry ${id} — preview action`)} renderInlineCells={row => row.inquiryId === editing ? {
      classification: <div className="space-y-2"><FormDropdown label="Classification" value={form.classification} placeholder="Select classification" options={['Hot', 'Warm', 'Cold'].map(value => ({ value, label: value }))} onChange={classification => setForm(current => ({ ...current, classification }))} /><FormDropdown label="Status" value={form.status} placeholder="Select status" options={['Open', 'FollowUp', 'Closed'].map(value => ({ value, label: value }))} onChange={status => setForm(current => ({ ...current, status, nextFollowUpDate: status === 'Closed' ? '' : current.nextFollowUpDate }))} /><Input aria-label="Sub-status" label="Sub-status" value={form.subStatus} onChange={event => setForm(current => ({ ...current, subStatus: event.target.value }))} /></div>,
      followup: <Input aria-label="Next follow-up date" label="Follow-up date" type="date" value={form.nextFollowUpDate} disabled={form.status !== 'FollowUp'} onChange={event => setForm(current => ({ ...current, nextFollowUpDate: event.target.value }))} />,
      remark: <div><Textarea aria-label="Follow-up remark" label="Remark *" value={form.comments} onChange={event => setForm(current => ({ ...current, comments: event.target.value }))} />{error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}</div>,
      actions: <><Btn onClick={save}>Save</Btn><Btn variant="outline" onClick={() => setEditing(null)}>Cancel</Btn></>,
    } : null} />
    <ListPagination page={page} pageCount={Math.max(1, Math.ceil(filtered.length / 2))} total={filtered.length} showingText={`Showing page ${page}`} pending={false} onPageChange={setPage} className="mt-4 flex-col gap-3 sm:flex-row [&_button]:min-h-11" />
    <FollowupHistoryModal title="View Follow-up History" open={historyId !== null} onClose={() => setHistoryId(null)}><FollowupHistoryList history={[{ pkFollowupId: 1, createdDt: '2026-10-22', followupDate: '2026-11-10', followupStatus: 'FollowUp', followupSubStatus: 'Negotiation', followupClassification: 'Warm', comments: 'Customer asked for another call after reviewing the vehicle information. '.repeat(4) }]} formatDate={formatListDate} formatStatus={(status, subStatus) => `${status} · ${subStatus}`} cleanRemark={value => value || ''} /></FollowupHistoryModal>
    <Modal title="Preview action" open={!!feedback} onClose={() => setFeedback('')}><p>{feedback}</p><Btn onClick={() => setFeedback('')}>Close preview</Btn></Modal>
  </main>
}
