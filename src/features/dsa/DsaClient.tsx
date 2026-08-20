'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Car } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { PartnerPicker } from '@/components/PartnerPicker'
import { createDsa, updateDsa, deleteDsa, type DsaFormInput } from './actions'
import { PAYMENT_STATUSES } from './queries'

interface PartnerOption { partnerId: number; name: string; mobile: string | null; email: string | null }
interface Vehicle {
  inventoryId: number
  registrationNo: string | null
  sku: string | null
  customerId: number | null
  customerName: string | null
  mobileNoOwnedBy: string | null
  emailIdOwnedBy: string | null
  fkVariantId: number | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
}

interface DsaRow {
  dsaMainId: number
  inventoryId: number | null
  dsaAgentName: string | null
  dsaAgentMobileNo: string | null
  dsaAgentEmail: string | null
  dsaBankName: string | null
  dsaEntryDate: Date | string | null
  customerId: number | null
  customerNameLegacy: string | null
  carModelLegacy: string | null
  carRegistrationNo: string | null
  loanAmount: string | null
  percentageOfPayout: string | null
  payoutAmount: string | null
  paymentStatus: string | null
  amountPaid: string | null
  remark: string | null
  fkPartnerId: number | null
  partnerMaster: PartnerOption | null
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

function vehicleLabel(v: Vehicle) {
  const parts = [clean(v.carVariantMaster?.carMakeMaster?.make), clean(v.carVariantMaster?.carModelMaster?.model), clean(v.carVariantMaster?.variant)].filter(Boolean)
  return `${v.registrationNo ?? v.sku ?? '—'} — ${parts.join(' ')}`
}

function emptyForm(): DsaFormInput {
  return {
    partnerId: null, dsaAgentName: '', dsaAgentMobileNo: '', dsaAgentEmail: '', dsaBankName: '',
    dsaEntryDate: new Date().toISOString().slice(0, 10),
    inventoryId: null, customerId: null, customerNameLegacy: '', carModelLegacy: '', carRegistrationNo: '', fkVariantId: null,
    loanAmount: null, percentageOfPayout: null, payoutAmount: null,
    paymentStatus: 'Pending', amountPaid: null, remark: '',
  }
}

export function DsaClient({ initialData, vehicles }: { initialData: DsaRow[]; vehicles: Vehicle[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<DsaFormInput>(emptyForm())
  const [selectedAgent, setSelectedAgent] = useState<PartnerOption | null>(null)
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
      return !q || (r.carRegistrationNo ?? '').toLowerCase().includes(q) || (r.customerNameLegacy ?? '').toLowerCase().includes(q) || (r.dsaAgentName ?? '').toLowerCase().includes(q)
    })
  }, [data, search])

  const vehicleMatches = useMemo(() => {
    const q = vehicleQuery.toLowerCase()
    if (!q) return vehicles.slice(0, 20)
    return vehicles.filter(v => vehicleLabel(v).toLowerCase().includes(q)).slice(0, 20)
  }, [vehicles, vehicleQuery])

  useEffect(() => {
    const pct = form.percentageOfPayout
    const amt = form.loanAmount
    if (pct != null && amt != null) {
      const computed = Math.round((amt * pct) / 100 * 100) / 100
      setForm(f => (f.payoutAmount === computed ? f : { ...f, payoutAmount: computed }))
    }
  }, [form.loanAmount, form.percentageOfPayout])

  const resetVehicle = () => { setSelectedVehicle(null); setVehicleQuery(''); setVehicleOpen(false) }

  const openAdd = () => {
    setForm(emptyForm())
    setSelectedAgent(null)
    resetVehicle()
    setEditId(null)
    setError('')
    setModal('add')
  }

  const openEdit = (r: DsaRow) => {
    setForm({
      partnerId: r.fkPartnerId,
      dsaAgentName: r.dsaAgentName ?? '', dsaAgentMobileNo: r.dsaAgentMobileNo ?? '', dsaAgentEmail: r.dsaAgentEmail ?? '',
      dsaBankName: r.dsaBankName ?? '',
      dsaEntryDate: r.dsaEntryDate ? new Date(r.dsaEntryDate).toISOString().slice(0, 10) : '',
      inventoryId: r.inventoryId,
      customerId: r.customerId, customerNameLegacy: r.customerNameLegacy ?? '',
      carModelLegacy: clean(r.carModelLegacy), carRegistrationNo: r.carRegistrationNo ?? '',
      fkVariantId: null,
      loanAmount: r.loanAmount ? Number(r.loanAmount) : null,
      percentageOfPayout: r.percentageOfPayout ? Number(r.percentageOfPayout) : null,
      payoutAmount: r.payoutAmount ? Number(r.payoutAmount) : null,
      paymentStatus: r.paymentStatus ?? 'Pending',
      amountPaid: r.amountPaid ? Number(r.amountPaid) : null,
      remark: r.remark ?? '',
    })
    setSelectedAgent(r.partnerMaster)
    setSelectedVehicle(vehicles.find(v => v.inventoryId === r.inventoryId) ?? null)
    setVehicleQuery('')
    setEditId(r.dsaMainId)
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
      customerId: v.customerId,
      customerNameLegacy: v.customerName ?? '',
      carModelLegacy: clean(v.carVariantMaster?.carModelMaster?.model),
      carRegistrationNo: v.registrationNo ?? '',
      fkVariantId: v.fkVariantId,
    }))
  }

  const onAgentChange = (p: PartnerOption | null) => {
    setSelectedAgent(p)
    setForm(f => ({
      ...f,
      partnerId: p?.partnerId ?? null,
      dsaAgentName: p?.name ?? f.dsaAgentName,
      dsaAgentMobileNo: p?.mobile ?? f.dsaAgentMobileNo,
      dsaAgentEmail: p?.email ?? f.dsaAgentEmail,
    }))
  }

  const f = <K extends keyof DsaFormInput>(k: K, v: DsaFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateDsa(editId, form) : await createDsa(form)
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
      const result = await deleteDsa(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.dsaMainId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  return (
    <div>
      <PageHeader
        title="DSA Management"
        subtitle={`${filtered.length} referral payouts`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add DSA Payout</Btn>}
      />

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Reg no, customer, agent..." /></div>

      <Table headers={['Reg No', 'Vehicle', 'Customer', 'Agent', 'Bank', 'Loan Amount', 'Payout', 'Paid', 'Status', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.dsaMainId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{r.carRegistrationNo ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{clean(r.carModelLegacy) || '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{r.customerNameLegacy ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{r.dsaAgentName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.dsaBankName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.loanAmount)}</td>
            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmtMoney(r.payoutAmount)}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.amountPaid)}</td>
            <td className="px-4 py-3">{r.paymentStatus ? <Badge label={r.paymentStatus} /> : '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.dsaMainId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal title={editId ? 'Edit DSA Payout' : 'Add DSA Payout'} open={!!modal} onClose={() => setModal(null)} width="max-w-3xl">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Vehicle *</label>
            {selectedVehicle ? (
              <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-800">
                    <Car className="w-4 h-4 text-gray-400" />{vehicleLabel(selectedVehicle)}
                  </div>
                  <button type="button" onClick={() => { resetVehicle(); setForm(fm => ({ ...fm, inventoryId: null, customerId: null, customerNameLegacy: '', carModelLegacy: '', carRegistrationNo: '', fkVariantId: null })) }} className="text-gray-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1">Customer: {form.customerNameLegacy || '—'}</div>
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

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">DSA Agent *</label>
            <PartnerPicker partnerType="DSA" label="Agent" value={selectedAgent} onChange={onAgentChange} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Agent Mobile" value={form.dsaAgentMobileNo} onChange={e => f('dsaAgentMobileNo', e.target.value)} />
            <Input label="Agent Email" value={form.dsaAgentEmail} onChange={e => f('dsaAgentEmail', e.target.value)} />
            <Input label="Bank Name" value={form.dsaBankName} onChange={e => f('dsaBankName', e.target.value)} placeholder="HDFC Bank, SBI..." />
            <Input label="Entry Date" type="date" value={form.dsaEntryDate} onChange={e => f('dsaEntryDate', e.target.value)} />
            <Input label="Loan Amount (₹)" type="number" value={form.loanAmount ?? ''} onChange={e => f('loanAmount', e.target.value ? +e.target.value : null)} />
            <Input label="Payout % of Loan" type="number" value={form.percentageOfPayout ?? ''} onChange={e => f('percentageOfPayout', e.target.value ? +e.target.value : null)} />
            <Input label="Payout Amount (auto)" value={form.payoutAmount != null ? `₹${form.payoutAmount.toLocaleString('en-IN')}` : ''} readOnly className="bg-gray-50" />
            <Select label="Payment Status" value={form.paymentStatus} onChange={e => f('paymentStatus', e.target.value)}>
              {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Amount Paid (₹)" type="number" value={form.amountPaid ?? ''} onChange={e => f('amountPaid', e.target.value ? +e.target.value : null)} />
          </div>
          <Textarea label="Remark" value={form.remark} onChange={e => f('remark', e.target.value)} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save DSA Payout'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this DSA record? This cannot be undone." />
    </div>
  )
}
