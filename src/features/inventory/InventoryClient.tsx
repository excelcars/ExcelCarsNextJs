'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Eye, Mail, X } from 'lucide-react'
import { Badge, Btn, Input, Select, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { INVENTORY_STATUSES } from './queries'
import { createInventory, updateInventory, deleteInventory, sendInventoryEmail, type InventoryFormInput } from './actions'

interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }
interface Dealer { dealerId: number; dealerName: string | null; dealerEmail: string | null }
interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }

interface InventoryRow {
  inventoryId: number
  sku: string | null
  registrationNo: string | null
  year: number | null
  colour: string | null
  fuelType: string | null
  noOfOwners: number | null
  kmsDriven: string | null
  price: string | null
  status: string | null
  customerName: string | null
  otherRemarks: string | null
  fkVariantId: number | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { pkMakeId: number; make: string | null } | null
    carModelMaster: { pkModelId: number; model: string | null } | null
  } | null
}

const fmt = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

function emptyForm(): InventoryFormInput {
  return {
    registrationNo: '', fkVariantId: null, colour: '', year: new Date().getFullYear(),
    fuelType: '', noOfOwners: 1, kmsDriven: null, price: null, status: 'In Stock',
    customerName: '', otherRemarks: '',
  }
}

export function InventoryClient({ initialData, makes, dealers }: { initialData: InventoryRow[]; makes: CarMakeMaster[]; dealers: Dealer[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [modal, setModal] = useState<null | 'add' | 'edit' | 'view'>(null)
  const [form, setForm] = useState<InventoryFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [models, setModels] = useState<CarModelMaster[]>([])
  const [variants, setVariants] = useState<CarVariantMaster[]>([])
  const [viewRow, setViewRow] = useState<InventoryRow | null>(null)

  const [emailRow, setEmailRow] = useState<InventoryRow | null>(null)
  const [recipientType, setRecipientType] = useState<'dealer' | 'customer'>('customer')
  const [dealerQuery, setDealerQuery] = useState('')
  const [dealerOpen, setDealerOpen] = useState(false)
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [emailError, setEmailError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const dealerMatches = useMemo(() => {
    const q = dealerQuery.toLowerCase()
    const withEmail = dealers.filter(d => d.dealerEmail)
    if (!q) return withEmail.slice(0, 20)
    return withEmail.filter(d => (d.dealerName ?? '').toLowerCase().includes(q)).slice(0, 20)
  }, [dealers, dealerQuery])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(r => {
      const make = r.carVariantMaster?.carMakeMaster?.make ?? ''
      const model = r.carVariantMaster?.carModelMaster?.model ?? ''
      const matches = !q
        || (r.registrationNo ?? '').toLowerCase().includes(q)
        || (r.sku ?? '').toLowerCase().includes(q)
        || make.toLowerCase().includes(q)
        || model.toLowerCase().includes(q)
        || (r.customerName ?? '').toLowerCase().includes(q)
      return matches && (filterStatus === 'All' || r.status === filterStatus)
    })
  }, [data, search, filterStatus])

  const resetCascade = () => { setSelectedMakeId(null); setSelectedModelId(null); setModels([]); setVariants([]) }

  const openAdd = () => { setForm(emptyForm()); setEditId(null); resetCascade(); setError(''); setModal('add') }

  const openEdit = async (r: InventoryRow) => {
    setForm({
      registrationNo: r.registrationNo ?? '',
      fkVariantId: r.fkVariantId,
      colour: r.colour ?? '',
      year: r.year,
      fuelType: r.fuelType ?? '',
      noOfOwners: r.noOfOwners,
      kmsDriven: r.kmsDriven ? Number(r.kmsDriven) : null,
      price: r.price ? Number(r.price) : null,
      status: r.status ?? 'In Stock',
      customerName: r.customerName ?? '',
      otherRemarks: r.otherRemarks ?? '',
    })
    setEditId(r.inventoryId)
    setError('')

    const makeId = r.carVariantMaster?.carMakeMaster?.pkMakeId ?? null
    const modelId = r.carVariantMaster?.carModelMaster?.pkModelId ?? null
    setSelectedMakeId(makeId)
    setSelectedModelId(modelId)
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

  const openView = (r: InventoryRow) => { setViewRow(r); setModal('view') }

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

  const f = <K extends keyof InventoryFormInput>(k: K, v: InventoryFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const openEmail = (r: InventoryRow) => {
    setEmailRow(r)
    setRecipientType('customer')
    setSelectedDealer(null)
    setSelectedCustomer(null)
    setDealerQuery('')
    setEmailError('')
    setEmailSent(false)
  }

  const sendEmail = () => {
    if (!emailRow) return
    const recipientId = recipientType === 'dealer' ? selectedDealer?.dealerId : selectedCustomer?.custId
    if (!recipientId) {
      setEmailError(`Select a ${recipientType} to send to.`)
      return
    }
    setEmailError('')
    startTransition(async () => {
      const result = await sendInventoryEmail(emailRow.inventoryId, { recipientType, recipientId })
      if (!result.success) {
        setEmailError(result.error ?? 'Something went wrong sending this email.')
        return
      }
      setEmailSent(true)
    })
  }

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateInventory(editId, form) : await createInventory(form)
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
      const result = await deleteInventory(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.inventoryId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  return (
    <div>
      <PageHeader
        title="Inventory Management"
        subtitle={`${filtered.length} vehicles${filterStatus !== 'All' ? ` · ${filterStatus}` : ''}`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Vehicle</Btn>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search reg no, make, model, customer..." />
        <div className="flex flex-wrap gap-1.5">
          {['All', ...INVENTORY_STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterStatus === s ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={filterStatus === s ? { backgroundColor: '#1B2A6B' } : {}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <Table headers={['SKU', 'Reg No', 'Vehicle', 'Year', 'Fuel', 'KM', 'Price', 'Status', 'Customer', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.inventoryId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.sku ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{r.registrationNo ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">
                {r.carVariantMaster?.carMakeMaster?.make ?? '—'} {r.carVariantMaster?.carModelMaster?.model ?? ''}
              </div>
              <div className="text-xs text-gray-500">{r.carVariantMaster?.variant ?? ''} {r.colour ? `· ${r.colour}` : ''}</div>
            </td>
            <td className="px-4 py-3 text-gray-700">{r.year ?? '—'}</td>
            <td className="px-4 py-3 text-gray-700">{r.fuelType ?? '—'}</td>
            <td className="px-4 py-3 text-gray-700">{r.kmsDriven ? Number(r.kmsDriven).toLocaleString('en-IN') : '—'}</td>
            <td className="px-4 py-3 font-semibold text-gray-900">{fmt(r.price)}</td>
            <td className="px-4 py-3">{r.status ? <Badge label={r.status} /> : '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.customerName ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openView(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View"><Eye className="w-3.5 h-3.5" /></button>
                <button onClick={() => openEmail(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Send Email"><Mail className="w-3.5 h-3.5" /></button>
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.inventoryId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal title={modal === 'view' ? 'Vehicle Details' : editId ? 'Edit Vehicle' : 'Add New Vehicle'} open={!!modal} onClose={() => setModal(null)}>
        {modal === 'view' && viewRow ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['SKU', viewRow.sku], ['Reg No', viewRow.registrationNo],
              ['Make', viewRow.carVariantMaster?.carMakeMaster?.make], ['Model', viewRow.carVariantMaster?.carModelMaster?.model],
              ['Variant', viewRow.carVariantMaster?.variant], ['Year', viewRow.year], ['Colour', viewRow.colour], ['Fuel', viewRow.fuelType],
              ['Owners', viewRow.noOfOwners], ['KM Driven', viewRow.kmsDriven ? Number(viewRow.kmsDriven).toLocaleString('en-IN') : null],
              ['Price', fmt(viewRow.price)], ['Status', viewRow.status], ['Customer', viewRow.customerName], ['Remarks', viewRow.otherRemarks],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <div className="text-xs text-gray-400 mb-0.5">{k}</div>
                <div className="font-medium text-gray-800">{v != null && v !== '' ? String(v) : '—'}</div>
              </div>
            ))}
          </div>
        ) : modal ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Registration No *" value={form.registrationNo} onChange={e => f('registrationNo', e.target.value)} placeholder="MH12AB1234" />
              <Select label="Status" value={form.status} onChange={e => f('status', e.target.value)}>
                {INVENTORY_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Select label="Make *" value={selectedMakeId ?? ''} onChange={e => onMakeChange(Number(e.target.value))}>
                <option value="">Select Make</option>
                {makes.map(m => <option key={m.pkMakeId} value={m.pkMakeId}>{m.make}</option>)}
              </Select>
              <Select label="Model *" value={selectedModelId ?? ''} onChange={e => onModelChange(Number(e.target.value))} disabled={!selectedMakeId}>
                <option value="">Select Model</option>
                {models.map(m => <option key={m.pkModelId} value={m.pkModelId}>{m.model}</option>)}
              </Select>
              <Select label="Variant *" value={form.fkVariantId ?? ''} onChange={e => f('fkVariantId', Number(e.target.value) || null)} disabled={!selectedModelId}>
                <option value="">Select Variant</option>
                {variants.map(v => <option key={v.pkVariantId} value={v.pkVariantId}>{v.variant}</option>)}
              </Select>
              <Input label="Year" type="number" value={form.year ?? ''} onChange={e => f('year', e.target.value ? +e.target.value : null)} />
              <Input label="Colour" value={form.colour} onChange={e => f('colour', e.target.value)} />
              <Input label="Fuel Type" value={form.fuelType} onChange={e => f('fuelType', e.target.value)} placeholder="Petrol / Diesel / CNG" />
              <Input label="No. of Owners" type="number" value={form.noOfOwners ?? ''} onChange={e => f('noOfOwners', e.target.value ? +e.target.value : null)} />
              <Input label="KM Driven" type="number" value={form.kmsDriven ?? ''} onChange={e => f('kmsDriven', e.target.value ? +e.target.value : null)} />
              <Input label="Price (₹)" type="number" value={form.price ?? ''} onChange={e => f('price', e.target.value ? +e.target.value : null)} />
              <Input label="Customer / Source" value={form.customerName} onChange={e => f('customerName', e.target.value)} />
            </div>
            <Input label="Remarks" value={form.otherRemarks} onChange={e => f('otherRemarks', e.target.value)} />

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Vehicle'}</Btn>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="This will permanently delete the vehicle record. This action cannot be undone."
      />

      <Modal title={`Send Car Details${emailRow ? ` — ${emailRow.registrationNo ?? emailRow.sku ?? ''}` : ''}`} open={!!emailRow} onClose={() => setEmailRow(null)}>
        {emailRow && (
          emailSent ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">Email sent successfully.</div>
              <div className="flex justify-end"><Btn onClick={() => setEmailRow(null)}>Close</Btn></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-1.5">
                {(['customer', 'dealer'] as const).map(t => (
                  <button key={t} onClick={() => setRecipientType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${recipientType === t ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    style={recipientType === t ? { backgroundColor: '#1B2A6B' } : {}}>
                    {t}
                  </button>
                ))}
              </div>

              {recipientType === 'customer' ? (
                <CustomerPicker value={selectedCustomer} onChange={setSelectedCustomer} />
              ) : (
                <div className="relative">
                  {selectedDealer ? (
                    <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{selectedDealer.dealerName}</div>
                        <div className="text-xs text-gray-500">{selectedDealer.dealerEmail}</div>
                      </div>
                      <button type="button" onClick={() => setSelectedDealer(null)} className="text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <Input
                        placeholder="Search dealers with an email on file..."
                        value={dealerQuery}
                        onChange={e => { setDealerQuery(e.target.value); setDealerOpen(true) }}
                        onFocus={() => setDealerOpen(true)}
                      />
                      {dealerOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {dealerMatches.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
                          ) : dealerMatches.map(d => (
                            <button key={d.dealerId} type="button"
                              onClick={() => { setSelectedDealer(d); setDealerOpen(false); setDealerQuery('') }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                              <div className="font-medium text-gray-800">{d.dealerName}</div>
                              <div className="text-xs text-gray-500">{d.dealerEmail}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {emailError && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{emailError}</div>}

              <div className="flex gap-3 justify-end pt-2">
                <Btn variant="outline" onClick={() => setEmailRow(null)}>Cancel</Btn>
                <Btn onClick={sendEmail} disabled={isPending}>{isPending ? 'Sending...' : 'Send Email'}</Btn>
              </div>
            </div>
          )
        )}
      </Modal>
    </div>
  )
}
