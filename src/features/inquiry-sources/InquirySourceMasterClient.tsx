'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { Btn, ConfirmDialog, Input, Modal, PageHeader, SearchBar, Table } from '@/components/ui'
import { createInquirySource, deleteInquirySource, updateInquirySource } from './actions'
import type { InquirySourceFormInput, InquirySourceMasterRow } from './types'

function emptyForm(): InquirySourceFormInput {
  return { code: '', displayName: '', category: '', requiresDetail: false, isActive: true, reportingSort: 1 }
}

function SourceForm({ form, onChange }: { form: InquirySourceFormInput; onChange: (next: InquirySourceFormInput) => void }) {
  const set = <K extends keyof InquirySourceFormInput>(key: K, value: InquirySourceFormInput[K]) => onChange({ ...form, [key]: value })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Source Name *" value={form.displayName} onChange={event => set('displayName', event.target.value)} placeholder="e.g. CarWale" />
      <Input label="Code *" value={form.code} onChange={event => set('code', event.target.value)} placeholder="e.g. CARWALE" />
      <Input label="Category *" value={form.category} onChange={event => set('category', event.target.value)} placeholder="e.g. Portal" />
      <Input label="Reporting Order *" type="number" min={1} value={form.reportingSort} onChange={event => set('reportingSort', Number(event.target.value))} />
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
  const [searchInput, setSearchInput] = useState(search)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<InquirySourceFormInput>(emptyForm())
  const [editRow, setEditRow] = useState<InquirySourceMasterRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<InquirySourceMasterRow | null>(null)
  const [error, setError] = useState('')
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

  const openAdd = () => { setForm(emptyForm()); setEditRow(null); setError(''); setModal('add') }
  const openEdit = (row: InquirySourceMasterRow) => {
    setForm({ code: row.code, displayName: row.displayName, category: row.category, requiresDetail: row.requiresDetail, isActive: row.isActive, reportingSort: row.reportingSort })
    setEditRow(row); setError(''); setModal('edit')
  }

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editRow ? await updateInquirySource(editRow.sourceId, form) : await createInquirySource(form)
      if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }
      setModal(null)
      window.location.reload()
    })
  }

  const remove = () => {
    if (!deleteRow) return
    startTransition(async () => {
      const result = await deleteInquirySource(deleteRow.sourceId)
      if (!result.success) setError(result.error ?? 'Could not delete this source.')
      setDeleteRow(null)
      if (result.success) window.location.reload()
    })
  }

  return (
    <div>
      <PageHeader
        title="Inquiry Source Master"
        subtitle={`${total.toLocaleString('en-IN')} controlled Reference Website / Source values.`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="h-3.5 w-3.5" /> Add Source</Btn>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Source name, code, category..." />
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Table headers={['Order', 'Source', 'Code', 'Category', 'Detail', 'Status', 'Inquiries', 'Actions']} empty={initialData.length === 0} emptyMessage="No sources match this search.">
        {initialData.map(row => (
          <tr key={row.sourceId} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-mono text-sm text-gray-600">{row.reportingSort}</td>
            <td className="px-4 py-3 font-medium text-gray-900">{row.displayName}</td>
            <td className="px-4 py-3 font-mono text-sm text-gray-600">{row.code}</td>
            <td className="px-4 py-3 text-gray-700">{row.category}</td>
            <td className="px-4 py-3 text-gray-700">{row.requiresDetail ? 'Required' : 'No'}</td>
            <td className="px-4 py-3"><span className={row.isActive ? 'text-emerald-700' : 'text-gray-500'}>{row.isActive ? 'Active' : 'Inactive'}</span></td>
            <td className="px-4 py-3 text-gray-700">{row.inquiryCount.toLocaleString('en-IN')}</td>
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
        <div className="space-y-5"><SourceForm form={form} onChange={setForm} />
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
    </div>
  )
}
