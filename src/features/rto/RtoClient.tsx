'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Car, IndianRupee } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { PartnerPicker } from '@/components/PartnerPicker'
import {
  createRto, updateRto, deleteRto, logRtoPayment,
  type RtoFormInput, type LogRtoPaymentInput,
} from './actions'
import { PAYMENT_STATUSES, RC_STATUSES, TRANSFER_STATUSES, CAR_TYPES } from './queries'

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface PartnerOption { partnerId: number; name: string; mobile: string | null; email: string | null }
interface Vehicle {
  inventoryId: number
  registrationNo: string | null
  sku: string | null
  year: number | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
}

interface RtoRow {
  rtoAgentMainId: number
  inventoryId: number | null
  customerId: number | null
  customerNameLegacy: string | null
  customerMobLegacy: string | null
  customerEmailLegacy: string | null
  carType: string | null
  carMakeLegacy: string | null
  carModelLegacy: string | null
  carVariantLegacy: string | null
  carYear: number | null
  carRegistrationNo: string | null
  dateOfEntry: Date | string | null
  transferCharges: string | null
  amtPaid: string | null
  paymentStatus: string | null
  paymentDate: Date | string | null
  rcStatus: string | null
  transferStatus: string | null
  followupDate: Date | string | null
  remark: string | null
  fkPartnerId: number | null
  customer: CustomerOption | null
  partnerMaster: PartnerOption | null
}

