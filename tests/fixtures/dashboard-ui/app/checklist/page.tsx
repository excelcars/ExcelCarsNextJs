'use client'

import { useState } from 'react'
import { ChecklistHeader, ChecklistFilters } from '../../../../../src/features/checklist/ChecklistHeader'
import { ChecklistTable } from '../../../../../src/features/checklist/ChecklistTable'
import { ChecklistDocumentsEditor } from '../../../../../src/features/checklist/ChecklistDocumentsEditor'
import { ChecklistDocumentsList } from '../../../../../src/features/checklist/ChecklistDocumentsList'
import type { ChecklistListRow } from '../../../../../src/features/checklist/ChecklistClient'
import type { DocRow } from '../../../../../src/features/checklist/actions'
import { ListPagination } from '../../../../../src/components/ListPagination'
import { Btn, ConfirmDialog, Modal } from '../../../../../src/components/ui'

const names = ['Original Registration Book / RC Card', 'Insurance Certificate (State Comprehensive / Third Party)', 'Authorised Signatory Letter on Company Letter Head (In case of Company Vehicle)']
const initialDocs: DocRow[] = names.map((documentName, index) => ({ documentName, applicable: 'Yes', received: index === 0 ? 'Yes' : 'No', originalCopy: index === 1 ? 'Copy' : 'Original' }))
const rows: ChecklistListRow[] = Array.from({ length: 3 }, (_, index) => ({
  documentId: index + 1, make: 'Hyundai', model: 'Creta', variant: 'SX Optional Automatic Long Wheelbase Limited Edition', colour: 'Pearl White', registrationNo: `MH00AB123${index}`, year: 2024, fuelType: 'Diesel',
  customerId: null, customer: null, customerNameLegacy: 'Sample customer with a long name', customerMobileLegacy: '0000000000', customerEmailLegacy: 'sample-long-customer-email@example.test',
  createdBy: null, createdDate: null, updatedBy: null, updatedDate: null, inventoryId: index + 1,
  documentCount: 3, applicableCount: index === 2 ? 0 : 3, receivedApplicableCount: index === 1 ? 3 : 1, receivedCount: index === 1 ? 3 : 1,
}))

export default function ChecklistPreview() {
  const [search, setSearch] = useState('')
  const [registration, setRegistration] = useState('')
  const [page, setPage] = useState(1)
  const [mode, setMode] = useState<'view' | 'edit' | null>(null)
  const [docs, setDocs] = useState<DocRow[]>(initialDocs)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const filtered = rows.filter(row => `${row.registrationNo} ${row.customerNameLegacy}`.toLowerCase().includes(search.toLowerCase()) && (!registration || row.registrationNo === registration))
  const pageCount = Math.max(1, Math.ceil(filtered.length / 2))
  const edit = () => { setDocs(initialDocs.map(doc => ({ ...doc }))); setMode('edit') }
  return <main className="min-w-0 bg-gray-50 p-3 sm:p-6">
    <ChecklistHeader total={filtered.length} filtered={!!(search || registration)} exporting={false} onExport={format => setFeedback(`Mock ${format} export`)} onAdd={edit} />
    <ChecklistFilters total={filtered.length} search={search} registration={registration} pending={false} onSearch={value => { setSearch(value); setPage(1) }} onRegistration={value => { setRegistration(value); setPage(1) }} />
    <ChecklistTable data={filtered.slice((page - 1) * 2, page * 2)} pending={false} onView={() => setMode('view')} onEdit={edit} onDelete={() => setFeedback('Delete checklist confirmation — preview only')} />
    <ListPagination page={page} pageCount={pageCount} total={filtered.length} showingText={`Showing page ${page}`} pending={false} onPageChange={setPage} className="mt-4 flex-col gap-3 sm:flex-row [&_button]:min-h-11" />
    <Modal title="Edit Checklist" open={mode === 'edit'} onClose={() => setMode(null)} width="max-w-3xl">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Document Checklist</h2><Btn size="sm" variant="outline" className="min-h-11" onClick={() => setDocs(current => [...current, { documentName: '', applicable: 'No', received: 'No', originalCopy: 'Original' }])}>Add Document</Btn></div>
        <ChecklistDocumentsEditor docs={docs} suggestions={names} onChange={(index, changes) => setDocs(current => current.map((doc, position) => position === index ? { ...doc, ...changes } : doc))} onRemove={setRemoveIndex} />
        <div className="grid gap-3 sm:flex sm:justify-end [&_button]:min-h-11 [&_button]:justify-center"><Btn variant="outline" onClick={() => setMode(null)}>Cancel</Btn><Btn onClick={() => { setMode(null); setFeedback('Mock save completed') }}>Save Checklist</Btn></div>
      </div>
    </Modal>
    <Modal title="View Checklist" open={mode === 'view'} onClose={() => setMode(null)} width="max-w-4xl"><ChecklistDocumentsList documents={initialDocs.map((doc, index) => ({ ...doc, checklistDetailsId: index + 1 }))} /></Modal>
    <ConfirmDialog open={removeIndex !== null} onClose={() => setRemoveIndex(null)} onConfirm={() => { setDocs(current => current.filter((_, index) => index !== removeIndex)); setRemoveIndex(null) }} title="Remove document?" message="Remove this document from the checklist?" confirmLabel="Remove" />
    <Modal title="Preview action" open={!!feedback} onClose={() => setFeedback('')}><p>{feedback}</p><Btn onClick={() => setFeedback('')}>Close preview</Btn></Modal>
  </main>
}
