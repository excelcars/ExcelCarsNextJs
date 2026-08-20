'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Car } from 'lucide-react'
import { Badge, Btn, Input, Select, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { createChecklist, updateChecklist, deleteChecklist, type ChecklistFormInput, type DocRow } from './actions'

const COMMON_DOCS = ['RC Book', 'Insurance', 'PUC Certificate', 'Road Tax', 'Hypothecation NOC', 'Service History', 'Spare Key', 'Form No 35']
const YES_NO = ['Yes', 'No'] as const

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }

interface Vehicle {
  inventoryId: number
  registrationNo: string | null
  sku: string | null
  colour: string | null
  year: number | null
  fuelType: string | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
}

interface ChecklistRow {
  documentId: number
  make: string | null
  model: string | null
  variant: string | null
  colour: string | null
  registrationNo: string | null
  year: number | null
  fuelType: string | null
  customerId: number | null
  customerNameLegacy: string | null
  customerMobileLegacy: string | null
  customerEmailLegacy: string | null
  inventoryId: number | null
  customer: CustomerOption | null
  checklistDocDetails: { checklistDetailsId: number; documentName: string | null; applicable: string | null; received: string | null; originalCopy: string | null }[]
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)

function vehicleLabel(v: Vehicle) {
  const parts = [clean(v.carVariantMaster?.carMakeMaster?.make), clean(v.carVariantMaster?.carModelMaster?.model), clean(v.carVariantMaster?.variant)].filter(Boolean)
  return `${v.registrationNo ?? v.sku ?? '—'} — ${parts.join(' ')}`
}

function emptyForm(): ChecklistFormInput {
  return {
    inventoryId: null, make: '', model: '', variant: '', colour: '', registrationNo: '', year: null, fuelType: '',
    customerId: null, customerNameLegacy: '', customerMobileLegacy: '', customerEmailLegacy: '',
    docs: COMMON_DOCS.map(name => ({ documentName: name, applicable: 'Yes', received: 'No', originalCopy: 'No' })),
  }
}

function computeStatus(docs: { applicable: string | null; received: string | null }[]) {
  const applicable = docs.filter(d => d.applicable === 'Yes')
  if (applicable.length === 0) return 'Partial'
  return applicable.every(d => d.received === 'Yes') ? 'Complete' : 'Partial'
}