interface PaymentHistoryEntry {
  rtoPaymentId: number
  createdDt: string | null
  amountPaid: string | null
  paymentStatus: string | null
  rcStatus: string | null
  transferStatus: string | null
}
interface FollowupHistoryEntry {
  rtoFollowupId: number
  followupDate: string | null
  remark: string | null
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const fmtDate = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

function vehicleLabel(v: Vehicle) {
  const parts = [clean(v.carVariantMaster?.carMakeMaster?.make), clean(v.carVariantMaster?.carModelMaster?.model), clean(v.carVariantMaster?.variant)].filter(Boolean)
  return `${v.registrationNo ?? v.sku ?? '—'} — ${parts.join(' ')}`
}

function emptyForm(): RtoFormInput {
  return {
    partnerId: null, customerId: null, customerNameLegacy: '', customerMobLegacy: '', customerEmailLegacy: '',
    inventoryId: null, registrationNo: '', carType: 'PreOwned', carMakeLegacy: '', carModelLegacy: '', carVariantLegacy: '', carYear: null,
    dateOfEntry: new Date().toISOString().slice(0, 10),
    transferCharges: null,
    paymentStatus: 'Pending', paymentDate: '', rcStatus: 'Pending', transferStatus: 'Pending',
    followupDate: '', remark: '',
  }
}

function emptyPayment(): LogRtoPaymentInput {
  return { amountPaid: null, paymentStatus: 'Pending', rcStatus: 'Pending', transferStatus: 'Pending', nextFollowUpDate: '', remark: '' }
}

export function RtoClient({ initialData, vehicles }: { initialData: RtoRow[]; vehicles: Vehicle[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<RtoFormInput>(emptyForm())
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<PartnerOption | null>(null)
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const [payRow, setPayRow] = useState<RtoRow | null>(null)
  const [payForm, setPayForm] = useState<LogRtoPaymentInput>(emptyPayment())
  const [payments, setPayments] = useState<PaymentHistoryEntry[]>([])
  const [followups, setFollowups] = useState<FollowupHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(r => {
      const name = r.customer?.custName ?? r.customerNameLegacy ?? ''
      return !q || (r.carRegistrationNo ?? '').toLowerCase().includes(q) || name.toLowerCase().includes(q) || (r.partnerMaster?.name ?? '').toLowerCase().includes(q)
    })
  }, [data, search])

  const vehicleMatches = useMemo(() => {
    const q = vehicleQuery.toLowerCase()
    if (!q) return vehicles.slice(0, 20)
    return vehicles.filter(v => vehicleLabel(v).toLowerCase().includes(q)).slice(0, 20)
  }, [vehicles, vehicleQuery])

  const resetVehicle = () => { setSelectedVehicle(null); setVehicleQuery(''); setVehicleOpen(false) }

  const openAdd = () => {
    setForm(emptyForm())
    setSelectedCustomer(null)
    setSelectedAgent(null)
    resetVehicle()
    setEditId(null)
    setError('')
    setModal('add')
  }

  const openEdit = (r: RtoRow) => {
    setForm({
      partnerId: r.fkPartnerId,
      customerId: r.customerId,
      customerNameLegacy: r.customerNameLegacy ?? '', customerMobLegacy: r.customerMobLegacy ?? '', customerEmailLegacy: r.customerEmailLegacy ?? '',
      inventoryId: r.inventoryId,
      registrationNo: r.carRegistrationNo ?? '',
      carType: r.carType ?? 'PreOwned',
      carMakeLegacy: clean(r.carMakeLegacy), carModelLegacy: clean(r.carModelLegacy), carVariantLegacy: clean(r.carVariantLegacy), carYear: r.carYear,
      dateOfEntry: fmtDate(r.dateOfEntry),
      transferCharges: r.transferCharges ? Number(r.transferCharges) : null,
      paymentStatus: r.paymentStatus ?? 'Pending',
      paymentDate: fmtDate(r.paymentDate),
      rcStatus: r.rcStatus ?? 'Pending',
      transferStatus: r.transferStatus ?? 'Pending',
      followupDate: fmtDate(r.followupDate),
      remark: r.remark ?? '',
    })
    setSelectedCustomer(r.customer)
    setSelectedAgent(r.partnerMaster)
    setSelectedVehicle(vehicles.find(v => v.inventoryId === r.inventoryId) ?? null)
    setVehicleQuery('')
    setEditId(r.rtoAgentMainId)
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
      carMakeLegacy: clean(v.carVariantMaster?.carMakeMaster?.make),
      carModelLegacy: clean(v.carVariantMaster?.carModelMaster?.model),
      carVariantLegacy: clean(v.carVariantMaster?.variant),
      carYear: v.year,
      registrationNo: v.registrationNo ?? f.registrationNo,
    }))
  }

  const onCustomerChange = (c: CustomerOption | null) => {
    setSelectedCustomer(c)
    setForm(f => ({
      ...f,
      customerId: c?.custId ?? null,
      customerNameLegacy: c?.custName ?? f.customerNameLegacy,
      customerMobLegacy: c?.custMobile ?? f.customerMobLegacy,
      customerEmailLegacy: c?.custEmail ?? f.customerEmailLegacy,
    }))
  }

  const onAgentChange = (p: PartnerOption | null) => {
    setSelectedAgent(p)
    setForm(f => ({ ...f, partnerId: p?.partnerId ?? null }))
  }

  const f = <K extends keyof RtoFormInput>(k: K, v: RtoFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateRto(editId, form) : await createRto(form)
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
      const result = await deleteRto(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.rtoAgentMainId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  const openPay = async (r: RtoRow) => {
    setPayRow(r)
    setPayForm({
      ...emptyPayment(),
      paymentStatus: r.paymentStatus ?? 'Pending',
      rcStatus: r.rcStatus ?? 'Pending',
      transferStatus: r.transferStatus ?? 'Pending',
    })
    setError('')
    setPayments([]); setFollowups([])
    setHistoryLoading(true)
    const res = await fetch(`/api/rto/history?rtoAgentMainId=${r.rtoAgentMainId}`)
    const hist = await res.json()
    setPayments(hist.payments); setFollowups(hist.followups)
    setHistoryLoading(false)
  }

  const pf = <K extends keyof LogRtoPaymentInput>(k: K, v: LogRtoPaymentInput[K]) => setPayForm(prev => ({ ...prev, [k]: v }))

  const savePayment = () => {
    if (!payRow) return
    setError('')
    startTransition(async () => {
      const result = await logRtoPayment(payRow.rtoAgentMainId, payForm)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setPayRow(null)
      window.location.reload()
    })
  }

  return (
    <div>
      <PageHeader
        title="RTO Management"
        subtitle={`${filtered.length} transfer jobs`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add RTO Job</Btn>}
      />

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Reg no, customer, agent..." /></div>

      <Table headers={['Reg No', 'Customer', 'Agent', 'Charges', 'Paid', 'Payment', 'RC', 'Transfer', 'Follow-up', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.rtoAgentMainId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{r.carRegistrationNo ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{r.customer?.custName ?? r.customerNameLegacy ?? '—'}</div>
              <div className="text-xs text-gray-500 font-mono">{r.customerMobLegacy ?? ''}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">{r.partnerMaster?.name ?? '—'}</td>
            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmtMoney(r.transferCharges)}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.amtPaid)}</td>
            <td className="px-4 py-3">{r.paymentStatus ? <Badge label={r.paymentStatus} /> : '—'}</td>
            <td className="px-4 py-3">{r.rcStatus ? <Badge label={r.rcStatus} /> : '—'}</td>
            <td className="px-4 py-3">{r.transferStatus ? <Badge label={r.transferStatus} /> : '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.followupDate) || '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openPay(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Log Payment"><IndianRupee className="w-3.5 h-3.5" /></button>
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.rtoAgentMainId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal title={editId ? 'Edit RTO Job' : 'Add RTO Job'} open={!!modal} onClose={() => setModal(null)} width="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">RTO Agent *</label>
              <PartnerPicker partnerType="RTO Agent" label="Agent" value={selectedAgent} onChange={onAgentChange} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Customer</label>
              <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Vehicle (optional — link if from our stock)</label>
            {selectedVehicle ? (
              <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Car className="w-4 h-4 text-gray-400" />{vehicleLabel(selectedVehicle)}
                </div>
                <button type="button" onClick={() => { setSelectedVehicle(null); setForm(fm => ({ ...fm, inventoryId: null })) }} className="text-gray-400 hover:text-red-600">
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

          <div className="grid grid-cols-3 gap-4">
            <Select label="Car Type" value={form.carType} onChange={e => f('carType', e.target.value)}>
              {CAR_TYPES.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Input label="Make" value={form.carMakeLegacy} onChange={e => f('carMakeLegacy', e.target.value)} />
            <Input label="Model" value={form.carModelLegacy} onChange={e => f('carModelLegacy', e.target.value)} />
            <Input label="Variant" value={form.carVariantLegacy} onChange={e => f('carVariantLegacy', e.target.value)} />
            <Input label="Year" type="number" value={form.carYear ?? ''} onChange={e => f('carYear', e.target.value ? +e.target.value : null)} />
            <Input label="Registration No" value={form.registrationNo} onChange={e => f('registrationNo', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Entry Date" type="date" value={form.dateOfEntry} onChange={e => f('dateOfEntry', e.target.value)} />
            <Input label="Transfer Charges (₹)" type="number" value={form.transferCharges ?? ''} onChange={e => f('transferCharges', e.target.value ? +e.target.value : null)} />
            <Select label="Payment Status" value={form.paymentStatus} onChange={e => f('paymentStatus', e.target.value)}>
              {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Payment Date" type="date" value={form.paymentDate} onChange={e => f('paymentDate', e.target.value)} />
            <Select label="RC Status" value={form.rcStatus} onChange={e => f('rcStatus', e.target.value)}>
              {RC_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select label="Transfer Status" value={form.transferStatus} onChange={e => f('transferStatus', e.target.value)}>
              {TRANSFER_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Follow-up Date" type="date" value={form.followupDate} onChange={e => f('followupDate', e.target.value)} />
          </div>
          <Textarea label="Remark" value={form.remark} onChange={e => f('remark', e.target.value)} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save RTO Job'}</Btn>
          </div>
        </div>
      </Modal>

      <Modal title={`Log Payment${payRow ? ` — ${payRow.carRegistrationNo ?? ''}` : ''}`} open={!!payRow} onClose={() => setPayRow(null)}>
        {payRow && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1.5">Payment history</div>
              {historyLoading ? (
                <div className="text-xs text-gray-400">Loading...</div>
              ) : payments.length === 0 ? (
                <div className="text-xs text-gray-400">No payments logged yet.</div>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
                  {payments.map(p => (
                    <div key={p.rtoPaymentId} className="text-xs text-gray-600 flex gap-2 flex-wrap">
                      <span className="text-gray-400 whitespace-nowrap">{fmtDate(p.createdDt)}</span>
                      <span className="font-medium">{fmtMoney(p.amountPaid)}</span>
                      {p.paymentStatus && <Badge label={p.paymentStatus} />}
                      {p.rcStatus && <Badge label={p.rcStatus} />}
                      {p.transferStatus && <Badge label={p.transferStatus} />}
                    </div>
                  ))}
                </div>
              )}
              {followups.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  {followups.slice(0, 3).map(fu => (
                    <div key={fu.rtoFollowupId}>{fmtDate(fu.followupDate)} — {fu.remark ?? ''}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Amount Paid (₹) *" type="number" value={payForm.amountPaid ?? ''} onChange={e => pf('amountPaid', e.target.value ? +e.target.value : null)} />
              <Select label="Payment Status *" value={payForm.paymentStatus} onChange={e => pf('paymentStatus', e.target.value)}>
                {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Select label="RC Status *" value={payForm.rcStatus} onChange={e => pf('rcStatus', e.target.value)}>
                {RC_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Select label="Transfer Status *" value={payForm.transferStatus} onChange={e => pf('transferStatus', e.target.value)}>
                {TRANSFER_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Input label="Next Follow-up Date" type="date" value={payForm.nextFollowUpDate} onChange={e => pf('nextFollowUpDate', e.target.value)} />
            </div>
            <Textarea label="Remark" value={payForm.remark} onChange={e => pf('remark', e.target.value)} />

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => setPayRow(null)}>Cancel</Btn>
              <Btn onClick={savePayment} disabled={isPending}>{isPending ? 'Saving...' : 'Save Payment'}</Btn>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this RTO record? This cannot be undone." />
    </div>
  )
}
