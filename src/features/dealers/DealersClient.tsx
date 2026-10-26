'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Download, Plus, Pencil, Trash2 } from 'lucide-react'
import { ActionAlert, Btn, Input, LoadingOverlay, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { FormDropdown } from '@/components/FormDropdown'
import { createDealer, updateDealer, deleteDealer, type DealerFormInput } from './actions'
import { DealerNameAutocomplete } from './DealerNameAutocomplete'
import { DealerMobileAutocomplete } from './DealerMobileAutocomplete'
import type { DealerFieldErrors, DealerRow } from './types'

function emptyForm(): DealerFormInput {
  return { dealerName: '', dealerMobileNo: '', dealerMobileNo_2: '', dealerEmail: '', dealerAddress: '', dealerCompanyName: '', dealerWebsite: '' }
}

function csvValue(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function exportDealersCsv(rows: DealerRow[], search: string) {
  const headers = ['Name', 'Mobile', 'Mobile 2', 'Address', 'Email', 'Company Name', 'Website']
  const lines = [headers.map(csvValue).join(',')]

  for (const row of rows) {
    lines.push([
      row.dealerName,
      row.dealerMobileNo,
      row.dealerMobileNo_2,
      row.dealerAddress,
      row.dealerEmail,
      row.dealerCompanyName,
      row.dealerWebsite,
    ].map(csvValue).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const suffix = search.trim() ? 'filtered' : `${rows.length}-rows`
  link.href = url
  link.download = `dealers-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function clientValidationErrors(form: DealerFormInput): DealerFieldErrors {
  const errors: DealerFieldErrors = {}
  const mobile = form.dealerMobileNo.trim()
  const mobile2 = form.dealerMobileNo_2.trim()
  const email = form.dealerEmail.trim()
  const website = form.dealerWebsite.trim()
  if (!form.dealerName.trim()) errors.dealerName = 'Name is required.'
  if (!mobile) errors.dealerMobileNo = 'Mobile is required.'
  else if (!/^\d{10,11}$/.test(mobile)) errors.dealerMobileNo = 'Enter 10 to 11 digits.'
  if (mobile2 && !/^\d{10,11}$/.test(mobile2)) errors.dealerMobileNo_2 = 'Enter 10 to 11 digits.'
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.dealerEmail = 'Enter a valid email address.'
  if (website) {
    try {
      const url = new URL(website.includes('://') ? website : `https://${website}`)
      if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname.includes('.')) throw new Error('Invalid URL')
    } catch {
      errors.dealerWebsite = 'Enter a valid website address.'
    }
  }
  return errors
}

export function DealersClient({
  initialData,
  total,
  page,
  pageCount,
  search,
  field,
  sort,
}: {
  initialData: DealerRow[];
  total: number;
  page: number;
  pageCount: number;
  search: string;
  field: string;
  sort: string;
}) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(search)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<DealerFormInput>(emptyForm())
  const [initialForm, setInitialForm] = useState<DealerFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [discardChangesOpen, setDiscardChangesOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [exportError, setExportError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<DealerFieldErrors>({})
  const [isPending, startTransition] = useTransition()
  const [isNavigating, startNavigationTransition] = useTransition()
  const [isExporting, startExportTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchFieldLabel = {
    all: 'all dealer details',
    name: 'dealer name',
    primaryMobile: 'primary mobile',
    secondaryMobile: 'second mobile',
    email: 'email address',
    company: 'company name',
    address: 'address',
    website: 'website',
  }[field] ?? 'all dealer details'
  const hasUnsavedChanges = useMemo(() => modal !== null && Object.keys(form).some(key => {
    const fieldKey = key as keyof DealerFormInput
    return form[fieldKey] !== initialForm[fieldKey]
  }), [form, initialForm, modal])

  const pushQuery = (params: Record<string, string>) => {
    const query = new URLSearchParams({ search, field, sort, page: '1', ...params })
    for (const [key, value] of [...query.entries()]) {
      if (!value || (key === 'field' && value === 'all') || (key === 'sort' && value === 'nameAsc')) query.delete(key)
    }
    startNavigationTransition(() => {
      router.push(`/config/dealers${query.size ? `?${query.toString()}` : ''}`)
    })
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchInput === search) return
    debounceRef.current = setTimeout(() => pushQuery({ search: searchInput }), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    if (!successMessage) return
    const dismissTimer = setTimeout(() => setSuccessMessage(''), 3500)
    return () => clearTimeout(dismissTimer)
  }, [successMessage])

  const resetFilters = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearchInput('')
    pushQuery({ search: '', field: 'all', sort: 'nameAsc' })
  }

  const closeModal = () => {
    setModal(null)
    setDiscardChangesOpen(false)
    setError('')
    setFieldErrors({})
  }

  const requestCloseModal = () => {
    if (isPending) return
    if (hasUnsavedChanges) {
      setDiscardChangesOpen(true)
      return
    }
    closeModal()
  }

  const openAdd = () => {
    const blank = emptyForm()
    setForm(blank)
    setInitialForm(blank)
    setEditId(null)
    setError('')
    setFieldErrors({})
    setSuccessMessage('')
    setModal('add')
  }
  const openEdit = (r: DealerRow) => {
    const nextForm = {
      dealerName: r.dealerName ?? '', dealerMobileNo: r.dealerMobileNo ?? '', dealerMobileNo_2: r.dealerMobileNo_2 ?? '',
      dealerEmail: r.dealerEmail ?? '', dealerAddress: r.dealerAddress ?? '', dealerCompanyName: r.dealerCompanyName ?? '', dealerWebsite: r.dealerWebsite ?? '',
    }
    setForm(nextForm)
    setInitialForm(nextForm)
    setEditId(r.dealerId)
    setError('')
    setFieldErrors({})
    setSuccessMessage('')
    setModal('edit')
  }

  const f = <K extends keyof DealerFormInput>(k: K, v: DealerFormInput[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setFieldErrors(prev => {
      if (!prev[k]) return prev
      const next = { ...prev }
      delete next[k]
      return next
    })
  }

  const save = () => {
    setError('')
    if (!hasUnsavedChanges) return
    const validationErrors = clientValidationErrors(form)
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }
    startTransition(async () => {
      const result = editId ? await updateDealer(editId, form) : await createDealer(form)
      if (!result.success) {
        const message = result.error ?? 'Could not save this dealer.'
        setError(message)
        setSaveFeedback({ type: 'error', message })
        return
      }
      setSaveFeedback({ type: 'success', message: `Dealer ${editId ? 'updated' : 'created'} successfully.` })
      closeModal()
      setSuccessMessage(editId ? 'Dealer updated successfully.' : 'Dealer saved successfully.')
      router.refresh()
    })
  }

  const del = () => {
    if (!deleteId) return
    setIsDeleting(true)
    startTransition(async () => {
      const result = await deleteDealer(deleteId)
      if (!result.success) {
        const message = result.error ?? 'Could not delete this dealer.'
        setDeleteError(message)
        setDeleteFeedback({ type: 'error', message })
      } else {
        setDeleteFeedback({ type: 'success', message: 'Dealer deleted successfully.' })
      }
      setDeleteId(null)
      setIsDeleting(false)
      if (result.success) router.refresh()
    })
  }

  const exportRows = () => {
    setExportError('')
    startExportTransition(async () => {
      try {
        const query = new URLSearchParams()
        if (search.trim()) query.set('search', search.trim())
        if (field !== 'all') query.set('field', field)
        if (sort !== 'nameAsc') query.set('sort', sort)
        const response = await fetch(`/api/dealers/export${query.size ? `?${query.toString()}` : ''}`)
        const payload: unknown = await response.json()
        if (!response.ok || !Array.isArray(payload)) throw new Error('Could not export dealer records.')
        exportDealersCsv(payload as DealerRow[], search)
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Could not export dealer records.')
      }
    })
  }

  return (
    <div>
      <PageHeader
        title="Dealers"
        subtitle={`${total.toLocaleString('en-IN')} dealers`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={exportRows} disabled={isExporting || total === 0}>
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : search.trim() ? `Export Filtered (${total})` : `Export All (${total})`}
            </Btn>
            <Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Dealer</Btn>
          </div>
        }
      />

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_11rem_11rem_auto]">
          <div className="flex flex-col gap-1 sm:col-span-2 xl:col-span-1">
            <label className="text-xs font-medium text-gray-600">Search value</label>
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder={`Type ${searchFieldLabel}...`} />
          </div>
          <FormDropdown label="Search in" value={field} options={[['all', 'All fields'], ['name', 'Name'], ['primaryMobile', 'Primary mobile'], ['secondaryMobile', 'Mobile 2'], ['email', 'Email'], ['company', 'Company'], ['address', 'Address'], ['website', 'Website']].map(([value, label]) => ({ value, label }))} placeholder="All fields" onChange={value => pushQuery({ field: value })} className="w-full" />
          <FormDropdown label="Sort by" value={sort} options={[['nameAsc', 'Name: A–Z'], ['nameDesc', 'Name: Z–A'], ['newest', 'Newest added'], ['oldest', 'Oldest added']].map(([value, label]) => ({ value, label }))} placeholder="Sort by" onChange={value => pushQuery({ sort: value })} className="w-full" />
          {(search || searchInput || field !== 'all' || sort !== 'nameAsc') && <Btn variant="outline" size="sm" onClick={resetFilters}>Reset Filters</Btn>}
          <p className="text-xs text-gray-500 sm:col-span-2 xl:col-span-4">Choose where to search, then type the value above. Sorting applies immediately; filtering starts after you type.</p>
        </div>
      </div>

      {successMessage && <div role="status" className="fixed right-6 top-6 z-50 flex items-center gap-4 rounded-lg border border-green-200 bg-white px-4 py-3 text-sm text-green-700 shadow-lg"><span>{successMessage}</span><button type="button" onClick={() => setSuccessMessage('')} className="font-medium text-green-800 hover:text-green-950" aria-label="Dismiss success message">Dismiss</button></div>}
      {deleteError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{deleteError}</div>}
      {exportError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>}

      <div className="relative" aria-busy={isNavigating}>
        <LoadingOverlay show={isNavigating} label="Loading dealers..." subtle />
      <Table headers={['Dealer', 'Contact', 'Address', 'Actions']} minWidthClass="min-w-[760px]" empty={initialData.length === 0}>
        {initialData.map(r => (
          <tr key={r.dealerId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{r.dealerName ?? '—'}</div>
              {r.dealerCompanyName && <div className="mt-1 text-sm text-gray-600">{r.dealerCompanyName}</div>}
              {r.dealerWebsite && <div className="mt-0.5 max-w-56 truncate text-xs text-gray-500" title={r.dealerWebsite}>{r.dealerWebsite}</div>}
            </td>
            <td className="px-4 py-3">
              <div className="font-mono text-sm text-gray-700">{r.dealerMobileNo ?? '—'}</div>
              {r.dealerMobileNo_2 && <div className="mt-0.5 font-mono text-xs text-gray-500">{r.dealerMobileNo_2}</div>}
              {r.dealerEmail && <div className="mt-0.5 max-w-56 truncate text-xs text-gray-500" title={r.dealerEmail}>{r.dealerEmail}</div>}
            </td>
            <td className="max-w-64 px-4 py-3 text-sm text-gray-600">
              <div className="truncate" title={r.dealerAddress ?? undefined}>{r.dealerAddress ?? '—'}</div>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setDeleteError(''); setDeleteId(r.dealerId) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">Page {page} of {pageCount}</div>
          <div className="flex gap-1.5">
            <Btn variant="outline" size="sm" disabled={isNavigating || page <= 1} onClick={() => pushQuery({ page: String(page - 1) })}>
              <ChevronLeft className="w-3.5 h-3.5" />Prev
            </Btn>
            <Btn variant="outline" size="sm" disabled={isNavigating || page >= pageCount} onClick={() => pushQuery({ page: String(page + 1) })}>
              Next<ChevronRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </div>
      )}

      <Modal title={editId ? 'Edit Dealer' : 'Add Dealer'} open={!!modal} onClose={requestCloseModal}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><DealerNameAutocomplete value={form.dealerName} onChange={value => f('dealerName', value)} error={!!fieldErrors.dealerName} />{fieldErrors.dealerName && <p className="mt-1 text-xs text-red-600">{fieldErrors.dealerName}</p>}</div>
            <div><DealerMobileAutocomplete value={form.dealerMobileNo} onChange={value => f('dealerMobileNo', value)} error={!!fieldErrors.dealerMobileNo} />{fieldErrors.dealerMobileNo && <p className="mt-1 text-xs text-red-600">{fieldErrors.dealerMobileNo}</p>}</div>
            <div><Input label="Mobile 2" value={form.dealerMobileNo_2} onChange={e => f('dealerMobileNo_2', e.target.value)} inputMode="numeric" maxLength={11} pattern="[0-9]{10,11}" error={!!fieldErrors.dealerMobileNo_2} />{fieldErrors.dealerMobileNo_2 && <p className="mt-1 text-xs text-red-600">{fieldErrors.dealerMobileNo_2}</p>}</div>
            <div><Input label="Email" type="text" inputMode="email" value={form.dealerEmail} onChange={e => f('dealerEmail', e.target.value)} error={!!fieldErrors.dealerEmail} />{fieldErrors.dealerEmail && <p className="mt-1 text-xs text-red-600">{fieldErrors.dealerEmail}</p>}</div>
            <Input label="Company Name" value={form.dealerCompanyName} onChange={e => f('dealerCompanyName', e.target.value)} />
            <div><Input label="Website" value={form.dealerWebsite} onChange={e => f('dealerWebsite', e.target.value)} error={!!fieldErrors.dealerWebsite} />{fieldErrors.dealerWebsite && <p className="mt-1 text-xs text-red-600">{fieldErrors.dealerWebsite}</p>}</div>
          </div>
          <Input label="Address" value={form.dealerAddress} onChange={e => f('dealerAddress', e.target.value)} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={requestCloseModal} disabled={isPending}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending || !hasUnsavedChanges}>{isPending ? 'Saving...' : modal === 'edit' && !hasUnsavedChanges ? 'No changes to save' : 'Save Dealer'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={discardChangesOpen}
        onClose={() => setDiscardChangesOpen(false)}
        onConfirm={closeModal}
        title="Discard unsaved changes?"
        message="Your edits have not been saved. Do you want to discard them?"
        confirmLabel="Discard"
      />
      <ActionAlert result={deleteFeedback} onClose={() => setDeleteFeedback(null)} successTitle="Dealer deleted" errorTitle="Dealer not deleted" />
      <ActionAlert result={saveFeedback} onClose={() => setSaveFeedback(null)} successTitle="Dealer saved" errorTitle="Dealer not saved" />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => { if (!isDeleting) setDeleteId(null) }}
        onConfirm={del}
        title="Delete dealer?"
        message="This permanently deletes the dealer record and cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Dealer'}
        confirmDisabled={isDeleting}
        cancelDisabled={isDeleting}
        closeOnConfirm={false}
      />
    </div>
  )
}
