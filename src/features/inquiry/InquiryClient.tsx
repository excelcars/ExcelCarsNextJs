'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Phone, ChevronLeft, ChevronRight, Mail } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { INQUIRY_STATUSES, INQUIRY_CLASSIFICATIONS } from './queries'
import { createInquiry, updateInquiry, deleteInquiry, sendInquiryEmail, type InquiryFormInput } from './actions'

const SOURCES = ['Walk-in', 'Website', 'Reference', 'JustDial', 'CarDekho', 'OLX', 'Facebook', 'Other']
const SUB_STATUS_SUGGESTIONS = ['Ringing', 'Not Intrested', 'Busy', 'Desired Car Not In Stock', 'Not connected', 'Already Bought Car', 'Visited', 'Fresh Lead', 'Sold Car']

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }

interface InquiryRow {
  inquiryId: number
  inquiryNo: string | null
  dateOfInquiry: Date | string | null
  website: string | null
  customerId: number | null
  customerNameLegacy: string | null
  mobileno: string | null
  email: string | null
  budgetOfCustomer: string | null
  visitedDateOfCustomer: Date | string | null
  classification: string | null
  status: string | null
  subStatus: string | null
  followUpDate: Date | string | null
  remark: string | null
  customer: CustomerOption | null
  inquiryCarDetails: {
    fkVariantId: number | null
    year: number | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { pkMakeId: number; make: string | null } | null
      carModelMaster: { pkModelId: number; model: string | null } | null
    } | null
  }[]
}

const fmtDate = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'
// some legacy catalog rows carry placeholder text ("null", "na") instead of a real SQL NULL
const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)

function emptyForm(): InquiryFormInput {
  return {
    inquiryNo: '', dateOfInquiry: new Date().toISOString().slice(0, 10), website: '',
    customerId: null, customerNameLegacy: '', mobileno: '', email: '',
    budgetOfCustomer: null, visitedDateOfCustomer: '',
    classification: 'Warm', status: 'FollowUp', subStatus: '',
    followUpDate: '', remark: '', fkVariantId: null, carYear: null,
  }
}