export function ChecklistClient({ initialData, vehicles }: { initialData: ChecklistRow[]; vehicles: Vehicle[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<ChecklistFormInput>(emptyForm())
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
    return data.filter(r => {
      const name = r.customer?.custName ?? r.customerNameLegacy ?? ''
      return !q || (r.registrationNo ?? '').toLowerCase().includes(q) || name.toLowerCase().includes(q)
    })
  }, [data, search])

  const vehicleMatches = useMemo(() => {
    const q = vehicleQuery.toLowerCase()
    if (!q) return vehicles.slice(0, 20)
    return vehicles.filter(v => vehicleLabel(v).toLowerCase().includes(q)).slice(0, 20)
  }, [vehicles, vehicleQuery])

  const openAdd = () => {
    setForm(emptyForm())
    setSelectedCustomer(null)
    setSelectedVehicle(null)
    setVehicleQuery('')
    setEditId(null)
    setError('')
    setModal('add')
  }

  const openEdit = (r: ChecklistRow) => {
    setForm({
      inventoryId: r.inventoryId,
      make: r.make ?? '', model: r.model ?? '', variant: r.variant ?? '', colour: r.colour ?? '',
      registrationNo: r.registrationNo ?? '', year: r.year, fuelType: r.fuelType ?? '',
      customerId: r.customerId,
      customerNameLegacy: r.customerNameLegacy ?? '', customerMobileLegacy: r.customerMobileLegacy ?? '', customerEmailLegacy: r.customerEmailLegacy ?? '',
      docs: r.checklistDocDetails.length
        ? r.checklistDocDetails.map(d => ({ documentName: d.documentName ?? '', applicable: d.applicable ?? 'Yes', received: d.received ?? 'No', originalCopy: d.originalCopy ?? 'No' }))
        : emptyForm().docs,
    })
    setSelectedCustomer(r.customer)
    const v = vehicles.find(v => v.inventoryId === r.inventoryId) ?? null
    setSelectedVehicle(v)
    setVehicleQuery('')
    setEditId(r.documentId)
    setError('')
    setModal('edit')
  }

  const selectVehicle = (v: Vehicle) => {
    setSelectedVehicle(v)
    setVehicleOpen(false)
    setVehicleQuery('')
    setForm(f => ({
      ...f,
      inventoryId: v.inventoryId,
      make: clean(v.carVariantMaster?.carMakeMaster?.make),
      model: clean(v.carVariantMaster?.carModelMaster?.model),
      variant: clean(v.carVariantMaster?.variant),
      colour: v.colour ?? '',
      registrationNo: v.registrationNo ?? '',
      year: v.year,
      fuelType: v.fuelType ?? '',
    }))
  }

  const onCustomerChange = (c: CustomerOption | null) => {
    setSelectedCustomer(c)
    setForm(f => ({
      ...f,
      customerId: c?.custId ?? null,
      customerNameLegacy: c?.custName ?? f.customerNameLegacy,
      customerMobileLegacy: c?.custMobile ?? f.customerMobileLegacy,
      customerEmailLegacy: c?.custEmail ?? f.customerEmailLegacy,
    }))
  }

  const updateDoc = (i: number, patch: Partial<DocRow>) => {
    setForm(f => ({ ...f, docs: f.docs.map((d, idx) => idx === i ? { ...d, ...patch } : d) }))
  }
  const addDoc = () => setForm(f => ({ ...f, docs: [...f.docs, { documentName: '', applicable: 'Yes', received: 'No', originalCopy: 'No' }] }))
  const removeDoc = (i: number) => setForm(f => ({ ...f, docs: f.docs.filter((_, idx) => idx !== i) }))

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateChecklist(editId, form) : await createChecklist(form)
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
      const result = await deleteChecklist(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.documentId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  return (
    <div>
      <PageHeader
        title="Checklist / Documents"
        subtitle={`${filtered.length} vehicle checklists`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Checklist</Btn>}
      />

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Reg no, customer..." /></div>

      <Table headers={['Reg No', 'Vehicle', 'Customer', 'Documents', 'Status', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => {
          const status = computeStatus(r.checklistDocDetails)
          const received = r.checklistDocDetails.filter(d => d.received === 'Yes').length
          return (
            <tr key={r.documentId} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{r.registrationNo ?? '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{[clean(r.make), clean(r.model), clean(r.variant)].filter(Boolean).join(' ') || '—'}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{r.customer?.custName ?? r.customerNameLegacy ?? '—'}</div>
                <div className="text-xs text-gray-500 font-mono">{r.customerMobileLegacy ?? ''}</div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{received} / {r.checklistDocDetails.length} received</td>
              <td className="px-4 py-3"><Badge label={status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(r.documentId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
          )
        })}
      </Table>

      <Modal title={editId ? 'Edit Checklist' : 'Add Checklist'} open={!!modal} onClose={() => setModal(null)} width="max-w-3xl">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Vehicle *</label>
            {selectedVehicle ? (
              <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Car className="w-4 h-4 text-gray-400" />{vehicleLabel(selectedVehicle)}
                </div>
                <button type="button" onClick={() => { setSelectedVehicle(null); setForm(f => ({ ...f, inventoryId: null })) }} className="text-gray-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search by reg no, make, model..."
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

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Customer</label>
            <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Document Checklist</label>
              <Btn variant="outline" size="sm" onClick={addDoc}><Plus className="w-3.5 h-3.5" />Add Document</Btn>
            </div>
            <div className="space-y-2">
              {form.docs.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end border border-gray-100 rounded-lg p-2.5">
                  <Input label={i === 0 ? 'Document' : undefined} list="doc-name-suggestions" value={d.documentName} onChange={e => updateDoc(i, { documentName: e.target.value })} />
                  <Select label={i === 0 ? 'Applicable' : undefined} value={d.applicable} onChange={e => updateDoc(i, { applicable: e.target.value })}>
                    {YES_NO.map(o => <option key={o}>{o}</option>)}
                  </Select>
                  <Select label={i === 0 ? 'Received' : undefined} value={d.received} onChange={e => updateDoc(i, { received: e.target.value })}>
                    {YES_NO.map(o => <option key={o}>{o}</option>)}
                  </Select>
                  <Select label={i === 0 ? 'Original' : undefined} value={d.originalCopy} onChange={e => updateDoc(i, { originalCopy: e.target.value })}>
                    {YES_NO.map(o => <option key={o}>{o}</option>)}
                  </Select>
                  <button type="button" onClick={() => removeDoc(i)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <datalist id="doc-name-suggestions">
                {COMMON_DOCS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Checklist'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this checklist record? This cannot be undone." />
    </div>
  )
}
