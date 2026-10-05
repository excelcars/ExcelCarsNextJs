'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Car, Eye, Download } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { PartnerPicker } from '@/components/PartnerPicker'
import { createDsa, updateDsa, deleteDsa, type DsaFormInput } from './actions'
import { PAYMENT_STATUSES } from './queries'
import { isValidEmail, isValidPhone } from '@/lib/validation'

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
  fkVariantId: number | null
  createdByUser: { userName: string | null; displayName: string | null } | null
  updatedByUser: { userName: string | null; displayName: string | null } | null
  createdDate: Date | string | null
  updatedDate: Date | string | null
  customer: { custName: string; custMobile: string | null; custEmail: string | null } | null
  inventoryManagement: {
    inventoryId: number
    registrationNo: string | null
    sku: string | null
    year: number | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { make: string | null } | null
      carModelMaster: { model: string | null } | null
    } | null
  } | null
}

interface DsaFilters {
  search: string
  registrationNo: string
  customerName: string
  agentName: string
  bankName: string
  paymentStatus: string
  fromDate: string
  toDate: string
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const fmtDate = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''
const fmtDateTime = (d: Date | string | null) => d ? new Date(d).toLocaleString('en-IN') : ''
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

function csvValue(value: string | number | boolean | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function optionSnapshot<T extends object | null>(value: T) {
  return value
    ? JSON.stringify(
        Object.keys(value as object)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = (value as Record<string, unknown>)[key]
            return acc
          }, {}),
      )
    : ''
}

function vehicleLabel(v: Vehicle) {
  const parts = [clean(v.carVariantMaster?.carMakeMaster?.make), clean(v.carVariantMaster?.carModelMaster?.model), clean(v.carVariantMaster?.variant)].filter(Boolean)
  return `${v.registrationNo ?? v.sku ?? '—'} — ${parts.join(' ')}`
}

function getVehicleLabel(r: DsaRow) {
  if (r.inventoryManagement) {
    const parts = [
      clean(r.inventoryManagement.carVariantMaster?.carMakeMaster?.make),
      clean(r.inventoryManagement.carVariantMaster?.carModelMaster?.model),
      clean(r.inventoryManagement.carVariantMaster?.variant),
    ].filter(Boolean)
    return parts.join(' ') || r.carModelLegacy || '—'
  }
  return r.carModelLegacy || '—'
}

const normalizeRegistrationNo = (value: string | null | undefined) => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '')

function buildDsaExportFileName(rows: DsaRow[], filters: DsaFilters) {
  const today = new Date().toISOString().slice(0, 10)
  const hasFilters = Object.values(filters).some(v => v && v !== 'All')
  const parts = ['dsa']
  if (hasFilters) parts.push('filtered')
  if (!hasFilters) parts.push(`${rows.length}-rows`)
  parts.push(today)
  return `${parts.map(slugify).filter(Boolean).join('-')}.csv`
}