export function InquiryClient({
  initialData, makes, total, page, pageCount, search, status, classification,
}: {
  initialData: InquiryRow[]
  makes: CarMakeMaster[]
  total: number
  page: number
  pageCount: number
  search: string
  status: string
  classification: string
}) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(search)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<InquiryFormInput>(emptyForm())
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const [emailingId, setEmailingId] = useState<number | null>(null)
  const [emailFeedback, setEmailFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [isEmailPending, startEmailTransition] = useTransition()

  const handleSendEmail = (inquiryId: number) => {
    setEmailingId(inquiryId)
    setEmailFeedback(null)
    startEmailTransition(async () => {
      const result = await sendInquiryEmail(inquiryId)
      setEmailFeedback(result.success
        ? { ok: true, message: 'Email sent successfully.' }
        : { ok: false, message: result.error ?? 'Something went wrong sending this email.' })
      setEmailingId(null)
    })
  }

  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [models, setModels] = useState<CarModelMaster[]>([])
  const [variants, setVariants] = useState<CarVariantMaster[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({ search, status, classification, page: '1', ...params })
    for (const [k, v] of [...q.entries()]) {
      if (!v || v === 'All') q.delete(k)
    }
    router.push(`/inquiry${q.toString() ? `?${q.toString()}` : ''}`)
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchInput === search) return
    debounceRef.current = setTimeout(() => pushQuery({ search: searchInput }), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const resetCascade = () => { setSelectedMakeId(null); setSelectedModelId(null); setModels([]); setVariants([]) }

  const openAdd = () => { setForm(emptyForm()); setSelectedCustomer(null); setEditId(null); resetCascade(); setError(''); setModal('add') }

  const openEdit = async (r: InquiryRow) => {
    const car = r.inquiryCarDetails[0]
    setForm({
      inquiryNo: r.inquiryNo ?? '',
      dateOfInquiry: fmtDate(r.dateOfInquiry),
      website: r.website ?? '',
      customerId: r.customerId,
      customerNameLegacy: r.customerNameLegacy ?? '',
      mobileno: r.mobileno ?? '',
      email: r.email ?? '',
      budgetOfCustomer: r.budgetOfCustomer ? Number(r.budgetOfCustomer) : null,
      visitedDateOfCustomer: fmtDate(r.visitedDateOfCustomer),
      classification: r.classification ?? 'Warm',
      status: r.status ?? 'FollowUp',
      subStatus: r.subStatus ?? '',
      followUpDate: fmtDate(r.followUpDate),
      remark: r.remark ?? '',
      fkVariantId: car?.fkVariantId ?? null,
      carYear: car?.year ?? null,
    })
    setSelectedCustomer(r.customer)
    setEditId(r.inquiryId)
    setError('')

    const makeId = car?.carVariantMaster?.carMakeMaster?.pkMakeId ?? null
    const modelId = car?.carVariantMaster?.carModelMaster?.pkModelId ?? null
    setSelectedMakeId(makeId)
    setSelectedModelId(modelId)
    setModels([]); setVariants([])
    if (makeId) {
      const res = await fetch(`/api/catalog/models?makeId=${makeId}`)
      setModels(await res.json())
    }
    if (modelId) {
      const res = await fetch(`/api/catalog/variants?modelId=${modelId}`)
      setVariants(await res.json())
    }
    setModal('edit')
  }

  const onMakeChange = async (makeId: number) => {
    setSelectedMakeId(makeId || null)
    setSelectedModelId(null)
    setVariants([])
    setForm(f => ({ ...f, fkVariantId: null }))
    if (!makeId) { setModels([]); return }
    const res = await fetch(`/api/catalog/models?makeId=${makeId}`)
    setModels(await res.json())
  }

  const onModelChange = async (modelId: number) => {
    setSelectedModelId(modelId || null)
    setForm(f => ({ ...f, fkVariantId: null }))
    if (!modelId) { setVariants([]); return }
    const res = await fetch(`/api/catalog/variants?modelId=${modelId}`)
    setVariants(await res.json())
  }

  const onCustomerChange = (c: CustomerOption | null) => {
    setSelectedCustomer(c)
    setForm(f => ({
      ...f,
      customerId: c?.custId ?? null,
      customerNameLegacy: c?.custName ?? f.customerNameLegacy,
      mobileno: c?.custMobile ?? f.mobileno,
      email: c?.custEmail ?? f.email,
    }))
  }

  const f = <K extends keyof InquiryFormInput>(k: K, v: InquiryFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateInquiry(editId, form) : await createInquiry(form)
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
      const result = await deleteInquiry(deleteId)
      if (!result.success) setError(result.error ?? 'Could not delete this record.')
      setDeleteId(null)
      router.refresh()
    })
  }

  return (
    <div>
      <PageHeader
        title="Inquiry Management"
        subtitle={`${total.toLocaleString('en-IN')} inquiries`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />New Inquiry</Btn>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Name, mobile, email, inquiry no..." />
        <div className="flex flex-wrap gap-1.5">
          {['All', ...INQUIRY_CLASSIFICATIONS].map(c => (
            <button key={c} onClick={() => pushQuery({ classification: c })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${classification === c || (classification === 'All' && c === 'All') ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={classification === c || (classification === 'All' && c === 'All') ? { backgroundColor: '#C8102E' } : {}}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['All', ...INQUIRY_STATUSES].map(s => (
            <button key={s} onClick={() => pushQuery({ status: s })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${status === s || (status === 'All' && s === 'All') ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={status === s || (status === 'All' && s === 'All') ? { backgroundColor: '#1B2A6B' } : {}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {emailFeedback && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${emailFeedback.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {emailFeedback.message}
        </div>
      )}

      <Table headers={['Date', 'Customer', 'Contact', 'Car of Interest', 'Budget', 'Classification', 'Status', 'Sub-status', 'Follow-up', 'Actions']} empty={initialData.length === 0}>
        {initialData.map(r => {
          const car = r.inquiryCarDetails[0]
          const name = r.customer?.custName ?? r.customerNameLegacy ?? '—'
          return (
            <tr key={r.inquiryId} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.dateOfInquiry) || '—'}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{name}</div>
                <div className="text-xs text-gray-500">{r.email ?? ''}</div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 text-sm text-gray-700 font-mono">
                  <Phone className="w-3 h-3 text-gray-400" />{r.mobileno ?? '—'}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {car?.carVariantMaster
                  ? [clean(car.carVariantMaster.carMakeMaster?.make), clean(car.carVariantMaster.carModelMaster?.model), clean(car.carVariantMaster.variant)]
                      .filter(Boolean).join(' ') + (car.year ? ` · ${car.year}` : '') || '—'
                  : '—'}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmtMoney(r.budgetOfCustomer)}</td>
              <td className="px-4 py-3">{r.classification ? <Badge label={r.classification} /> : '—'}</td>
              <td className="px-4 py-3">{r.status ? <Badge label={r.status} /> : '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={r.subStatus ?? ''}>{r.subStatus ?? '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.followUpDate) || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => handleSendEmail(r.inquiryId)} disabled={isEmailPending && emailingId === r.inquiryId}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition disabled:opacity-40" title="Send car details by email">
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(r.inquiryId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
          )
        })}
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

      <Modal title={editId ? 'Edit Inquiry' : 'New Inquiry'} open={!!modal} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Customer</label>
            <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={form.customerNameLegacy} onChange={e => f('customerNameLegacy', e.target.value)} />
            <Input label="Mobile" value={form.mobileno} onChange={e => f('mobileno', e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={e => f('email', e.target.value)} />
            <Input label="Inquiry No" value={form.inquiryNo} onChange={e => f('inquiryNo', e.target.value)} />
            <Input label="Inquiry Date" type="date" value={form.dateOfInquiry} onChange={e => f('dateOfInquiry', e.target.value)} />
            <Select label="Source" value={form.website} onChange={e => f('website', e.target.value)}>
              <option value="">Select Source</option>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select label="Make" value={selectedMakeId ?? ''} onChange={e => onMakeChange(Number(e.target.value))}>
              <option value="">Select Make</option>
              {makes.map(m => <option key={m.pkMakeId} value={m.pkMakeId}>{m.make}</option>)}
            </Select>
            <Select label="Model" value={selectedModelId ?? ''} onChange={e => onModelChange(Number(e.target.value))} disabled={!selectedMakeId}>
              <option value="">Select Model</option>
              {models.map(m => <option key={m.pkModelId} value={m.pkModelId}>{m.model}</option>)}
            </Select>
            <Select label="Variant" value={form.fkVariantId ?? ''} onChange={e => f('fkVariantId', Number(e.target.value) || null)} disabled={!selectedModelId}>
              <option value="">Select Variant</option>
              {variants.map(v => <option key={v.pkVariantId} value={v.pkVariantId}>{v.variant}</option>)}
            </Select>
            <Input label="Car Year" type="number" value={form.carYear ?? ''} onChange={e => f('carYear', e.target.value ? +e.target.value : null)} />
            <Input label="Budget (₹)" type="number" value={form.budgetOfCustomer ?? ''} onChange={e => f('budgetOfCustomer', e.target.value ? +e.target.value : null)} />
            <Input label="Visited Date" type="date" value={form.visitedDateOfCustomer} onChange={e => f('visitedDateOfCustomer', e.target.value)} />
            <Select label="Classification" value={form.classification} onChange={e => f('classification', e.target.value)}>
              {INQUIRY_CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Select label="Status" value={form.status} onChange={e => f('status', e.target.value)}>
              {INQUIRY_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Follow-up Date" type="date" value={form.followUpDate} onChange={e => f('followUpDate', e.target.value)} />
            <div>
              <Input label="Sub-status" list="sub-status-suggestions" value={form.subStatus} onChange={e => f('subStatus', e.target.value)} />
              <datalist id="sub-status-suggestions">
                {SUB_STATUS_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <Textarea label="Remarks" value={form.remark} onChange={e => f('remark', e.target.value)} placeholder="Notes about this inquiry..." />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Inquiry'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this inquiry record? This cannot be undone." />
    </div>
  )
}
