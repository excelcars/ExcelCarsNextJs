'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Car, IndianRupee } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { PartnerPicker } from '@/components/PartnerPicker'
import {
  createInsurance, updateInsurance, deleteInsurance, logInsurancePayment,
  type InsuranceFormInput, type LogPaymentInput,
} from './actions'
import { PAYOUT_STATUSES, POLICY_STATUSES, CAR_TYPES } from './queries'

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

interface InsuranceRow {
  insuranceMainId: number
  inventoryId: number | null
  customerId: number | null
  customerNameLegacy: string | null
  customerMobileLegacy: string | null
  customerEmailLegacy: string | null
  carType: string | null
  carMakeLegacy: string | null
  carModelLegacy: string | null
  carVariantLegacy: string | null
  carYear: number | null
  carRegistrationNo: string | null
  entryDate: Date | string | null
  renewalDate: Date | string | null
  expiryDate: Date | string | null
  insurancePremium: string | null
  oDPremium: string | null
  payoutPercentageOdPremium: string | null
  payoutAmount: string | null
  totalAmountReceived: string | null
  payoutPaymentStatus: string | null
  policyStatus: string | null
  followupDate: Date | string | null
  remark: string | null
  fkPartnerId: number | null
  customer: CustomerOption | null
  partnerMaster: PartnerOption | null
}

