'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CalendarDays, Eye, Mail, Phone } from 'lucide-react'
import { ActionAlert, Btn, Input, Select, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { createCustomer, updateCustomer, deleteCustomer, type CustomerFormInput } from './adminActions'
import { CUSTOMER_TYPES } from './adminQueries'
import { CUSTOMER_FIELD_LIMITS, LEGACY_CUSTOMER_TYPES, validateCustomerInput } from './validation'

interface CustomerRow {
  custId: number
  type: string | null
  custName: string
  custAddress: string | null
  custMobile: string | null
  mobile_2: string | null
  custEmail: string | null
  custDob: Date | string | null
  custAnniversaryDt: Date | string | null
  comments: string | null
  companyName: string | null
}

const fmtDate = (d: Date | string | null) => {
  if (!d) return ''
  const date = new Date(d)
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
}

function editCustomerType(type: string | null) {
  const normalized = type?.trim() ?? ''
  return [...CUSTOMER_TYPES, ...LEGACY_CUSTOMER_TYPES].includes(normalized as (typeof CUSTOMER_TYPES)[number]) ? normalized : 'Customer'
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null
}

function ViewField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm text-gray-800">{value?.trim() || '—'}</div>
    </div>
  )
}

function parseDisplayDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const [, day, month, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day) ? date : null
}

