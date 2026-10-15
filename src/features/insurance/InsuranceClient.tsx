'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Car, Download, Loader2, Pencil, IndianRupee } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, PageHeader, ConfirmDialog } from '@/components/ui'
import { InsuranceFilters } from './InsuranceFilters'
import { InsurancePagination } from './InsurancePagination'
import { InsuranceTable } from './InsuranceTable'
import { InsurancePaymentSummary, InsurancePaymentWorkflow } from './InsurancePaymentSummary'
import { InsuranceViewDetails } from './InsuranceViewDetails'
import { CustomerPicker } from '@/components/CustomerPicker'
import { PartnerPicker } from '@/components/PartnerPicker'
import {
  createInsurance, updateInsurance, deleteInsurance, logInsurancePayment,
  type InsuranceFormInput, type LogPaymentInput,
} from './actions'
import { PAYOUT_STATUSES, POLICY_STATUSES, CAR_TYPES } from './queries'
import { isValidEmail, isValidPhone, isValidYear } from '@/lib/validation'

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface PartnerOption { partnerId: number; name: string; mobile: string | null; email: string | null }
interface Vehicle {
  inventoryId: number
  fkVariantId: number | null
  registrationNo: string | null
  sku: string | null
  year: number | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
}

export interface InsuranceRow {
  insuranceMainId: number
  inventoryId: number | null
  agentNameLegacy: string | null
  agentMobileNoLegacy: string | null
  agentEmailIdLegacy: string | null
  customerId: number | null
  customerNameLegacy: string | null
  customerMobileLegacy: string | null
  customerEmailLegacy: string | null
  carType: string | null
  fkVariantId: number | null
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
const normalizeRegistrationNo = (value: string | null | undefined) => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '')
const todayLocalDate = () => {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const INSURANCE_VALIDATION_MESSAGES: Record<string, string> = {
  agentPartnerId: 'Select an insurance agent.',
  customer: 'Select a customer.',
  carRegistrationNo: 'Registration number is required.',
  carType: 'Select a valid car type.',
  carMakeLegacy: 'Make is required.',
  carModelLegacy: 'Model is required.',
  carVariantLegacy: 'Variant is required.',
  carYear: 'Enter a valid car year.',
  entryDate: 'Entry date is required and must be before the expiry date.',
  renewalDate: 'Renewal date is required.',
  expiryDate: 'Expiry date is required and must be after the entry date.',
  followupDate: 'Follow-up date is required and cannot be in the past.',
  insurancePremium: 'Insurance premium must be greater than zero.',
  oDPremium: 'OD premium must be greater than zero and cannot exceed the insurance premium.',
  payoutPercentageOdPremium: 'Payout percentage must be between 0 and 100.',
  initialAmountReceived: 'Initial amount can be zero but cannot be negative or exceed the payout amount.',
  agentMobileNoLegacy: 'Agent mobile must contain 10 digits.',
  agentEmailIdLegacy: 'Enter a valid agent email address.',
  customerMobileLegacy: 'Customer mobile must contain 10 digits.',
  customerEmailLegacy: 'Enter a valid customer email address.',
  amountReceived: 'Enter an amount greater than zero that does not exceed the remaining balance.',
  nextFollowUpDate: 'Select a follow-up date today or later for a pending payout.',
  remark: 'Add a follow-up remark for a pending payout.',
}

function csvValue(value: string | number | boolean | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildInsuranceExportFileName(rows: InsuranceRow[], search: string) {
  const today = new Date().toISOString().slice(0, 10)
  const parts = ['insurance']
  if (search.trim()) parts.push('filtered')
  if (parts.length === 1) parts.push(`${rows.length}-rows`)
  parts.push(today)
  return `${parts.map(slugify).filter(Boolean).join('-')}.csv`
}

function exportInsuranceCsv(rows: InsuranceRow[], search: string) {
  const headers = [
    'Insurance ID',
    'Linked Inventory ID',
    'Linked Customer ID',
    'Linked Agent ID',
    'Linked Variant ID',
    'Entry Date',
    'Renewal Date',
    'Expiry Date',
    'Customer Name',
    'Customer Mobile',
    'Customer Email',
    'Agent Name',
    'Agent Mobile',
    'Agent Email',
    'Registration No',
    'Car Type',
    'Make',
    'Model',
    'Variant',
    'Car Year',
    'Insurance Premium',
    'OD Premium',
    'Payout Percentage OD Premium',
    'Payout Amount',
    'Total Amount Received',
    'Payout Payment Status',
    'Policy Status',
    'Follow-up Date',
    'Remark',
  ]

  const lines = [headers.map(csvValue).join(',')]
  for (const row of rows) {
    lines.push([
      row.insuranceMainId,
      row.inventoryId,
      row.customer?.custId ?? row.customerId,
      row.fkPartnerId,
      row.fkVariantId,
      fmtDate(row.entryDate),
      fmtDate(row.renewalDate),
      fmtDate(row.expiryDate),
      row.customer?.custName ?? row.customerNameLegacy,
      row.customer?.custMobile ?? row.customerMobileLegacy,
      row.customer?.custEmail ?? row.customerEmailLegacy,
      row.partnerMaster?.name ?? row.agentNameLegacy,
      row.partnerMaster?.mobile ?? row.agentMobileNoLegacy,
      row.partnerMaster?.email ?? row.agentEmailIdLegacy,
      row.carRegistrationNo,
      row.carType,
      row.carMakeLegacy,
      row.carModelLegacy,
      row.carVariantLegacy,
      row.carYear,
      row.insurancePremium,
      row.oDPremium,
      row.payoutPercentageOdPremium,
      row.payoutAmount,
      row.totalAmountReceived,
      row.payoutPaymentStatus,
      row.policyStatus,
      fmtDate(row.followupDate),
      row.remark,
    ].map(csvValue).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildInsuranceExportFileName(rows, search)
  link.click()
  URL.revokeObjectURL(url)
}

function vehicleLabel(v: Vehicle) {
  const parts = [clean(v.carVariantMaster?.carMakeMaster?.make), clean(v.carVariantMaster?.carModelMaster?.model), clean(v.carVariantMaster?.variant)].filter(Boolean)
  return `${v.registrationNo ?? v.sku ?? '—'} — ${parts.join(' ')}`
}

function emptyForm(): InsuranceFormInput {
  return {
    agentPartnerId: null, agentNameLegacy: '', agentMobileNoLegacy: '', agentEmailIdLegacy: '',
    customerId: null, customerNameLegacy: '', customerMobileLegacy: '', customerEmailLegacy: '',
    inventoryId: null, fkVariantId: null, carType: 'PreOwned', carMakeLegacy: '', carModelLegacy: '', carVariantLegacy: '', carYear: null, carRegistrationNo: '',
    entryDate: new Date().toISOString().slice(0, 10),
    insurancePremium: null, oDPremium: null, payoutPercentageOdPremium: null, payoutAmount: null, initialAmountReceived: 0,
    payoutPaymentStatus: 'Pending', policyStatus: 'Pending',
    renewalDate: '', expiryDate: '', followupDate: '', remark: '',
  }
}

function emptyPayment(): LogPaymentInput {
  return { amountReceived: null, payoutPaymentStatus: 'Pending', policyStatus: 'Pending', nextFollowUpDate: '', remark: '' }
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

export function InsuranceClient({
  initialData,
  vehicles,
  total,
  page,
  pageCount,
  pageSize,
  initialSearch,
  initialFromDate,
  initialToDate,
}: {
  initialData: InsuranceRow[]
  vehicles: Vehicle[]
  total: number
  page: number
  pageCount: number
  pageSize: number
  initialSearch: string
  initialFromDate: string
  initialToDate: string
}) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState(initialSearch)
  const [fromDate, setFromDate] = useState(initialFromDate)
  const [toDate, setToDate] = useState(initialToDate)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [viewRow, setViewRow] = useState<InsuranceRow | null>(null)
  const [form, setForm] = useState<InsuranceFormInput>(emptyForm())
  const [formTotalAmountReceived, setFormTotalAmountReceived] = useState<string | null>(null)
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(JSON.stringify(emptyForm()))
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [savedCustomerSnapshot, setSavedCustomerSnapshot] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<PartnerOption | null>(null)
  const [savedAgentSnapshot, setSavedAgentSnapshot] = useState('')
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [savedVehicleSnapshot, setSavedVehicleSnapshot] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [vehicleLookupMessage, setVehicleLookupMessage] = useState('')
  const [discardOpen, setDiscardOpen] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()
  const [isRoutePending, startRouteTransition] = useTransition()
  const [exportError, setExportError] = useState('')
  const [isExporting, startExportTransition] = useTransition()

  const [payRow, setPayRow] = useState<InsuranceRow | null>(null)
  const [payForm, setPayForm] = useState<LogPaymentInput>(emptyPayment())
  const [payments, setPayments] = useState<PaymentHistoryEntry[]>([])
  const [followups, setFollowups] = useState<FollowupHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const historyRequestRef = useRef(0)

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setFromDate(initialFromDate)
  }, [initialFromDate])

  useEffect(() => {
    setToDate(initialToDate)
  }, [initialToDate])

  const vehicleMatches = useMemo(() => {
    const q = vehicleQuery.toLowerCase()
    if (!q) return vehicles.slice(0, 20)
    return vehicles.filter(v => vehicleLabel(v).toLowerCase().includes(q)).slice(0, 20)
  }, [vehicles, vehicleQuery])

  const hasUnsavedChanges = useMemo(() => {
    if (!modal) return false
    return (
      JSON.stringify(form) !== savedFormSnapshot ||
      optionSnapshot(selectedCustomer) !== savedCustomerSnapshot ||
      optionSnapshot(selectedAgent) !== savedAgentSnapshot ||
      optionSnapshot(selectedVehicle) !== savedVehicleSnapshot
    )
  }, [
    form,
    modal,
    savedAgentSnapshot,
    savedCustomerSnapshot,
    savedFormSnapshot,
    savedVehicleSnapshot,
    selectedAgent,
    selectedCustomer,
    selectedVehicle,
  ])

  useEffect(() => {
    const pct = form.payoutPercentageOdPremium
    const od = form.oDPremium
    if (pct != null && od != null) {
      const computed = Math.round((od * pct) / 100 * 100) / 100
      setForm(f => (f.payoutAmount === computed ? f : { ...f, payoutAmount: computed }))
    }
  }, [form.oDPremium, form.payoutPercentageOdPremium])

  const resetVehicle = () => { setSelectedVehicle(null); setVehicleQuery(''); setVehicleOpen(false) }

  const openAdd = () => {
    const nextForm = emptyForm()
    setForm(nextForm)
    setSavedFormSnapshot(JSON.stringify(nextForm))
    setSelectedCustomer(null)
    setSavedCustomerSnapshot('')
    setSelectedAgent(null)
    setSavedAgentSnapshot('')
    resetVehicle()
    setSavedVehicleSnapshot('')
    setVehicleLookupMessage('')
    setFormTotalAmountReceived(null)
    setEditId(null)
    setError('')
    setModal('add')
  }

  const openEdit = (r: InsuranceRow) => {
    const nextForm: InsuranceFormInput = {
      agentPartnerId: r.fkPartnerId,
      agentNameLegacy: r.agentNameLegacy ?? r.partnerMaster?.name ?? '',
      agentMobileNoLegacy: r.agentMobileNoLegacy ?? r.partnerMaster?.mobile ?? '',
      agentEmailIdLegacy: r.agentEmailIdLegacy ?? r.partnerMaster?.email ?? '',
      customerId: r.customerId,
      customerNameLegacy: r.customerNameLegacy ?? '', customerMobileLegacy: r.customerMobileLegacy ?? '', customerEmailLegacy: r.customerEmailLegacy ?? '',
      inventoryId: r.inventoryId,
      fkVariantId: r.fkVariantId,
      carType: r.carType ?? 'PreOwned',
      carMakeLegacy: clean(r.carMakeLegacy), carModelLegacy: clean(r.carModelLegacy), carVariantLegacy: clean(r.carVariantLegacy),
      carYear: r.carYear, carRegistrationNo: r.carRegistrationNo ?? '',
      entryDate: fmtDate(r.entryDate),
      insurancePremium: r.insurancePremium ? Number(r.insurancePremium) : null,
      oDPremium: r.oDPremium ? Number(r.oDPremium) : null,
      payoutPercentageOdPremium: r.payoutPercentageOdPremium ? Number(r.payoutPercentageOdPremium) : null,
      payoutAmount: r.payoutAmount ? Number(r.payoutAmount) : null,
      initialAmountReceived: null,
      payoutPaymentStatus: r.payoutPaymentStatus ?? 'Pending',
      policyStatus: r.policyStatus ?? 'Pending',
      renewalDate: fmtDate(r.renewalDate), expiryDate: fmtDate(r.expiryDate), followupDate: fmtDate(r.followupDate),
      remark: r.remark ?? '',
    }
    const nextCustomer = r.customer
    const nextAgent = r.partnerMaster
    const nextVehicle = vehicles.find(v => v.inventoryId === r.inventoryId) ?? null
    setForm(nextForm)
    setSavedFormSnapshot(JSON.stringify(nextForm))
    setSelectedCustomer(nextCustomer)
    setSavedCustomerSnapshot(optionSnapshot(nextCustomer))
    setSelectedAgent(nextAgent)
    setSavedAgentSnapshot(optionSnapshot(nextAgent))
    setSelectedVehicle(nextVehicle)
    setSavedVehicleSnapshot(optionSnapshot(nextVehicle))
    setVehicleQuery('')
    setVehicleLookupMessage('')
    setFormTotalAmountReceived(r.totalAmountReceived)
    setEditId(r.insuranceMainId)
    setError('')
    setModal('edit')
  }

  const openView = (r: InsuranceRow) => {
    setViewRow(r)
  }

  const selectVehicle = (v: Vehicle) => {
    setSelectedVehicle(v)
    setVehicleOpen(false)
    setVehicleQuery('')
    setVehicleLookupMessage(`Linked stock vehicle ${v.registrationNo ?? v.sku ?? `#${v.inventoryId}`}.`)
    setForm(f => ({
      ...f,
      inventoryId: v.inventoryId,
      fkVariantId: v.fkVariantId,
      carMakeLegacy: clean(v.carVariantMaster?.carMakeMaster?.make),
      carModelLegacy: clean(v.carVariantMaster?.carModelMaster?.model),
      carVariantLegacy: clean(v.carVariantMaster?.variant),
      carYear: v.year,
      carRegistrationNo: v.registrationNo ?? f.carRegistrationNo,
    }))
  }

  const findVehicleByRegistration = () => {
    const registrationNo = form.carRegistrationNo.trim()
    if (!registrationNo) {
      setVehicleLookupMessage('Enter a registration number first.')
      return
    }

    const match = vehicles.find(v => normalizeRegistrationNo(v.registrationNo) === normalizeRegistrationNo(registrationNo))
    if (!match) {
      setVehicleLookupMessage('No stock vehicle matched that registration number. You can still continue manually.')
      return
    }

    selectVehicle(match)
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
    setForm(f => ({
      ...f,
      agentPartnerId: p?.partnerId ?? null,
      agentNameLegacy: p?.name ?? f.agentNameLegacy,
      agentMobileNoLegacy: p?.mobile ?? f.agentMobileNoLegacy,
      agentEmailIdLegacy: p?.email ?? f.agentEmailIdLegacy,
    }))
  }

  const f = <K extends keyof InsuranceFormInput>(k: K, v: InsuranceFormInput[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setErrors(prev => {
      if (!prev[k]) return prev
      const next = { ...prev }
      delete next[k]
      return next
    })
  }

  const fieldError = (field: string) => errors[field] ? <p role="alert" className="mt-1 text-xs text-red-600">{INSURANCE_VALIDATION_MESSAGES[field] ?? 'Please enter a valid value.'}</p> : null

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

  const save = () => {
    setError('')
    const newErrors: Record<string, boolean> = {}

    if (!form.carRegistrationNo?.trim()) {
      newErrors.carRegistrationNo = true
    }
    if (!form.agentPartnerId) {
      newErrors.agentPartnerId = true
    }
    if (!form.customerId) {
      newErrors.customer = true
    }
    if (!(CAR_TYPES as readonly string[]).includes(form.carType)) {
      newErrors.carType = true
    }
    if (!form.carMakeLegacy.trim()) newErrors.carMakeLegacy = true
    if (!form.carModelLegacy.trim()) newErrors.carModelLegacy = true
    if (!form.carVariantLegacy.trim()) newErrors.carVariantLegacy = true
    if (form.insurancePremium === null || form.insurancePremium <= 0) {
      newErrors.insurancePremium = true
    }
    if (form.oDPremium === null || form.oDPremium <= 0) {
      newErrors.oDPremium = true
    }
    if (form.insurancePremium !== null && form.oDPremium !== null && form.oDPremium > form.insurancePremium) {
      newErrors.oDPremium = true
    }
    if (form.payoutPercentageOdPremium === null || form.payoutPercentageOdPremium < 0 || form.payoutPercentageOdPremium > 100) {
      newErrors.payoutPercentageOdPremium = true
    }
    if (form.carYear === null || !isValidYear(form.carYear)) {
      newErrors.carYear = true
    }
    if (!form.entryDate) newErrors.entryDate = true
    if (!form.renewalDate) newErrors.renewalDate = true
    if (!form.expiryDate) newErrors.expiryDate = true
    if (!form.followupDate || form.followupDate < todayLocalDate()) newErrors.followupDate = true
    if (form.entryDate && form.expiryDate && form.expiryDate <= form.entryDate) {
      newErrors.expiryDate = true
      newErrors.entryDate = true
    }
    if (form.agentMobileNoLegacy && !isValidPhone(form.agentMobileNoLegacy)) {
      newErrors.agentMobileNoLegacy = true
    }
    if (form.agentEmailIdLegacy && !isValidEmail(form.agentEmailIdLegacy)) {
      newErrors.agentEmailIdLegacy = true
    }
    if (form.customerMobileLegacy && !isValidPhone(form.customerMobileLegacy)) {
      newErrors.customerMobileLegacy = true
    }
    if (form.customerEmailLegacy && !isValidEmail(form.customerEmailLegacy)) {
      newErrors.customerEmailLegacy = true
    }
    if (!editId && (form.initialAmountReceived === null || form.initialAmountReceived < 0 || (form.payoutAmount !== null && form.initialAmountReceived > form.payoutAmount))) {
      newErrors.initialAmountReceived = true
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      const result = editId ? await updateInsurance(editId, form) : await createInsurance(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setSavedFormSnapshot(JSON.stringify(form))
      setSavedCustomerSnapshot(optionSnapshot(selectedCustomer))
      setSavedAgentSnapshot(optionSnapshot(selectedAgent))
      setSavedVehicleSnapshot(optionSnapshot(selectedVehicle))
      closeForm()
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
    const requestId = ++historyRequestRef.current
    setPayRow(r)
    setPayForm({ ...emptyPayment(), payoutPaymentStatus: r.payoutPaymentStatus ?? 'Pending', policyStatus: r.policyStatus ?? 'Pending' })
    setError('')
    setErrors({})
    setPayments([])
    setFollowups([])
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/insurance/history?insuranceMainId=${r.insuranceMainId}`)
      const hist = await res.json().catch(() => ({ payments: [], followups: [] }))
      if (historyRequestRef.current !== requestId) return
      if (!res.ok) {
        throw new Error('Could not load insurance payment history.')
      }
      setPayments(Array.isArray(hist.payments) ? hist.payments : [])
      setFollowups(Array.isArray(hist.followups) ? hist.followups : [])
    } catch {
      if (historyRequestRef.current !== requestId) return
      setPayments([])
      setFollowups([])
      setError('Could not load insurance payment history.')
    } finally {
      if (historyRequestRef.current === requestId) setHistoryLoading(false)
    }
  }

  const pf = <K extends keyof LogPaymentInput>(k: K, v: LogPaymentInput[K]) => {
    setPayForm(prev => ({ ...prev, [k]: v }))
    setError('')
    setErrors(prev => {
      if (!prev[k]) return prev
      const next = { ...prev }
      delete next[k]
      return next
    })
  }

  const savePayment = () => {
    if (!payRow) return
    setError('')
    const newErrors: Record<string, boolean> = {}

    if (payForm.amountReceived === null || payForm.amountReceived <= 0) {
      newErrors.amountReceived = true
    }
    const totalReceivedAlready = payments.reduce((sum, p) => sum + Number(p.amountReceived ?? 0), 0)
    const payoutAmt = Number(payRow.payoutAmount ?? 0)
    if (payForm.amountReceived !== null && (totalReceivedAlready + payForm.amountReceived > payoutAmt)) {
      newErrors.amountReceived = true
    }
    if (payForm.payoutPaymentStatus === 'Pending') {
      if (!payForm.nextFollowUpDate?.trim()) {
        newErrors.nextFollowUpDate = true
      } else {
        const today = todayLocalDate()
        if (payForm.nextFollowUpDate < today) {
          newErrors.nextFollowUpDate = true
        }
      }
    }
    if (payForm.payoutPaymentStatus === 'Pending' && !payForm.remark?.trim()) {
      newErrors.remark = true
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

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

  const exportRows = () => {
    setExportError('')
    startExportTransition(async () => {
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set('search', search.trim())
        if (fromDate) params.set('fromDate', fromDate)
        if (toDate) params.set('toDate', toDate)
        const res = await fetch(`/api/insurance/export${params.toString() ? `?${params.toString()}` : ''}`)
        const payload = await res.json().catch(() => null)
        if (!res.ok || !Array.isArray(payload)) {
          throw new Error(payload?.error ?? 'Could not export insurance records.')
        }
        exportInsuranceCsv(payload as InsuranceRow[], search)
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Could not export insurance records.')
      }
    })
  }

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({
      search: initialSearch,
      fromDate: initialFromDate,
      toDate: initialToDate,
      page: String(page),
      pageSize: String(pageSize),
      ...params,
    })
    for (const [k, v] of [...q.entries()]) {
      if (!v) q.delete(k)
    }
    startRouteTransition(() => {
      router.push(`/insurance${q.toString() ? `?${q.toString()}` : ''}`)
    })
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (search !== initialSearch) {
        pushQuery({ search, page: '1' })
      }
    }, 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch, search])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (fromDate !== initialFromDate || toDate !== initialToDate) {
        pushQuery({ search, fromDate, toDate, page: '1' })
      }
    }, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, initialFromDate, initialToDate, search, toDate])

  const resetFilters = () => {
    setSearch('')
    setFromDate('')
    setToDate('')
    pushQuery({ search: '', fromDate: '', toDate: '', page: '1' })
  }

  const navigatePage = (nextPage: number, nextPageSize = pageSize) => {
    pushQuery({ search, page: String(nextPage), pageSize: String(nextPageSize) })
  }

  return (
    <div>
      <PageHeader
        title="Insurance Management"
        subtitle={`${total} referral policies`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={exportRows} disabled={isExporting || total === 0}>
              <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : `${search.trim() ? 'Export Filtered' : 'Export All'} (${total})`}
            </Btn>
            <Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Insurance</Btn>
          </div>
        }
      />

      <InsuranceFilters search={search} fromDate={fromDate} toDate={toDate} pending={isRoutePending}
        onSearch={setSearch} onFromDate={setFromDate} onToDate={setToDate} onReset={resetFilters} />
      {exportError && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{exportError}</div>}

      <div className={isRoutePending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <InsuranceTable rows={data} onPay={openPay} onView={openView} onEdit={openEdit} onDelete={setDeleteId} />
      </div>
      <InsurancePagination total={total} page={page} pageSize={pageSize} pageCount={pageCount} pending={isRoutePending} onNavigate={navigatePage} />

      <Modal title={editId ? 'Edit Insurance' : 'Add Insurance'} open={!!modal} onClose={requestCloseForm} width="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Insurance Agent *</label>
              <PartnerPicker partnerType="Insurance Agent" label="Agent" value={selectedAgent} onChange={onAgentChange} error={errors.agentPartnerId} />
              {fieldError('agentPartnerId')}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Customer *</label>
              <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} error={errors.customer} />
              {fieldError('customer')}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Agent Name" value={form.agentNameLegacy} onChange={e => f('agentNameLegacy', e.target.value)} />
            <div><Input label="Agent Mobile" value={form.agentMobileNoLegacy} onChange={e => f('agentMobileNoLegacy', e.target.value)} error={errors.agentMobileNoLegacy} />{fieldError('agentMobileNoLegacy')}</div>
            <div><Input label="Agent Email" value={form.agentEmailIdLegacy} onChange={e => f('agentEmailIdLegacy', e.target.value)} error={errors.agentEmailIdLegacy} />{fieldError('agentEmailIdLegacy')}</div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Vehicle (optional — link if from our stock)</label>
            {selectedVehicle ? (
              <div className={`flex items-center justify-between border ${errors.inventoryId ? 'border-red-500' : 'border-gray-200'} rounded-md px-3 py-2 bg-gray-50`}>
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Car className="w-4 h-4 text-gray-400" />{vehicleLabel(selectedVehicle)}
                </div>
                <button type="button" onClick={() => { setSelectedVehicle(null); setVehicleLookupMessage(''); setForm(fm => ({ ...fm, inventoryId: null, fkVariantId: null })) }} className="text-gray-400 hover:text-red-600">
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

          <div className="grid grid-cols-3 gap-4">
            <div><Select label="Car Type" value={form.carType} onChange={e => f('carType', e.target.value)} error={errors.carType}>
              {CAR_TYPES.map(c => <option key={c}>{c}</option>)}
            </Select>{fieldError('carType')}</div>
            <div><Input label="Make *" value={form.carMakeLegacy} onChange={e => f('carMakeLegacy', e.target.value)} error={errors.carMakeLegacy} />{fieldError('carMakeLegacy')}</div>
            <div><Input label="Model *" value={form.carModelLegacy} onChange={e => f('carModelLegacy', e.target.value)} error={errors.carModelLegacy} />{fieldError('carModelLegacy')}</div>
            <div><Input label="Variant *" value={form.carVariantLegacy} onChange={e => f('carVariantLegacy', e.target.value)} error={errors.carVariantLegacy} />{fieldError('carVariantLegacy')}</div>
            <div><Input label="Year" type="number" value={form.carYear ?? ''} onChange={e => f('carYear', e.target.value ? +e.target.value : null)} error={errors.carYear} />{fieldError('carYear')}</div>
            <div className="space-y-1">
              <Input label="Registration No" value={form.carRegistrationNo} onChange={e => { f('carRegistrationNo', e.target.value); setVehicleLookupMessage('') }} error={errors.carRegistrationNo} />
              {fieldError('carRegistrationNo')}
              <div className="flex items-center gap-2">
                <Btn type="button" variant="outline" size="sm" onClick={findVehicleByRegistration}>
                  Find by Registration
                </Btn>
                {vehicleLookupMessage && <span className="text-xs text-gray-500">{vehicleLookupMessage}</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><Input label="Entry Date *" type="date" value={form.entryDate} onChange={e => f('entryDate', e.target.value)} error={errors.entryDate} />{fieldError('entryDate')}</div>
            <div><Input label="Insurance Premium (₹)" type="number" value={form.insurancePremium ?? ''} onChange={e => f('insurancePremium', e.target.value ? +e.target.value : null)} error={errors.insurancePremium} />{fieldError('insurancePremium')}</div>
            <div><Input label="O.D. Premium (₹)" type="number" value={form.oDPremium ?? ''} onChange={e => f('oDPremium', e.target.value ? +e.target.value : null)} error={errors.oDPremium} />{fieldError('oDPremium')}</div>
            <div><Input label="Payout % of OD Premium" type="number" value={form.payoutPercentageOdPremium ?? ''} onChange={e => f('payoutPercentageOdPremium', e.target.value ? +e.target.value : null)} error={errors.payoutPercentageOdPremium} />{fieldError('payoutPercentageOdPremium')}</div>
            <Input label="Payout Amount (auto)" value={form.payoutAmount != null ? `₹${form.payoutAmount.toLocaleString('en-IN')}` : ''} readOnly className="bg-gray-50" />
            {!editId && <div><Input label="Initial Amount Received (₹)" type="number" min="0" value={form.initialAmountReceived ?? ''} onChange={e => {
              const initialAmountReceived = e.target.value === '' ? null : +e.target.value
              setForm(current => ({
                ...current,
                initialAmountReceived,
                payoutPaymentStatus: initialAmountReceived !== null && current.payoutAmount !== null && initialAmountReceived === current.payoutAmount ? 'Paid' : 'Pending',
              }))
            }} error={errors.initialAmountReceived} />{fieldError('initialAmountReceived')}</div>}
            <Input label="Total Amount Received" value={formTotalAmountReceived != null ? `₹${Number(formTotalAmountReceived).toLocaleString('en-IN')}` : '₹0'} readOnly className="bg-gray-50" />
            <Select label="Payout Status" value={form.payoutPaymentStatus} onChange={e => f('payoutPaymentStatus', e.target.value)}>
              {PAYOUT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select label="Policy Status" value={form.policyStatus} onChange={e => f('policyStatus', e.target.value)}>
              {POLICY_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <div><Input label="Renewal Date *" type="date" value={form.renewalDate} onChange={e => f('renewalDate', e.target.value)} error={errors.renewalDate} />{fieldError('renewalDate')}</div>
            <div><Input label="Expiry Date *" type="date" value={form.expiryDate} onChange={e => f('expiryDate', e.target.value)} error={errors.expiryDate} />{fieldError('expiryDate')}</div>
            <div><Input label="Follow-up Date *" type="date" min={todayLocalDate()} value={form.followupDate} onChange={e => f('followupDate', e.target.value)} error={errors.followupDate} />{fieldError('followupDate')}</div>
          </div>
          <Textarea label="Remark" value={form.remark} onChange={e => f('remark', e.target.value)} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={requestCloseForm} disabled={isPending}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Insurance'}</Btn>
          </div>
        </div>
      </Modal>

      <Modal title={`View Insurance${viewRow ? ` — ${viewRow.carRegistrationNo ?? ''}` : ''}`} open={!!viewRow} onClose={() => setViewRow(null)} width="max-w-6xl">
        {viewRow && (
          <>
            <InsuranceViewDetails row={viewRow} onEdit={() => { setViewRow(null); openEdit(viewRow) }} onLogPayment={() => { setViewRow(null); void openPay(viewRow) }} />
            {viewRow && Boolean(0) && (<div className="space-y-5">
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#1B2A6B]">Insurance policy</div>
                  <div className="mt-1 font-mono text-xl font-bold text-gray-900">{viewRow.carRegistrationNo ?? 'Registration not added'}</div>
                  <div className="mt-1 text-sm text-gray-600">{[clean(viewRow.carMakeLegacy), clean(viewRow.carModelLegacy), clean(viewRow.carVariantLegacy), viewRow.carYear].filter(Boolean).join(' · ') || 'Vehicle details unavailable'}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn size="sm" variant="outline" onClick={() => { setViewRow(null); openEdit(viewRow) }}><Pencil className="h-3.5 w-3.5" />Edit Policy</Btn>
                  <Btn size="sm" onClick={() => { setViewRow(null); void openPay(viewRow) }}><IndianRupee className="h-3.5 w-3.5" />Log Payment</Btn>
                </div>
              </div>
            </div>

            {(() => {
              const payout = Number(viewRow.payoutAmount ?? 0)
              const received = Number(viewRow.totalAmountReceived ?? 0)
              const balance = Math.max(payout - received, 0)
              const progress = payout > 0 ? Math.min((received / payout) * 100, 100) : 0
              return <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payout amount</div><div className="mt-1 text-lg font-bold text-gray-900">{fmtMoney(viewRow.payoutAmount)}</div></div>
                  <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-green-700">Amount received</div><div className="mt-1 text-lg font-bold text-green-800">{fmtMoney(viewRow.totalAmountReceived)}</div></div>
                  <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-orange-700">Pending payout</div><div className="mt-1 text-lg font-bold text-orange-800">{fmtMoney(balance)}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-green-500" style={{ width: `${progress}%` }} /></div></div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between"><div className="text-sm font-semibold text-gray-800">Policy workflow</div>{(viewRow.payoutPaymentStatus === 'Pending' || viewRow.policyStatus === 'Pending') && <span className="text-xs font-medium text-amber-700">Action needed</span>}</div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className={`rounded-lg px-3 py-2 ${balance > 0 ? 'bg-amber-50' : 'bg-green-50'}`}><div className="text-xs uppercase tracking-wide text-gray-500">Payout</div><div className="mt-1 flex items-center gap-2"><Badge label={viewRow.payoutPaymentStatus ?? 'Pending'} />{balance > 0 && <span className="text-xs text-amber-700">{fmtMoney(balance)} due</span>}</div></div>
                    <div className={`rounded-lg px-3 py-2 ${viewRow.policyStatus === 'Pending' ? 'bg-amber-50' : 'bg-green-50'}`}><div className="text-xs uppercase tracking-wide text-gray-500">Policy</div><div className="mt-1"><Badge label={viewRow.policyStatus ?? 'Pending'} /></div></div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2"><div className="text-xs uppercase tracking-wide text-gray-500">Next follow-up</div><div className="mt-1 text-sm font-semibold text-gray-800">{fmtDate(viewRow.followupDate) || 'Not scheduled'}</div></div>
                  </div>
                </div>
              </>
            })()}

            <div className="text-sm font-semibold text-gray-800">Vehicle and customer</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Registration No</div>
                <div className="mt-1 font-mono text-sm font-semibold text-gray-900">{viewRow.carRegistrationNo ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Vehicle</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{[clean(viewRow.carMakeLegacy), clean(viewRow.carModelLegacy), clean(viewRow.carVariantLegacy)].filter(Boolean).join(' ') || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Car Type / Year</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.carType ?? '—'}{viewRow.carYear ? ` / ${viewRow.carYear}` : ''}</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 text-sm font-semibold text-gray-800">Insurance agent</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.customer?.custName ?? viewRow.customerNameLegacy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer Mobile</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.customer?.custMobile ?? viewRow.customerMobileLegacy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2 xl:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer Email</div>
                <div className="mt-1 text-sm font-medium text-gray-900 break-all">{viewRow.customer?.custEmail ?? viewRow.customerEmailLegacy ?? '—'}</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 text-sm font-semibold text-gray-800">Policy details</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Agent</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.partnerMaster?.name ?? viewRow.agentNameLegacy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Agent Mobile</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.partnerMaster?.mobile ?? viewRow.agentMobileNoLegacy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2 xl:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Agent Email</div>
                <div className="mt-1 text-sm font-medium text-gray-900 break-all">{viewRow.partnerMaster?.email ?? viewRow.agentEmailIdLegacy ?? '—'}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Entry Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDate(viewRow.entryDate) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Renewal Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDate(viewRow.renewalDate) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Expiry Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDate(viewRow.expiryDate) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Insurance Premium</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtMoney(viewRow.insurancePremium)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">OD Premium</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtMoney(viewRow.oDPremium)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Payout % of OD</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.payoutPercentageOdPremium ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Payout Amount</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtMoney(viewRow.payoutAmount)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Amount Received</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtMoney(viewRow.totalAmountReceived)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Follow-up Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDate(viewRow.followupDate) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Payout Status</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.payoutPaymentStatus ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Policy Status</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.policyStatus ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2 xl:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Remark</div>
                <div className="mt-1 text-sm font-medium text-gray-900 whitespace-pre-wrap">{viewRow.remark ?? '—'}</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Btn variant="outline" onClick={() => { setViewRow(null); openEdit(viewRow) }}><Pencil className="h-4 w-4" />Edit Policy</Btn>
              <Btn onClick={() => { setViewRow(null); void openPay(viewRow) }}><IndianRupee className="h-4 w-4" />Log Payment</Btn>
              <Btn variant="outline" onClick={() => setViewRow(null)}>Close</Btn>
            </div>
            </div>)}
          </>
        )}
      </Modal>

      <Modal title={`Log Payment${payRow ? ` — ${payRow.carRegistrationNo ?? ''}` : ''}`} open={!!payRow} onClose={() => setPayRow(null)}>
        {payRow && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1.5">Payment history</div>
              {historyLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading payment history...</span>
                </div>
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

            <InsurancePaymentSummary
              payoutAmount={payRow.payoutAmount}
              totalAmountReceived={payments.reduce((sum, payment) => sum + Number(payment.amountReceived ?? 0), 0)}
            />

            <InsurancePaymentWorkflow payoutPaymentStatus={payRow.payoutPaymentStatus} policyStatus={payRow.policyStatus} />

            <div className="grid grid-cols-2 gap-4">
              <div><Input label="Amount Received (₹) *" type="number" value={payForm.amountReceived ?? ''} onChange={e => pf('amountReceived', e.target.value ? +e.target.value : null)} error={errors.amountReceived} />{fieldError('amountReceived')}</div>
              <Select label="Payout Status *" value={payForm.payoutPaymentStatus} onChange={e => pf('payoutPaymentStatus', e.target.value)}>
                {PAYOUT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Select label="Policy Status *" value={payForm.policyStatus} onChange={e => pf('policyStatus', e.target.value)}>
                {POLICY_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <div><Input label="Next Follow-up Date" type="date" min={todayLocalDate()} value={payForm.nextFollowUpDate} onChange={e => pf('nextFollowUpDate', e.target.value)} error={errors.nextFollowUpDate} />{fieldError('nextFollowUpDate')}</div>
            </div>
            <div><Textarea label="Remark" value={payForm.remark} onChange={e => pf('remark', e.target.value)} error={errors.remark} />{fieldError('remark')}</div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => setPayRow(null)}>Cancel</Btn>
              <Btn onClick={savePayment} disabled={isPending}>{isPending ? 'Saving...' : 'Save Payment'}</Btn>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this insurance record? This cannot be undone."
        confirmLabel={isPending ? 'Deleting...' : 'Delete'}
        confirmDisabled={isPending}
        cancelDisabled={isPending}
        closeOnConfirm={false}
      />
      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={closeForm}
        title="Discard changes?"
        confirmLabel="Discard"
        message="You have unsaved changes in this insurance form. Discard them and close?"
      />
    </div>
  )
}