interface PaymentHistoryEntry {
  insurancePaymentId: number
  createdDt: string | null
  amountReceived: string | null
  payoutAmount: string | null
  payoutPaymentStatus: string | null
  policyStatus: string | null
}
interface FollowupHistoryEntry {
  insuranceFollowupId: number
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

function emptyForm(): InsuranceFormInput {
  return {
    agentPartnerId: null, customerId: null, customerNameLegacy: '', customerMobileLegacy: '', customerEmailLegacy: '',
    inventoryId: null, carType: 'PreOwned', carMakeLegacy: '', carModelLegacy: '', carVariantLegacy: '', carYear: null, carRegistrationNo: '',
    entryDate: new Date().toISOString().slice(0, 10),
    insurancePremium: null, oDPremium: null, payoutPercentageOdPremium: null, payoutAmount: null,
    payoutPaymentStatus: 'Pending', policyStatus: 'Pending',
    renewalDate: '', expiryDate: '', followupDate: '', remark: '',
  }
}

function emptyPayment(): LogPaymentInput {
  return { amountReceived: null, payoutPaymentStatus: 'Pending', policyStatus: 'Pending', nextFollowUpDate: '', remark: '' }
}

export function InsuranceClient({ initialData, vehicles }: { initialData: InsuranceRow[]; vehicles: Vehicle[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<InsuranceFormInput>(emptyForm())
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<PartnerOption | null>(null)
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const [payRow, setPayRow] = useState<InsuranceRow | null>(null)
  const [payForm, setPayForm] = useState<LogPaymentInput>(emptyPayment())
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

  useEffect(() => {
    const pct = form.payoutPercentageOdPremium
    const od = form.oDPremium
    if (pct != null && od != null) {
      const computed = Math.round((od * pct) / 100 * 100) / 100
      setForm(f => (f.payoutAmount === computed ? f : { ...f, payoutAmount: computed }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.oDPremium, form.payoutPercentageOdPremium])

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

  const openEdit = (r: InsuranceRow) => {
    setForm({
      agentPartnerId: r.fkPartnerId,
      customerId: r.customerId,
      customerNameLegacy: r.customerNameLegacy ?? '', customerMobileLegacy: r.customerMobileLegacy ?? '', customerEmailLegacy: r.customerEmailLegacy ?? '',
      inventoryId: r.inventoryId,
      carType: r.carType ?? 'PreOwned',
      carMakeLegacy: clean(r.carMakeLegacy), carModelLegacy: clean(r.carModelLegacy), carVariantLegacy: clean(r.carVariantLegacy),
      carYear: r.carYear, carRegistrationNo: r.carRegistrationNo ?? '',
      entryDate: fmtDate(r.entryDate),
      insurancePremium: r.insurancePremium ? Number(r.insurancePremium) : null,
      oDPremium: r.oDPremium ? Number(r.oDPremium) : null,
      payoutPercentageOdPremium: r.payoutPercentageOdPremium ? Number(r.payoutPercentageOdPremium) : null,
      payoutAmount: r.payoutAmount ? Number(r.payoutAmount) : null,
      payoutPaymentStatus: r.payoutPaymentStatus ?? 'Pending',
      policyStatus: r.policyStatus ?? 'Pending',
      renewalDate: fmtDate(r.renewalDate), expiryDate: fmtDate(r.expiryDate), followupDate: fmtDate(r.followupDate),
      remark: r.remark ?? '',
    })
    setSelectedCustomer(r.customer)
    setSelectedAgent(r.partnerMaster)
    setSelectedVehicle(vehicles.find(v => v.inventoryId === r.inventoryId) ?? null)
    setVehicleQuery('')
    setEditId(r.insuranceMainId)
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
      carRegistrationNo: v.registrationNo ?? f.carRegistrationNo,
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

  const onAgentChange = (p: PartnerOption | null) => {
    setSelectedAgent(p)
    setForm(f => ({ ...f, agentPartnerId: p?.partnerId ?? null }))
  }

  const f = <K extends keyof InsuranceFormInput>(k: K, v: InsuranceFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateInsurance(editId, form) : await createInsurance(form)
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
      const result = await deleteInsurance(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.insuranceMainId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  const openPay = async (r: InsuranceRow) => {
    setPayRow(r)
    setPayForm({ ...emptyPayment(), payoutPaymentStatus: r.payoutPaymentStatus ?? 'Pending', policyStatus: r.policyStatus ?? 'Pending' })
    setError('')
    setPayments([]); setFollowups([])
    setHistoryLoading(true)
    const res = await fetch(`/api/insurance/history?insuranceMainId=${r.insuranceMainId}`)
    const hist = await res.json()
    setPayments(hist.payments); setFollowups(hist.followups)
    setHistoryLoading(false)
  }

  const pf = <K extends keyof LogPaymentInput>(k: K, v: LogPaymentInput[K]) => setPayForm(prev => ({ ...prev, [k]: v }))

  const savePayment = () => {
    if (!payRow) return
    setError('')
    startTransition(async () => {
      const result = await logInsurancePayment(payRow.insuranceMainId, payForm)
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
        title="Insurance Management"
        subtitle={`${filtered.length} referral policies`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Insurance</Btn>}
      />

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Reg no, customer, agent..." /></div>

      <Table headers={['Reg No', 'Customer', 'Agent', 'Premium / OD', 'Payout', 'Received', 'Payout Status', 'Policy Status', 'Renewal / Expiry', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.insuranceMainId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{r.carRegistrationNo ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{r.customer?.custName ?? r.customerNameLegacy ?? '—'}</div>
              <div className="text-xs text-gray-500 font-mono">{r.customerMobileLegacy ?? ''}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">{r.partnerMaster?.name ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.insurancePremium)} / {fmtMoney(r.oDPremium)}</td>
            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmtMoney(r.payoutAmount)}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.totalAmountReceived)}</td>
            <td className="px-4 py-3">{r.payoutPaymentStatus ? <Badge label={r.payoutPaymentStatus} /> : '—'}</td>
            <td className="px-4 py-3">{r.policyStatus ? <Badge label={r.policyStatus} /> : '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.renewalDate) || '—'} / {fmtDate(r.expiryDate) || '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openPay(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Log Payment"><IndianRupee className="w-3.5 h-3.5" /></button>
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.insuranceMainId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal title={editId ? 'Edit Insurance' : 'Add Insurance'} open={!!modal} onClose={() => setModal(null)} width="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Insurance Agent *</label>
              <PartnerPicker partnerType="Insurance Agent" label="Agent" value={selectedAgent} onChange={onAgentChange} />
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
            <Input label="Registration No" value={form.carRegistrationNo} onChange={e => f('carRegistrationNo', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Entry Date" type="date" value={form.entryDate} onChange={e => f('entryDate', e.target.value)} />
            <Input label="Insurance Premium (₹)" type="number" value={form.insurancePremium ?? ''} onChange={e => f('insurancePremium', e.target.value ? +e.target.value : null)} />
            <Input label="O.D. Premium (₹)" type="number" value={form.oDPremium ?? ''} onChange={e => f('oDPremium', e.target.value ? +e.target.value : null)} />
            <Input label="Payout % of OD Premium" type="number" value={form.payoutPercentageOdPremium ?? ''} onChange={e => f('payoutPercentageOdPremium', e.target.value ? +e.target.value : null)} />
            <Input label="Payout Amount (auto)" value={form.payoutAmount != null ? `₹${form.payoutAmount.toLocaleString('en-IN')}` : ''} readOnly className="bg-gray-50" />
            <Select label="Payout Status" value={form.payoutPaymentStatus} onChange={e => f('payoutPaymentStatus', e.target.value)}>
              {PAYOUT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select label="Policy Status" value={form.policyStatus} onChange={e => f('policyStatus', e.target.value)}>
              {POLICY_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Renewal Date" type="date" value={form.renewalDate} onChange={e => f('renewalDate', e.target.value)} />
            <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={e => f('expiryDate', e.target.value)} />
            <Input label="Follow-up Date" type="date" value={form.followupDate} onChange={e => f('followupDate', e.target.value)} />
          </div>
          <Textarea label="Remark" value={form.remark} onChange={e => f('remark', e.target.value)} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Insurance'}</Btn>
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
                    <div key={p.insurancePaymentId} className="text-xs text-gray-600 flex gap-2">
                      <span className="text-gray-400 whitespace-nowrap">{fmtDate(p.createdDt)}</span>
                      <span className="font-medium">{fmtMoney(p.amountReceived)}</span>
                      {p.payoutPaymentStatus && <Badge label={p.payoutPaymentStatus} />}
                      {p.policyStatus && <Badge label={p.policyStatus} />}
                    </div>
                  ))}
                </div>
              )}
              {followups.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  {followups.slice(0, 3).map(fu => (
                    <div key={fu.insuranceFollowupId}>{fmtDate(fu.followupDate)} — {fu.remark ?? ''}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Amount Received (₹) *" type="number" value={payForm.amountReceived ?? ''} onChange={e => pf('amountReceived', e.target.value ? +e.target.value : null)} />
              <Select label="Payout Status *" value={payForm.payoutPaymentStatus} onChange={e => pf('payoutPaymentStatus', e.target.value)}>
                {PAYOUT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Select label="Policy Status *" value={payForm.policyStatus} onChange={e => pf('policyStatus', e.target.value)}>
                {POLICY_STATUSES.map(s => <option key={s}>{s}</option>)}
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
        message="Delete this insurance record? This cannot be undone." />
    </div>
  )
}