function formatDisplayDate(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

function CustomerDateInput({
  label, value, onChange, error, minDate, maxDate,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  minDate?: Date
  maxDate?: Date
}) {
  const selectedDate = parseDisplayDate(value)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => new Date(selectedDate ?? new Date()))
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOutsideRange = (date: Date) => {
    const candidate = new Date(date)
    candidate.setHours(0, 0, 0, 0)
    return (minDate && candidate < minDate) || (maxDate && candidate > maxDate)
  }
  const openCalendar = () => {
    setMonth(new Date(selectedDate ?? maxDate ?? today))
    setOpen(current => !current)
  }

  return (
    <div className="relative flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        <input
          value={value}
          placeholder="DD/MM/YYYY"
          inputMode="numeric"
          maxLength={10}
          onChange={event => onChange(event.target.value)}
          className={`w-full border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'} rounded-md px-3 py-2 pr-10 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 placeholder:text-gray-400`}
          style={{ '--tw-ring-color': error ? '#C8102E' : '#1B2A6B' } as Record<string, string>}
        />
        <button type="button" aria-label={`Choose ${label.toLowerCase()}`} onClick={openCalendar} className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-[#1B2A6B]">
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>
      <FieldError message={error} />

      {open && (
        <div className="absolute z-30 top-[calc(100%+4px)] w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="rounded p-1 text-gray-500 hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button>
            <div className="text-sm font-semibold text-gray-800">{month.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</div>
            <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="rounded p-1 text-gray-500 hover:bg-gray-100"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <div key={day} className="py-1">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {Array.from({ length: firstDay }, (_, index) => <div key={`blank-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1
              const date = new Date(year, monthIndex, day)
              const disabled = isOutsideRange(date)
              const selected = selectedDate?.getTime() === date.getTime()
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange(formatDisplayDate(date)); setOpen(false) }}
                  className={`mx-auto h-8 w-8 rounded-full text-xs transition ${selected ? 'bg-[#1B2A6B] text-white' : 'hover:bg-blue-50 text-gray-700'} ${disabled ? 'cursor-not-allowed text-gray-300 hover:bg-transparent' : ''}`}
                >
                  {day}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex justify-between border-t border-gray-100 pt-2 text-xs">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-gray-500 hover:text-gray-700">Clear</button>
            <button type="button" onClick={() => { const date = maxDate ?? today; onChange(formatDisplayDate(date)); setOpen(false) }} className="text-[#1B2A6B] hover:underline">Use latest allowed</button>
          </div>
        </div>
      )}
    </div>
  )
}

function emptyForm(): CustomerFormInput {
  return { type: 'Customer', custName: '', custAddress: '', custMobile: '', mobile_2: '', custEmail: '', custDob: '', custAnniversaryDt: '', comments: '', companyName: '' }
}

export function CustomersClient({
  initialData, total, page, pageCount, search, type, canWrite,
}: {
  initialData: CustomerRow[]
  total: number
  page: number
  pageCount: number
  search: string
  type: string
  canWrite: boolean
}) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(search)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<CustomerFormInput>(emptyForm())
  const [initialForm, setInitialForm] = useState<CustomerFormInput | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [viewRow, setViewRow] = useState<CustomerRow | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [discardOpen, setDiscardOpen] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CustomerFormInput, string>>>({})
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({ search, type, page: '1', ...params })
    for (const [k, v] of [...q.entries()]) {
      if (!v || v === 'All') q.delete(k)
    }
    router.push(`/config/customers${q.toString() ? `?${q.toString()}` : ''}`)
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchInput === search) return
    debounceRef.current = setTimeout(() => pushQuery({ search: searchInput }), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const openAdd = () => { setForm(emptyForm()); setInitialForm(null); setEditId(null); setError(''); setFieldErrors({}); setModal('add') }
  const openEdit = (r: CustomerRow) => {
    const editForm = {
      type: editCustomerType(r.type), custName: r.custName, custAddress: r.custAddress ?? '',
      custMobile: r.custMobile ?? '', mobile_2: r.mobile_2 ?? '', custEmail: r.custEmail ?? '',
      custDob: fmtDate(r.custDob), custAnniversaryDt: fmtDate(r.custAnniversaryDt),
      comments: r.comments ?? '', companyName: r.companyName ?? '',
    }
    setForm(editForm)
    setInitialForm(editForm)
    setEditId(r.custId)
    setError('')
    setFieldErrors({})
    setModal('edit')
  }

  const f = <K extends keyof CustomerFormInput>(k: K, v: CustomerFormInput[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setFieldErrors(prev => ({ ...prev, [k]: undefined }))
  }
  const mobileField = (key: 'custMobile' | 'mobile_2', value: string) => f(key, value.replace(/\D/g, ''))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const latestDob = new Date(today)
  latestDob.setFullYear(latestDob.getFullYear() - 18)
  const selectedDob = parseDisplayDate(form.custDob)
  const isEditUnchanged = editId !== null && initialForm !== null && JSON.stringify(form) === JSON.stringify(initialForm)
  const isFormDirty = modal === 'add'
    ? JSON.stringify(form) !== JSON.stringify(emptyForm())
    : modal === 'edit' && !isEditUnchanged

  const closeForm = () => {
    if (isPending) return
    if (isFormDirty) {
      setDiscardOpen(true)
      return
    }
    setModal(null)
  }

  const discardForm = () => {
    setDiscardOpen(false)
    setModal(null)
    setFieldErrors({})
    setError('')
  }

  const save = () => {
    setError('')
    const validation = validateCustomerInput(form, { allowLegacyType: editId !== null })
    if (!validation.value) {
      setFieldErrors(validation.errorField ? { [validation.errorField]: validation.error } : {})
      setError(validation.errorField ? '' : validation.error ?? 'Check the customer details.')
      return
    }
    const validatedForm = validation.value
    startTransition(async () => {
      const result = editId ? await updateCustomer(editId, validatedForm) : await createCustomer(validatedForm)
      if (!result.success) {
        const message = result.error ?? 'Could not save this customer.'
        if (result.errorField) {
          setFieldErrors({ [result.errorField]: message })
          setError('')
        } else {
          setError(message)
        }
        setSaveFeedback({ type: 'error', message })
        return
      }
      setSaveFeedback({ type: 'success', message: `Customer ${editId ? 'updated' : 'created'} successfully.` })
      setModal(null)
      router.refresh()
    })
  }

  const del = () => {
    if (!deleteId) return
    setDeleteError('')
    startTransition(async () => {
      const result = await deleteCustomer(deleteId)
      if (!result.success) {
        const message = result.error ?? 'Could not delete this customer.'
        setDeleteError(message)
        setDeleteFeedback({ type: 'error', message })
        setDeleteId(null)
        return
      }
      setDeleteId(null)
      setDeleteFeedback({ type: 'success', message: 'Customer deleted successfully.' })
      router.refresh()
    })
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${total.toLocaleString('en-IN')} customers`}
        action={canWrite ? <Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Customer</Btn> : undefined}
      />

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
        <div className="grid items-end gap-3 md:grid-cols-[minmax(18rem,1fr)_auto]">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Search customers</label>
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Name, mobile, email, company..." />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Customer type</span>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...CUSTOMER_TYPES].map(t => (
                <button key={t} onClick={() => pushQuery({ type: t })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${type === t || (type === 'All' && t === 'All') ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  style={type === t || (type === 'All' && t === 'All') ? { backgroundColor: '#1B2A6B' } : {}}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">Search by name, mobile number, email address, or company.</p>
      </div>

      <Table headers={['Customer', 'Contact', 'Important dates', 'Actions']} minWidthClass="min-w-[760px]" empty={initialData.length === 0}>
        {initialData.map(r => (
          <tr key={r.custId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{r.custName}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                {r.type && <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-[#1B2A6B]">{r.type}</span>}
                {r.companyName && <span>{r.companyName}</span>}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-700"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="font-mono">{r.custMobile ?? '—'}</span></div>
              {r.mobile_2 && <div className="flex items-center gap-2 text-sm text-gray-500"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="font-mono">{r.mobile_2}</span></div>}
              <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500"><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="break-all">{r.custEmail ?? '—'}</span></div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
              <div><span className="text-gray-400">DOB:</span> {fmtDate(r.custDob) || '—'}</div>
              <div className="mt-1"><span className="text-gray-400">Anniversary:</span> {fmtDate(r.custAnniversaryDt) || '—'}</div>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => setViewRow(r)} className="inline-flex rounded-md p-2 text-gray-700 transition hover:bg-gray-50" title="View"><Eye className="h-4 w-4" /></button>
                {canWrite && <>
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setDeleteError(''); setDeleteId(r.custId) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </>}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-500">Page {page} of {pageCount}</div>
          <div className="flex gap-1.5">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => pushQuery({ page: String(page - 1) })}>
              <ChevronLeft className="w-3.5 h-3.5" />Prev
            </Btn>
            <Btn variant="outline" size="sm" disabled={page >= pageCount} onClick={() => pushQuery({ page: String(page + 1) })}>
              Next<ChevronRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </div>
      )}

      <Modal title={editId ? 'Edit Customer' : 'Add Customer'} open={!!modal} onClose={closeForm}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Select label="Type *" value={form.type} onChange={e => f('type', e.target.value)} error={!!fieldErrors.type} required>{[...CUSTOMER_TYPES, ...(editId !== null && LEGACY_CUSTOMER_TYPES.includes(form.type as (typeof LEGACY_CUSTOMER_TYPES)[number]) ? LEGACY_CUSTOMER_TYPES : [])].map(t => <option key={t}>{t}</option>)}</Select><FieldError message={fieldErrors.type} /></div>
            <div><Input label="Name *" value={form.custName} maxLength={CUSTOMER_FIELD_LIMITS.name} onChange={e => f('custName', e.target.value)} error={!!fieldErrors.custName} required /><FieldError message={fieldErrors.custName} /></div>
            <div><Input label="Mobile" value={form.custMobile} inputMode="numeric" maxLength={10} onChange={e => mobileField('custMobile', e.target.value)} error={!!fieldErrors.custMobile} /><FieldError message={fieldErrors.custMobile} /></div>
            <div><Input label="Mobile 2" value={form.mobile_2} inputMode="numeric" maxLength={10} onChange={e => mobileField('mobile_2', e.target.value)} error={!!fieldErrors.mobile_2} /><FieldError message={fieldErrors.mobile_2} /></div>
            <div><Input label="Email" type="email" value={form.custEmail} maxLength={CUSTOMER_FIELD_LIMITS.email} onChange={e => f('custEmail', e.target.value)} error={!!fieldErrors.custEmail} /><FieldError message={fieldErrors.custEmail} /></div>
            <div><Input label="Company Name" value={form.companyName} maxLength={CUSTOMER_FIELD_LIMITS.companyName} onChange={e => f('companyName', e.target.value)} error={!!fieldErrors.companyName} /><FieldError message={fieldErrors.companyName} /></div>
            <CustomerDateInput label="Date of Birth" value={form.custDob} onChange={value => f('custDob', value)} error={fieldErrors.custDob} maxDate={latestDob} />
            <CustomerDateInput label="Anniversary Date" value={form.custAnniversaryDt} onChange={value => f('custAnniversaryDt', value)} error={fieldErrors.custAnniversaryDt} minDate={selectedDob ?? undefined} maxDate={today} />
          </div>
          <div><Input label="Address" value={form.custAddress} maxLength={CUSTOMER_FIELD_LIMITS.address} onChange={e => f('custAddress', e.target.value)} error={!!fieldErrors.custAddress} /><FieldError message={fieldErrors.custAddress} /></div>
          <div><Input label="Comments" value={form.comments} maxLength={CUSTOMER_FIELD_LIMITS.comments} onChange={e => f('comments', e.target.value)} error={!!fieldErrors.comments} /><FieldError message={fieldErrors.comments} /></div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={closeForm} disabled={isPending}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending || isEditUnchanged}>{isPending ? 'Saving...' : 'Save Customer'}</Btn>
          </div>
        </div>
      </Modal>

      <Modal title={`View Customer${viewRow ? ` — ${viewRow.custName}` : ''}`} open={!!viewRow} onClose={() => setViewRow(null)} width="max-w-3xl">
        {viewRow && (
          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer Summary</div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <ViewField label="Name" value={viewRow.custName} />
                <ViewField label="Type" value={viewRow.type} />
                <ViewField label="Company Name" value={viewRow.companyName} />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact Details</div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <ViewField label="Mobile" value={viewRow.custMobile} />
                <ViewField label="Mobile 2" value={viewRow.mobile_2} />
                <ViewField label="Email" value={viewRow.custEmail} />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Additional Details</div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <ViewField label="Date of Birth" value={fmtDate(viewRow.custDob)} />
                <ViewField label="Anniversary Date" value={fmtDate(viewRow.custAnniversaryDt)} />
                <ViewField label="Address" value={viewRow.custAddress} />
                <ViewField label="Comments" value={viewRow.comments} />
              </div>
            </div>
            <div className="flex justify-end"><Btn variant="outline" onClick={() => setViewRow(null)}>Close</Btn></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => { setDeleteId(null); setDeleteError('') }}
        onConfirm={del}
        message={deleteError || 'Delete this customer? This cannot be undone.'}
        closeOnConfirm={false}
        confirmDisabled={isPending}
        cancelDisabled={isPending}
      />
      <ActionAlert result={deleteFeedback} onClose={() => setDeleteFeedback(null)} successTitle="Customer deleted" errorTitle="Customer not deleted" />
      <ActionAlert result={saveFeedback} onClose={() => setSaveFeedback(null)} successTitle="Customer saved" errorTitle="Customer not saved" />
      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={discardForm}
        title="Discard changes?"
        confirmLabel="Discard"
        message="You have unsaved customer changes. Discard them?"
      />
    </div>
  )
}
