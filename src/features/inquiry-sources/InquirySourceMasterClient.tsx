'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { ActionAlert, Btn, ConfirmDialog, Input, Modal, PageHeader, SearchBar, Table } from '@/components/ui'
import { createInquirySource, deleteInquirySource, updateInquirySource } from './actions'
import type { InquirySourceFormInput, InquirySourceMasterRow } from './types'

function validateFields(form: InquirySourceFormInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(form.code.trim().toUpperCase().replace(/\s+/g, '_'))) errors.code = 'Code must use uppercase letters, numbers, and underscores.'
  if (!form.displayName.trim()) errors.displayName = 'Source name is required.'
  else if (form.displayName.trim().length > 100) errors.displayName = 'Source name must be 100 characters or fewer.'
  if (!form.category.trim()) errors.category = 'Category is required.'
  else if (form.category.trim().length > 100) errors.category = 'Category must be 100 characters or fewer.'
  if (!Number.isInteger(Number(form.reportingSort)) || Number(form.reportingSort) < 1 || Number(form.reportingSort) > 9999) errors.reportingSort = 'Reporting order must be a whole number from 1 to 9999.'
  return errors
}

function emptyForm(): InquirySourceFormInput {
  return { code: '', displayName: '', category: '', requiresDetail: false, isActive: true, reportingSort: 1 }
}

function SourceForm({ form, errors, onChange }: { form: InquirySourceFormInput; errors: Record<string, string>; onChange: (next: InquirySourceFormInput) => void }) {
  const set = <K extends keyof InquirySourceFormInput>(key: K, value: InquirySourceFormInput[K]) => onChange({ ...form, [key]: value })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Source Name *" value={form.displayName} onChange={event => set('displayName', event.target.value)} placeholder="e.g. CarWale" error={!!errors.displayName} errorMessage={errors.displayName} />
      <Input label="Code *" value={form.code} onChange={event => set('code', event.target.value)} placeholder="e.g. CARWALE" error={!!errors.code} errorMessage={errors.code} />
      <Input label="Category *" value={form.category} onChange={event => set('category', event.target.value)} placeholder="e.g. Portal" error={!!errors.category} errorMessage={errors.category} />
      <Input label="Reporting Order *" type="number" min={1} value={form.reportingSort} onChange={event => set('reportingSort', Number(event.target.value))} error={!!errors.reportingSort} errorMessage={errors.reportingSort} />
      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.requiresDetail} onChange={event => set('requiresDetail', event.target.checked)} /> Require detail</label>
      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isActive} onChange={event => set('isActive', event.target.checked)} /> Active</label>
    </div>
  )
}

