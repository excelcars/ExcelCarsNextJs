'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Btn, Input, Select, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { createCustomer, updateCustomer, deleteCustomer, type CustomerFormInput } from './adminActions'
import { CUSTOMER_TYPES } from './adminQueries'

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

const fmtDate = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''

function emptyForm(): CustomerFormInput {
  return { type: 'Customer', custName: '', custAddress: '', custMobile: '', mobile_2: '', custEmail: '', custDob: '', custAnniversaryDt: '', comments: '', companyName: '' }
}

export function CustomersClient({
  initialData, total, page, pageCount, search, type,
}: {
  initialData: CustomerRow[]
  total: number
  page: number
  pageCount: number
  search: string
  type: string
}) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(search)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<CustomerFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
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

  const openAdd = () => { setForm(emptyForm()); setEditId(null); setError(''); setModal('add') }
  const openEdit = (r: CustomerRow) => {
    setForm({
      type: r.type ?? 'Customer', custName: r.custName, custAddress: r.custAddress ?? '',
      custMobile: r.custMobile ?? '', mobile_2: r.mobile_2 ?? '', custEmail: r.custEmail ?? '',
      custDob: fmtDate(r.custDob), custAnniversaryDt: fmtDate(r.custAnniversaryDt),
      comments: r.comments ?? '', companyName: r.companyName ?? '',
    })
    setEditId(r.custId)
    setError('')
    setModal('edit')
  }

  const f = <K extends keyof CustomerFormInput>(k: K, v: CustomerFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateCustomer(editId, form) : await createCustomer(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setModal(null)
      router.refresh()
    })
  }

  const del = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteCustomer(deleteId)
      if (!result.success) setError(result.error ?? 'Could not delete this record.')
      setDeleteId(null)
      router.refresh()
    })
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${total.toLocaleString('en-IN')} customers`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Customer</Btn>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Name, mobile, email, company..." />
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

      <Table headers={['Name', 'Type', 'Contact', 'Company', 'DOB', 'Anniversary', 'Actions']} empty={initialData.length === 0}>
        {initialData.map(r => (
          <tr key={r.custId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-medium text-gray-900">{r.custName}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.type ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-700 font-mono">{r.custMobile ?? '—'}</div>
              <div className="text-xs text-gray-500">{r.custEmail ?? ''}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.companyName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.custDob) || '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.custAnniversaryDt) || '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.custId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
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

      <Modal title={editId ? 'Edit Customer' : 'Add Customer'} open={!!modal} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={e => f('type', e.target.value)}>
              {CUSTOMER_TYPES.map(t => <option key={t}>{t}</option>)}
            </Select>
            <Input label="Name *" value={form.custName} onChange={e => f('custName', e.target.value)} />
            <Input label="Mobile" value={form.custMobile} onChange={e => f('custMobile', e.target.value)} />
            <Input label="Mobile 2" value={form.mobile_2} onChange={e => f('mobile_2', e.target.value)} />
            <Input label="Email" type="email" value={form.custEmail} onChange={e => f('custEmail', e.target.value)} />
            <Input label="Company Name" value={form.companyName} onChange={e => f('companyName', e.target.value)} />
            <Input label="Date of Birth" type="date" value={form.custDob} onChange={e => f('custDob', e.target.value)} />
            <Input label="Anniversary Date" type="date" value={form.custAnniversaryDt} onChange={e => f('custAnniversaryDt', e.target.value)} />
          </div>
          <Input label="Address" value={form.custAddress} onChange={e => f('custAddress', e.target.value)} />
          <Input label="Comments" value={form.comments} onChange={e => f('comments', e.target.value)} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Customer'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this customer? This cannot be undone." />
    </div>
  )
}