function exportDsaCsv(rows: DsaRow[], filters: DsaFilters) {
  const headers = [
    'DSA Main ID',
    'Linked Inventory ID',
    'Linked Agent ID',
    'Linked Customer ID',
    'Linked Variant ID',
    'Entry Date',
    'Agent Name',
    'Agent Mobile',
    'Agent Email',
    'Bank Name',
    'Customer Name',
    'Vehicle Model',
    'Registration No',
    'Loan Amount',
    'Payout %',
    'Payout Amount',
    'Payment Status',
    'Amount Paid',
    'Remark',
  ]

  const lines = [headers.map(csvValue).join(',')]
  for (const row of rows) {
    lines.push([
      row.dsaMainId,
      row.inventoryId,
      row.fkPartnerId,
      row.customerId,
      row.fkVariantId,
      fmtDate(row.dsaEntryDate),
      row.dsaAgentName,
      row.dsaAgentMobileNo,
      row.dsaAgentEmail,
      row.dsaBankName,
      row.customerNameLegacy,
      getVehicleLabel(row),
      row.carRegistrationNo,
      row.loanAmount,
      row.percentageOfPayout,
      row.payoutAmount,
      row.paymentStatus,
      row.amountPaid,
      row.remark,
    ].map(csvValue).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildDsaExportFileName(rows, filters)
  link.click()
  URL.revokeObjectURL(url)
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

function emptyFilters(): DsaFilters {
  return {
    search: '',
    registrationNo: '',
    customerName: '',
    agentName: '',
    bankName: '',
    paymentStatus: 'All',
    fromDate: '',
    toDate: '',
  }
}

export function DsaClient({ initialData, vehicles }: { initialData: DsaRow[]; vehicles: Vehicle[] }) {
  const [data, setData] = useState(initialData)
  const [filters, setFilters] = useState<DsaFilters>(emptyFilters())
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [viewRow, setViewRow] = useState<DsaRow | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [vehicleLookupMessage, setVehicleLookupMessage] = useState('')
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(JSON.stringify(emptyForm()))
  const [savedAgentSnapshot, setSavedAgentSnapshot] = useState('')
  const [savedVehicleSnapshot, setSavedVehicleSnapshot] = useState('')
  const [form, setForm] = useState<DsaFormInput>(emptyForm())
  const [selectedAgent, setSelectedAgent] = useState<PartnerOption | null>(null)
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()
  const [isExporting, startExportTransition] = useTransition()
  const [exportError, setExportError] = useState('')

  const hasUnsavedChanges = useMemo(() => {
    if (!modal) return false
    return (
      JSON.stringify(form) !== savedFormSnapshot ||
      optionSnapshot(selectedAgent) !== savedAgentSnapshot ||
      optionSnapshot(selectedVehicle) !== savedVehicleSnapshot
    )
  }, [
    form,
    modal,
    savedAgentSnapshot,
    savedFormSnapshot,
    savedVehicleSnapshot,
    selectedAgent,
    selectedVehicle,
  ])

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return data.filter(r => {
      const reg = clean(r.carRegistrationNo)
      const cust = clean(r.customerNameLegacy)
      const agent = clean(r.dsaAgentName)
      const bank = clean(r.dsaBankName)
      const entryDate = fmtDate(r.dsaEntryDate)

      if (q && !reg.toLowerCase().includes(q) && !cust.toLowerCase().includes(q) && !agent.toLowerCase().includes(q)) return false

      if (filters.registrationNo && !reg.toLowerCase().includes(filters.registrationNo.toLowerCase())) return false
      if (filters.customerName && !cust.toLowerCase().includes(filters.customerName.toLowerCase())) return false
      if (filters.agentName && !agent.toLowerCase().includes(filters.agentName.toLowerCase())) return false
      if (filters.bankName && !bank.toLowerCase().includes(filters.bankName.toLowerCase())) return false
      if (filters.paymentStatus !== 'All' && (r.paymentStatus ?? '') !== filters.paymentStatus) return false
      if (filters.fromDate && (!entryDate || entryDate < filters.fromDate)) return false
      if (filters.toDate && (!entryDate || entryDate > filters.toDate)) return false

      return true
    })
  }, [data, filters])

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

  const closeForm = () => {
    setModal(null)
    setDiscardOpen(false)
    setError('')
    setErrors({})
  }

  const requestCloseForm = () => {
    if (isPending) return
    if (hasUnsavedChanges) {
      setDiscardOpen(true)
      return
    }
    closeForm()
  }

  const findVehicleByRegistration = () => {
    const reg = form.carRegistrationNo.trim()
    if (!reg) {
      setVehicleLookupMessage('Enter a registration number first.')
      return
    }

    const match = vehicles.find(v => normalizeRegistrationNo(v.registrationNo) === normalizeRegistrationNo(reg))
    if (!match) {
      setVehicleLookupMessage('No stock vehicle matched that registration number. You can still continue manually.')
      return
    }

    selectVehicle(match)
    setVehicleLookupMessage(`Linked stock vehicle ${match.registrationNo ?? match.sku ?? `#${match.inventoryId}`}.`)
  }

  const openAdd = () => {
    const empty = emptyForm()
    setForm(empty)
    setSelectedAgent(null)
    resetVehicle()
    setEditId(null)
    setError('')
    setSavedFormSnapshot(JSON.stringify(empty))
    setSavedAgentSnapshot(optionSnapshot(null))
    setSavedVehicleSnapshot(optionSnapshot(null))
    setVehicleLookupMessage('')
    setModal('add')
  }

  const openEdit = (r: DsaRow) => {
    const editForm = {
      partnerId: r.fkPartnerId,
      dsaAgentName: r.dsaAgentName ?? '', dsaAgentMobileNo: r.dsaAgentMobileNo ?? '', dsaAgentEmail: r.dsaAgentEmail ?? '',
      dsaBankName: r.dsaBankName ?? '',
      dsaEntryDate: r.dsaEntryDate ? new Date(r.dsaEntryDate).toISOString().slice(0, 10) : '',
      inventoryId: r.inventoryId,
      customerId: r.customerId, customerNameLegacy: r.customerNameLegacy ?? '',
      carModelLegacy: clean(r.carModelLegacy), carRegistrationNo: r.carRegistrationNo ?? '',
      fkVariantId: r.fkVariantId,
      loanAmount: r.loanAmount ? Number(r.loanAmount) : null,
      percentageOfPayout: r.percentageOfPayout ? Number(r.percentageOfPayout) : null,
      payoutAmount: r.payoutAmount ? Number(r.payoutAmount) : null,
      paymentStatus: r.paymentStatus ?? 'Pending',
      amountPaid: r.amountPaid ? Number(r.amountPaid) : null,
      remark: r.remark ?? '',
    }
    setForm(editForm)
    const agent = r.partnerMaster
    const veh = vehicles.find(v => v.inventoryId === r.inventoryId) ?? null
    setSelectedAgent(agent)
    setSelectedVehicle(veh)
    setVehicleQuery('')
    setEditId(r.dsaMainId)
    setError('')
    setSavedFormSnapshot(JSON.stringify(editForm))
    setSavedAgentSnapshot(optionSnapshot(agent))
    setSavedVehicleSnapshot(optionSnapshot(veh))
    setVehicleLookupMessage('')
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
  const setFilter = <K extends keyof DsaFilters>(k: K, v: DsaFilters[K]) => setFilters(prev => ({ ...prev, [k]: v }))
  const resetFilters = () => setFilters(emptyFilters())

  const save = () => {
    setError('')
    const newErrors: Record<string, boolean> = {}

    if (!form.inventoryId) {
      newErrors.inventoryId = true
    }
    if (!form.partnerId) {
      newErrors.partnerId = true
    }
    if (!form.carRegistrationNo?.trim()) {
      newErrors.carRegistrationNo = true
    }
    if (!form.dsaBankName?.trim()) {
      newErrors.dsaBankName = true
    }
    if (form.loanAmount !== null && form.loanAmount <= 0) {
      newErrors.loanAmount = true
    }
    if (form.percentageOfPayout !== null && (form.percentageOfPayout < 0 || form.percentageOfPayout > 100)) {
      newErrors.percentageOfPayout = true
    }
    if (form.amountPaid !== null && form.amountPaid < 0) {
      newErrors.amountPaid = true
    }
    if (form.amountPaid !== null && form.payoutAmount !== null && form.amountPaid > form.payoutAmount) {
      newErrors.amountPaid = true
    }
    if (form.dsaAgentMobileNo && !isValidPhone(form.dsaAgentMobileNo)) {
      newErrors.dsaAgentMobileNo = true
    }
    if (form.dsaAgentEmail && !isValidEmail(form.dsaAgentEmail)) {
      newErrors.dsaAgentEmail = true
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      const result = editId ? await updateDsa(editId, form) : await createDsa(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      closeForm()
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

  const exportRows = () => {
    setExportError('')
    startExportTransition(async () => {
      try {
        exportDsaCsv(filtered, filters)
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Could not export DSA payout records.')
      }
    })
  }

  return (
    <div>
      <PageHeader
        title="DSA Management"
        subtitle={`${filtered.length} referral payouts`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={exportRows} disabled={isExporting || filtered.length === 0}>
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : `${Object.values(filters).some(v => v && v !== 'All') ? 'Export Filtered' : 'Export All'} (${filtered.length})`}
            </Btn>
            <Btn size="sm" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5" />Add DSA Payout
            </Btn>
          </div>
        }
      />

      <div className="mb-4 space-y-4">
        <SearchBar value={filters.search} onChange={value => setFilter('search', value)} placeholder="Reg no, customer, agent..." />

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Registration No" value={filters.registrationNo} onChange={e => setFilter('registrationNo', e.target.value)} />
            <Input label="Customer Name" value={filters.customerName} onChange={e => setFilter('customerName', e.target.value)} />
            <Input label="Agent Name" value={filters.agentName} onChange={e => setFilter('agentName', e.target.value)} />
            <Input label="Bank Name" value={filters.bankName} onChange={e => setFilter('bankName', e.target.value)} />
            <Select label="Payment Status" value={filters.paymentStatus} onChange={e => setFilter('paymentStatus', e.target.value)}>
              <option>All</option>
              {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="From Entry Date" type="date" value={filters.fromDate} onChange={e => setFilter('fromDate', e.target.value)} />
            <Input label="To Entry Date" type="date" value={filters.toDate} onChange={e => setFilter('toDate', e.target.value)} />
          </div>

          <div className="mt-4 flex justify-end">
            <Btn variant="outline" onClick={resetFilters}>Reset Filters</Btn>
          </div>
        </div>
      </div>

      {exportError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>}

      <Table headers={['Reg No', 'Vehicle', 'Customer', 'Agent', 'Bank', 'Loan Amount', 'Payout', 'Paid', 'Status', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.dsaMainId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{r.carRegistrationNo ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{getVehicleLabel(r)}</td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{r.customerNameLegacy ?? '—'}</div>
              {r.customer?.custMobile && <div className="text-xs text-gray-500 font-mono">{r.customer.custMobile}</div>}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">{r.dsaAgentName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.dsaBankName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.loanAmount)}</td>
            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmtMoney(r.payoutAmount)}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.amountPaid)}</td>
            <td className="px-4 py-3">{r.paymentStatus ? <Badge label={r.paymentStatus} /> : '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => setViewRow(r)} className="p-1.5 text-gray-400 hover:text-blue-900 hover:bg-gray-100 rounded transition" title="View Details">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.dsaMainId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {/* View Modal */}
      <Modal title={`View DSA Payout — ${viewRow?.carRegistrationNo ?? ''}`} open={!!viewRow} onClose={() => setViewRow(null)} width="max-w-4xl">
        {viewRow && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Registration No</div>
                <div className="mt-1 font-mono text-sm font-semibold text-gray-900">{viewRow.carRegistrationNo ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Vehicle</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{getVehicleLabel(viewRow)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.customerNameLegacy ?? '—'}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">DSA Agent</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.dsaAgentName ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Agent Mobile</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.dsaAgentMobileNo ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Agent Email</div>
                <div className="mt-1 text-sm font-medium text-gray-900 break-all">{viewRow.dsaAgentEmail ?? '—'}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Bank Name</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.dsaBankName ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Entry Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDate(viewRow.dsaEntryDate) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Loan Amount</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtMoney(viewRow.loanAmount)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Payout % of Loan</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.percentageOfPayout ? `${viewRow.percentageOfPayout}%` : '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Payout Amount</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtMoney(viewRow.payoutAmount)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount Paid</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtMoney(viewRow.amountPaid)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment Status</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.paymentStatus ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Remark</div>
                <div className="mt-1 text-sm font-medium text-gray-900 whitespace-pre-wrap">{viewRow.remark ?? '—'}</div>
              </div>
            </div>

            {/* Audit Log Details */}
            <div className="border-t border-gray-100 pt-4 text-[12px] text-gray-400 flex flex-wrap gap-x-6 gap-y-1">
              <div>
                Created By: <span className="font-medium text-gray-500">{viewRow.createdByUser?.displayName ?? viewRow.createdByUser?.userName ?? 'System'}</span>
                {viewRow.createdDate && <> on <span className="font-medium text-gray-500">{fmtDateTime(viewRow.createdDate)}</span></>}
              </div>
              {viewRow.updatedDate && (
                <div>
                  Last Updated By: <span className="font-medium text-gray-500">{viewRow.updatedByUser?.displayName ?? viewRow.updatedByUser?.userName ?? 'System'}</span>
                  <> on <span className="font-medium text-gray-500">{fmtDateTime(viewRow.updatedDate)}</span></>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Btn variant="outline" onClick={() => setViewRow(null)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={editId ? 'Edit DSA Payout' : 'Add DSA Payout'} open={!!modal} onClose={requestCloseForm} width="max-w-3xl">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Vehicle (optional — link if from our stock)</label>
            {selectedVehicle ? (
              <div className={`border ${errors.inventoryId ? 'border-red-500' : 'border-gray-200'} rounded-md px-3 py-2 bg-gray-50`}>
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
                  error={errors.inventoryId}
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
            <PartnerPicker partnerType="DSA" label="Agent" value={selectedAgent} onChange={onAgentChange} error={errors.partnerId} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1 col-span-2">
              <Input label="Registration No" value={form.carRegistrationNo} onChange={e => { f('carRegistrationNo', e.target.value); setVehicleLookupMessage('') }} error={errors.carRegistrationNo} />
              <div className="flex items-center gap-2">
                <Btn type="button" variant="outline" size="sm" onClick={findVehicleByRegistration}>
                  Find by Registration
                </Btn>
                {vehicleLookupMessage && <span className="text-xs text-gray-500">{vehicleLookupMessage}</span>}
              </div>
            </div>
            <Input label="Vehicle Model" value={form.carModelLegacy} onChange={e => f('carModelLegacy', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Agent Mobile" value={form.dsaAgentMobileNo} onChange={e => f('dsaAgentMobileNo', e.target.value)} error={errors.dsaAgentMobileNo} />
            <Input label="Agent Email" value={form.dsaAgentEmail} onChange={e => f('dsaAgentEmail', e.target.value)} error={errors.dsaAgentEmail} />
            <Input label="Bank Name" value={form.dsaBankName} onChange={e => f('dsaBankName', e.target.value)} placeholder="HDFC Bank, SBI..." error={errors.dsaBankName} />
            <Input label="Entry Date" type="date" value={form.dsaEntryDate} onChange={e => f('dsaEntryDate', e.target.value)} />
            <Input label="Loan Amount (₹)" type="number" value={form.loanAmount ?? ''} onChange={e => f('loanAmount', e.target.value ? +e.target.value : null)} error={errors.loanAmount} />
            <Input label="Payout % of Loan" type="number" value={form.percentageOfPayout ?? ''} onChange={e => f('percentageOfPayout', e.target.value ? +e.target.value : null)} error={errors.percentageOfPayout} />
            <Input label="Payout Amount (auto)" value={form.payoutAmount != null ? `₹${form.payoutAmount.toLocaleString('en-IN')}` : ''} readOnly className="bg-gray-50" />
            <Select label="Payment Status" value={form.paymentStatus} onChange={e => f('paymentStatus', e.target.value)}>
              {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Amount Paid (₹)" type="number" value={form.amountPaid ?? ''} onChange={e => f('amountPaid', e.target.value ? +e.target.value : null)} error={errors.amountPaid} />
          </div>
          <Textarea label="Remark" value={form.remark} onChange={e => f('remark', e.target.value)} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={requestCloseForm}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save DSA Payout'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this DSA record? This cannot be undone." />

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={closeForm}
        title="Discard changes?"
        confirmLabel="Discard"
        message="You have unsaved changes in this DSA form. Discard them and close?"
      />
    </div>
  )
}
