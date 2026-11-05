'use client'

import { useState } from 'react'
import { FeedbackHeader, FeedbackFilters, FeedbackList, FeedbackPagination, FeedbackDetails } from '../../../../../src/features/feedback/FeedbackUI'
import { FeedbackContactFields, FeedbackVehicleFields, FeedbackQuestions } from '../../../../../src/features/feedback/FeedbackFormFields'
import type { Detail } from '../../../../../src/features/feedback/types'
import type { FeedbackFormInput } from '../../../../../src/features/feedback/actions'
import { Btn, ConfirmDialog, Modal, Textarea } from '../../../../../src/components/ui'

const blank = (): FeedbackFormInput => ({ customerId: null, customerName: '', customerMob: '', customerEmail: '', customerDob: '', customerAnniversaryDt: '', carMakeLegacy: '', carModelLegacy: '', carVariantLegacy: '', carRegistrationNo: '', carYear: null, fkVariantId: null, answer_1: 'Neutral', answer_2: 'Fair', answer_3: 'Neutral', answer_4: 'Not Sure', answer_5: 'About the Same', comments: '' })
const initialRows: Detail[] = Array.from({ length: 12 }, (_, index) => ({ ...blank(), feedbackId: index + 1, customerName: `Sample customer ${index + 1} with a long name`, customerMob: '0000000000', customerEmail: 'verylongcustomeremailaddressformobilelayout@example.test', carMakeLegacy: 'Hyundai', carModelLegacy: 'Creta', carVariantLegacy: 'SX Optional Automatic Long Wheelbase Limited Edition', carRegistrationNo: `MH00AB${1230 + index}`, carYear: 2024, answer_1: index % 2 ? 'Satisfied' : 'Neutral', answer_2: 'Very Good', answer_3: 'Satisfied', answer_4: 'Definitely', answer_5: 'Somewhat Better', comments: 'Sample comments with long details about the customer experience.\nSecond line of feedback.', submittedAt: index % 2 ? '2026-11-04T10:30:00Z' : null }))

export default function FeedbackPreview() {
  const [rows, setRows] = useState(initialRows)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState('feedbackId')
  const [dir, setDir] = useState('desc')
  const [form, setForm] = useState<FeedbackFormInput>(blank)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [view, setView] = useState<Detail | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const filtered = rows.filter(row => `${row.customerName} ${row.customerMob} ${row.customerEmail} ${row.carRegistrationNo}`.toLowerCase().includes(appliedSearch.toLowerCase())).sort((a, b) => {
    const value = sort === 'feedbackId' ? a.feedbackId - b.feedbackId : String(a[sort as keyof Detail] ?? '').localeCompare(String(b[sort as keyof Detail] ?? ''))
    return dir === 'asc' ? value : -value
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const setField = <K extends keyof FeedbackFormInput>(key: K, value: FeedbackFormInput[K]) => setForm(current => ({ ...current, [key]: value }))
  const save = () => {
    const record: Detail = { ...form, feedbackId: editId ?? Math.max(0, ...rows.map(row => row.feedbackId)) + 1, submittedAt: null }
    setRows(current => editId ? current.map(row => row.feedbackId === editId ? record : row) : [...current, record])
    setOpen(false)
  }
  return <main className="min-w-0 bg-gray-50 p-3 sm:p-6 [&_button]:min-h-11 [&_button]:min-w-11">
    <FeedbackHeader total={filtered.length} pending={false} exporting={false} onAdd={() => { setEditId(null); setForm(blank()); setOpen(true) }} onExport={() => setFeedback('Export — preview only')} onSend={() => setFeedback('Feedback invitation — preview only. No messages are sent.')} />
    <FeedbackFilters search={search} hasSearch={!!appliedSearch} pageSize={pageSize} sort={sort} dir={dir} pending={false} onSearch={setSearch} onSubmit={() => { setAppliedSearch(search.trim()); setPage(1) }} onClear={() => { setSearch(''); setAppliedSearch(''); setPage(1) }} onSort={(field, direction) => { setSort(field); setDir(direction); setPage(1) }} onPageSize={size => { setPageSize(size); setPage(1) }} />
    <FeedbackList rows={filtered.slice((page - 1) * pageSize, page * pageSize)} onView={id => setView(rows.find(row => row.feedbackId === id) ?? null)} onEdit={id => { const row = rows.find(row => row.feedbackId === id)!; setEditId(id); setForm({ ...row, customerDob: String(row.customerDob ?? ''), customerAnniversaryDt: String(row.customerAnniversaryDt ?? ''), customerName: row.customerName ?? '', customerMob: row.customerMob ?? '', customerEmail: row.customerEmail ?? '', carMakeLegacy: row.carMakeLegacy ?? '', carModelLegacy: row.carModelLegacy ?? '', carVariantLegacy: row.carVariantLegacy ?? '', carRegistrationNo: row.carRegistrationNo ?? '', answer_1: row.answer_1 ?? 'Neutral', answer_2: row.answer_2 ?? 'Fair', answer_3: row.answer_3 ?? 'Neutral', answer_4: row.answer_4 ?? 'Not Sure', answer_5: row.answer_5 ?? 'About the Same', comments: row.comments ?? '' }); setOpen(true) }} onDelete={setDeleteId} />
    <FeedbackPagination total={filtered.length} page={page} pageCount={pageCount} pending={false} onPage={setPage} />
    <Modal title={editId ? 'Edit Feedback' : 'Add Feedback'} open={open} onClose={() => setOpen(false)} width="max-w-3xl">
      <div className="min-w-0 space-y-4 [overflow-wrap:anywhere] [&_textarea]:text-base sm:[&_textarea]:text-sm">
        <FeedbackContactFields form={form} fieldErrors={{}} setField={setField} />
        <FeedbackVehicleFields form={form} fieldErrors={{}} setField={setField} />
        <FeedbackQuestions form={form} setField={setField} />
        <Textarea label="Comments" maxLength={1000} value={form.comments} onChange={event => setField('comments', event.target.value)} />
        <p className="text-xs text-gray-500">Preview only. Changes stay on this page.</p>
        <div className="grid gap-3 sm:flex sm:justify-end [&_button]:justify-center"><Btn variant="outline" onClick={() => setOpen(false)}>Cancel</Btn><Btn onClick={save}>Save Feedback</Btn></div>
      </div>
    </Modal>
    <Modal title={view ? `Feedback #${view.feedbackId}` : 'Feedback'} open={!!view} onClose={() => setView(null)}>{view && <FeedbackDetails view={view} />}</Modal>
    <ConfirmDialog title="Delete sample feedback?" open={deleteId !== null} onClose={() => setDeleteId(null)} message="Remove this sample feedback from the preview?" onConfirm={() => { setRows(current => current.filter(row => row.feedbackId !== deleteId)); setPage(1); setDeleteId(null) }} />
    <Modal title="Preview action" open={!!feedback} onClose={() => setFeedback('')}><p>{feedback}</p><Btn onClick={() => setFeedback('')}>Close preview</Btn></Modal>
  </main>
}
