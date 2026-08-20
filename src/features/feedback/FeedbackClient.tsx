'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Car } from 'lucide-react'
import { Btn, Input, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { createFeedback, updateFeedback, deleteFeedback, type FeedbackFormInput } from './actions'
import { QUESTIONS } from './queries'

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface Vehicle {
  inventoryId: number
  registrationNo: string | null
  sku: string | null
  year: number | null
  fkVariantId: number | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
}

interface FeedbackRow {
  feedbackId: number
  customerId: number | null
  customerName: string | null
  customerMob: string | null
  customerEmail: string | null
  carMakeLegacy: string | null
  carModelLegacy: string | null
  carVariantLegacy: string | null
  carYear: number | null
  carRegistrationNo: string | null
  fkVariantId: number | null
  answer_1: string | null
  answer_2: string | null
  answer_3: string | null
  answer_4: string | null
  answer_5: string | null
  comments: string | null
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)

function vehicleLabel(v: Vehicle) {
  const parts = [clean(v.carVariantMaster?.carMakeMaster?.make), clean(v.carVariantMaster?.carModelMaster?.model), clean(v.carVariantMaster?.variant)].filter(Boolean)
  return `${v.registrationNo ?? v.sku ?? '—'} — ${parts.join(' ')}`
}

function emptyForm(): FeedbackFormInput {
  return {
    customerId: null, customerName: '', customerMob: '', customerEmail: '',
    carMakeLegacy: '', carModelLegacy: '', carVariantLegacy: '', carYear: null, carRegistrationNo: '', fkVariantId: null,
    answer_1: QUESTIONS[0].options[0], answer_2: QUESTIONS[1].options[0], answer_3: QUESTIONS[2].options[0],
    answer_4: QUESTIONS[3].options[0], answer_5: QUESTIONS[4].options[0],
    comments: '',
  }
}

export function FeedbackClient({ initialData, vehicles }: { initialData: FeedbackRow[]; vehicles: Vehicle[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<FeedbackFormInput>(emptyForm())
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(r => !q || (r.customerName ?? '').toLowerCase().includes(q) || (r.customerMob ?? '').includes(q) || (r.carRegistrationNo ?? '').toLowerCase().includes(q))
  }, [data, search])

  const vehicleMatches = useMemo(() => {
    const q = vehicleQuery.toLowerCase()
    if (!q) return vehicles.slice(0, 20)
    return vehicles.filter(v => vehicleLabel(v).toLowerCase().includes(q)).slice(0, 20)
  }, [vehicles, vehicleQuery])

  const resetVehicle = () => { setSelectedVehicle(null); setVehicleQuery(''); setVehicleOpen(false) }

  const openAdd = () => { setForm(emptyForm()); setSelectedCustomer(null); resetVehicle(); setEditId(null); setError(''); setModal('add') }
  const openEdit = (r: FeedbackRow) => {
    setForm({
      customerId: r.customerId, customerName: r.customerName ?? '', customerMob: r.customerMob ?? '', customerEmail: r.customerEmail ?? '',
      carMakeLegacy: clean(r.carMakeLegacy), carModelLegacy: clean(r.carModelLegacy), carVariantLegacy: clean(r.carVariantLegacy),
      carYear: r.carYear, carRegistrationNo: r.carRegistrationNo ?? '', fkVariantId: r.fkVariantId,
      answer_1: r.answer_1 ?? QUESTIONS[0].options[0], answer_2: r.answer_2 ?? QUESTIONS[1].options[0], answer_3: r.answer_3 ?? QUESTIONS[2].options[0],
      answer_4: r.answer_4 ?? QUESTIONS[3].options[0], answer_5: r.answer_5 ?? QUESTIONS[4].options[0],
      comments: r.comments ?? '',
    })
    setSelectedCustomer(r.customerId ? { custId: r.customerId, custName: r.customerName ?? '', custMobile: r.customerMob, custEmail: r.customerEmail } : null)
    setSelectedVehicle(vehicles.find(v => v.fkVariantId === r.fkVariantId) ?? null)
    setVehicleQuery('')
    setEditId(r.feedbackId)
    setError('')
    setModal('edit')
  }

  const selectVehicle = (v: Vehicle) => {
    setSelectedVehicle(v)
    setVehicleOpen(false)
    setVehicleQuery('')
    setForm(f => ({
      ...f,
      fkVariantId: v.fkVariantId,
      carMakeLegacy: clean(v.carVariantMaster?.carMakeMaster?.make),
      carModelLegacy: clean(v.carVariantMaster?.carModelMaster?.model),
      carVariantLegacy: clean(v.carVariantMaster?.variant),
      carYear: v.year,
      carRegistrationNo: v.registrationNo ?? f.carRegistrationNo,
    }))
  }

  const onCustomerChange = (c: CustomerOption | null) => {
    setSelectedCustomer(c)
    setForm(f => ({
      ...f,
      customerId: c?.custId ?? null,
      customerName: c?.custName ?? f.customerName,
      customerMob: c?.custMobile ?? f.customerMob,
      customerEmail: c?.custEmail ?? f.customerEmail,
    }))
  }

  const f = <K extends keyof FeedbackFormInput>(k: K, v: FeedbackFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateFeedback(editId, form) : await createFeedback(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setModal(null)
      window.location.reload()
    })
  }

  const del = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteFeedback(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.feedbackId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  return (
    <div>
      <PageHeader
        title="Customer Feedback"
        subtitle={`${filtered.length} responses`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Feedback</Btn>}
      />

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Customer, mobile, reg no..." /></div>

      <Table headers={['Customer', 'Contact', 'Vehicle', 'Satisfaction', 'Experience', 'Recommend', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.feedbackId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-medium text-gray-900">{r.customerName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{r.customerMob ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{[clean(r.carMakeLegacy), clean(r.carModelLegacy)].filter(Boolean).join(' ') || '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.answer_1 ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.answer_2 ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.answer_4 ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.feedbackId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal title={editId ? 'Edit Feedback' : 'Add Feedback'} open={!!modal} onClose={() => setModal(null)} width="max-w-3xl">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Customer</label>
            <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={form.customerName} onChange={e => f('customerName', e.target.value)} />
            <Input label="Mobile" value={form.customerMob} onChange={e => f('customerMob', e.target.value)} />
            <Input label="Email" type="email" value={form.customerEmail} onChange={e => f('customerEmail', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Vehicle (optional)</label>
            {selectedVehicle ? (
              <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Car className="w-4 h-4 text-gray-400" />{vehicleLabel(selectedVehicle)}
                </div>
                <button type="button" onClick={() => { resetVehicle(); setForm(fm => ({ ...fm, fkVariantId: null })) }} className="text-gray-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search our stock by reg no, make, model..."
                  value={vehicleQuery}
                  onChange={e => { setVehicleQuery(e.target.value); setVehicleOpen(true) }}
                  onFocus={() => setVehicleOpen(true)}
                />
                {vehicleOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {vehicleMatches.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
                    ) : vehicleMatches.map(v => (
                      <button key={v.inventoryId} type="button" onClick={() => selectVehicle(v)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        {vehicleLabel(v)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {QUESTIONS.map((q, i) => {
              const key = q.key as keyof FeedbackFormInput
              return (
                <div key={q.key} className="border border-gray-100 rounded-lg p-3">
                  <div className="text-sm text-gray-800 mb-2">{i + 1}. {q.text}</div>
                  <div className="flex flex-wrap gap-4">
                    {q.options.map(opt => (
                      <label key={opt} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                        <input type="radio" name={q.key} checked={form[key] === opt} onChange={() => f(key, opt as FeedbackFormInput[typeof key])} className="accent-[#1B2A6B]" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <Textarea label="Comments" value={form.comments} onChange={e => f('comments', e.target.value)} placeholder="Any suggestions, queries..." />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Feedback'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this feedback record? This cannot be undone." />
    </div>
  )
}