export function InquirySourceMasterClient({
  initialData,
  total,
  page,
  pageCount,
  search,
}: {
  initialData: InquirySourceMasterRow[]
  total: number
  page: number
  pageCount: number
  search: string
}) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(search)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<InquirySourceFormInput>(emptyForm())
  const [editRow, setEditRow] = useState<InquirySourceMasterRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<InquirySourceMasterRow | null>(null)
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = (params: Record<string, string>) => {
    const query = new URLSearchParams({ search, page: '1', ...params })
    for (const [key, value] of [...query.entries()]) if (!value) query.delete(key)
    window.location.assign(`/config/inquiry-sources${query.toString() ? `?${query}` : ''}`)
  }

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (searchInput === search) return
    searchTimer.current = setTimeout(() => navigate({ search: searchInput }), 350)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const openAdd = () => { setForm(emptyForm()); setEditRow(null); setError(''); setFieldErrors({}); setModal('add') }
  const openEdit = (row: InquirySourceMasterRow) => {
    setForm({ code: row.code, displayName: row.displayName, category: row.category, requiresDetail: row.requiresDetail, isActive: row.isActive, reportingSort: row.reportingSort })
    setEditRow(row); setError(''); setFieldErrors({}); setModal('edit')
  }

  const save = () => {
    setError('')
    const nextErrors = validateFields(form)
    if (Object.keys(nextErrors).length) { setFieldErrors(nextErrors); return }
    setFieldErrors({})
    startTransition(async () => {
      const result = editRow ? await updateInquirySource(editRow.sourceId, form) : await createInquirySource(form)
      if (!result.success) { const message = result.error ?? 'Could not save this inquiry source.'; setError(message); setSaveFeedback({ type: 'error', message }); return }
      setSaveFeedback({ type: 'success', message: `Inquiry source ${editRow ? 'updated' : 'created'} successfully.` })
      setModal(null)
      router.refresh()
    })
  }

  const remove = () => {
    if (!deleteRow) return
    startTransition(async () => {
      const result = await deleteInquirySource(deleteRow.sourceId)
      if (!result.success) {
        const message = result.error ?? 'Could not delete this source.'
        setError(message)
        setDeleteFeedback({ type: 'error', message })
      } else {
        setDeleteFeedback({ type: 'success', message: 'Inquiry source deleted successfully.' })
        router.refresh()
      }
      setDeleteRow(null)
    })
  }

  return (
    <div>
      <PageHeader
        title="Inquiry Source Master"
        subtitle={`${total.toLocaleString('en-IN')} controlled Reference Website / Source values.`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="h-3.5 w-3.5" /> Add Source</Btn>}
      />

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex max-w-md flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Search sources</label>
          <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Source name, code, category..." />
        </div>
        <p className="mt-3 text-xs text-gray-500">Search by source name, code, or category.</p>
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Table headers={['Source', 'Configuration', 'Usage', 'Actions']} minWidthClass="min-w-[820px]" empty={initialData.length === 0} emptyMessage="No sources match this search.">
        {initialData.map(row => (
          <tr key={row.sourceId} className="hover:bg-gray-50">
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{row.displayName}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500"><span className="font-mono">{row.code}</span><span>•</span><span>Order {row.reportingSort}</span></div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">
              <div>{row.category}</div>
              <div className="mt-1 text-xs text-gray-500">Detail: {row.requiresDetail ? 'Required' : 'Not required'}</div>
            </td>
            <td className="px-4 py-3">
              <div><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{row.isActive ? 'Active' : 'Inactive'}</span></div>
              <div className="mt-1 text-xs text-gray-500">{row.inquiryCount.toLocaleString('en-IN')} inquiries</div>
            </td>
            <td className="px-4 py-3"><div className="flex items-center gap-1">
              <button type="button" onClick={() => openEdit(row)} aria-label={`Edit ${row.displayName}`} className="rounded p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-[#1B2A6B]"><Pencil className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setDeleteRow(row)} disabled={row.inquiryCount > 0} aria-label={`Delete ${row.displayName}`} title={row.inquiryCount > 0 ? 'Cannot delete a source used by inquiries.' : 'Delete source'} className="rounded p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
            </div></td>
          </tr>
        ))}
      </Table>

      {pageCount > 1 && <div className="mt-4 flex items-center justify-between"><div className="text-xs text-gray-500">Page {page} of {pageCount}</div><div className="flex gap-1.5">
        <Btn size="sm" variant="outline" disabled={page <= 1} onClick={() => navigate({ page: String(page - 1) })}><ChevronLeft className="h-3.5 w-3.5" /> Prev</Btn>
        <Btn size="sm" variant="outline" disabled={page >= pageCount} onClick={() => navigate({ page: String(page + 1) })}>Next <ChevronRight className="h-3.5 w-3.5" /></Btn>
      </div></div>}

      <Modal title={modal === 'edit' ? 'Edit Inquiry Source' : 'Add Inquiry Source'} open={modal !== null} onClose={() => setModal(null)}>
        <div className="space-y-5"><SourceForm form={form} errors={fieldErrors} onChange={next => { setForm(next); setFieldErrors({}) }} />
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-3"><Btn variant="outline" onClick={() => setModal(null)} disabled={isPending}>Cancel</Btn><Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Source'}</Btn></div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteRow !== null}
        onClose={() => setDeleteRow(null)}
        onConfirm={remove}
        confirmDisabled={isPending}
        cancelDisabled={isPending}
        closeOnConfirm={false}
        title="Delete Inquiry Source"
        message={deleteRow ? `Delete ${deleteRow.displayName}? It has no linked inquiries. Historic source mapping rows will also be removed.` : ''}
      />
      <ActionAlert result={deleteFeedback} onClose={() => setDeleteFeedback(null)} successTitle="Inquiry source deleted" errorTitle="Inquiry source not deleted" />
      <ActionAlert result={saveFeedback} onClose={() => setSaveFeedback(null)} successTitle="Inquiry source saved" errorTitle="Inquiry source not saved" />
    </div>
  )
}
