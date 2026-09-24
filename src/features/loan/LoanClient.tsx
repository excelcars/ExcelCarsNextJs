'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Car, IndianRupee, Download, Eye, Loader2 } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, ConfirmDialog } from '@/components/ui'
import { LoanFiltersPanel } from './LoanFiltersPanel'
import { LoanPagination } from './LoanPagination'
import { LoanCustomerLookup, type LoanCustomerOption } from './LoanCustomerLookup'
import type { LoanCustomerVehicleContext } from './customerLookup'
import {
  createLoan, updateLoan, deleteLoan, logLoanPayment,
  type LoanFormInput, type LogLoanPaymentInput,
} from './actions'
import { PAYMENT_STATUSES, CAR_TYPES } from './queries'
import { isValidEmail, isValidPhone, isValidYear } from '@/lib/validation'

interface PartnerOption { partnerId: number; name: string; mobile: string | null; email: string | null }
interface UserOption { userId: number; userName: string | null; displayName: string | null }
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

interface LoanRow {
  loanManagementId: number
  inventoryId: number | null
  bankName: string | null
  bankPersonName: string | null
  bankPersonMobileNo: string | null
  bankPersonEmailId: string | null
  customerId: number | null
  customerNameLegacy: string | null
  customerMobileLegacy: string | null
  customerEmailLegacy: string | null
  fkVariantId: number | null
  carType: string | null
  carMake: string | null
  carModel: string | null
  carVariant: string | null
  carYear: number | null
  registrationNo: string | null
  entryDate: Date | string | null
  loanAmount: string | null
  percentagePayoutAmount: string | null
  payoutAmount: string | null
  totalAmountReceived: string | null
  paymentStatus: string | null
  paymentDate: Date | string | null
  followupDate: Date | string | null
  remarks: string | null
  createdDate: Date | string | null
  createdBy: number | null
  updatedDate: Date | string | null
  updatedBy: number | null
  fkPartnerId: number | null
  customer: LoanCustomerOption | null
  partnerMaster: PartnerOption | null
  createdByUser?: UserOption | null
  updatedByUser?: UserOption | null
}

interface PaymentHistoryEntry {
  loanPaymentId: number
  createdDt: string | null
  amountPaid: string | null
  paymentStatus: string | null
}
interface FollowupHistoryEntry {
  loanFollowupId: number
  followupDate: string | null
  remark: string | null
}

export interface LoanFilters {
  search: string
  registrationNo: string
  customerName: string
  customerMobile: string
  bankName: string
  bankPersonName: string
  paymentStatus: string
  fromDate: string
  toDate: string
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const todayDateValue = () => {
  const local = new Date()
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset())
  return local.toISOString().slice(0, 10)
}
const fmtDate = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''
const fmtDateTime = (value: Date | string | null | undefined) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
const fmtMoney = (n: string | number | null) => {
  if (n === null) return '—'
  const value = Number(n)
  return Number.isFinite(value) ? `₹${value.toLocaleString('en-IN')}` : '—'
}
const normalizeRegistrationNo = (value: string | null | undefined) => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '')

function vehicleLabel(v: Vehicle) {
  const parts = [clean(v.carVariantMaster?.carMakeMaster?.make), clean(v.carVariantMaster?.carModelMaster?.model), clean(v.carVariantMaster?.variant)].filter(Boolean)
  return `${v.registrationNo ?? v.sku ?? '—'} — ${parts.join(' ')}`
}

function emptyForm(): LoanFormInput {
  const today = new Date().toISOString().slice(0, 10)
  return {
    partnerId: null, bankName: '', bankPersonName: '', bankPersonMobileNo: '', bankPersonEmailId: '', customerId: null, customerNameLegacy: '', customerMobileLegacy: '', customerEmailLegacy: '',
    inventoryId: null, fkVariantId: null, registrationNo: '', carType: 'PreOwned', carMake: '', carModel: '', carVariant: '', carYear: null,
    entryDate: today,
    loanAmount: null, percentagePayoutAmount: null, payoutAmount: null, initialAmountReceived: null,
    paymentStatus: 'Partial', paymentDate: today, followupDate: today, remarks: '',
  }
}

function emptyPayment(): LogLoanPaymentInput {
  return { amountPaid: null, paymentStatus: 'Partial', nextFollowUpDate: '', remark: '' }
}

function emptyFilters(): LoanFilters {
  return {
    search: '',
    registrationNo: '',
    customerName: '',
    customerMobile: '',
    bankName: '',
    bankPersonName: '',
    paymentStatus: 'All',
    fromDate: '',
    toDate: '',
  }
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

export function LoanClient({
  initialData,
  vehicles,
  initialSearch = '',
  initialFilters = {}, total, page, pageSize, pageCount,
}: {
  initialData: LoanRow[]
  vehicles: Vehicle[]
  initialSearch?: string
  initialFilters?: Partial<LoanFilters>
  total: number
  page: number
  pageSize: number
  pageCount: number
}) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [filters, setFilters] = useState<LoanFilters>(() => ({
    ...emptyFilters(),
    search: initialSearch,
    ...initialFilters,
  }))

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      ...emptyFilters(), search: initialSearch, ...initialFilters,
    }))
    setData(initialData)
  }, [initialSearch, initialFilters, initialData])

  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [viewRow, setViewRow] = useState<LoanRow | null>(null)
  const [form, setForm] = useState<LoanFormInput>(emptyForm())
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(JSON.stringify(emptyForm()))
  const [selectedCustomer, setSelectedCustomer] = useState<LoanCustomerOption | null>(null)
  const [savedCustomerSnapshot, setSavedCustomerSnapshot] = useState('')
  const [loanMode, setLoanMode] = useState<'existing' | 'manual'>('existing')
  const [savedLoanMode, setSavedLoanMode] = useState<'existing' | 'manual'>('existing')
  const [selectedBankContact, setSelectedBankContact] = useState<PartnerOption | null>(null)
  const [savedBankContactSnapshot, setSavedBankContactSnapshot] = useState('')
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [savedVehicleSnapshot, setSavedVehicleSnapshot] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [vehicleLookupMessage, setVehicleLookupMessage] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [exportError, setExportError] = useState('')
  const [isExporting, startExportTransition] = useTransition()

  const [payRow, setPayRow] = useState<LoanRow | null>(null)
  const [payForm, setPayForm] = useState<LogLoanPaymentInput>(emptyPayment())
  const [payments, setPayments] = useState<PaymentHistoryEntry[]>([])
  const [followups, setFollowups] = useState<FollowupHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const historyRequestRef = useRef(0)

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return data.filter(r => {
      const name = r.customer?.custName ?? r.customerNameLegacy ?? ''
      if (q && !(r.registrationNo ?? '').toLowerCase().includes(q) && !name.toLowerCase().includes(q) && !(r.bankName ?? '').toLowerCase().includes(q)) return false
      if (filters.registrationNo && !clean(r.registrationNo).toLowerCase().includes(filters.registrationNo.toLowerCase())) return false
      if (filters.customerName && !name.toLowerCase().includes(filters.customerName.toLowerCase())) return false
      if (filters.customerMobile && !clean(r.customer?.custMobile ?? r.customerMobileLegacy).toLowerCase().includes(filters.customerMobile.toLowerCase())) return false
      if (filters.bankName && !clean(r.bankName).toLowerCase().includes(filters.bankName.toLowerCase())) return false
      if (filters.bankPersonName && !clean(r.bankPersonName ?? r.partnerMaster?.name).toLowerCase().includes(filters.bankPersonName.toLowerCase())) return false
      if (filters.paymentStatus !== 'All' && (r.paymentStatus ?? '') !== filters.paymentStatus) return false
      const entry = fmtDate(r.entryDate)
      if (filters.fromDate && (!entry || entry < filters.fromDate)) return false
      if (filters.toDate && (!entry || entry > filters.toDate)) return false
      return true
    })
  }, [data, filters])

  const vehicleMatches = useMemo(() => {
    const q = vehicleQuery.toLowerCase()
    if (!q) return vehicles.slice(0, 20)
    return vehicles.filter(v => vehicleLabel(v).toLowerCase().includes(q)).slice(0, 20)
  }, [vehicles, vehicleQuery])

  const hasUnsavedChanges = useMemo(() => {
    if (!modal) return false
    return (
      JSON.stringify(form) !== savedFormSnapshot ||
      loanMode !== savedLoanMode ||
      optionSnapshot(selectedCustomer) !== savedCustomerSnapshot ||
      optionSnapshot(selectedBankContact) !== savedBankContactSnapshot ||
      optionSnapshot(selectedVehicle) !== savedVehicleSnapshot
    )
  }, [
    form,
    loanMode,
    modal,
    savedBankContactSnapshot,
    savedCustomerSnapshot,
    savedFormSnapshot,
    savedLoanMode,
    savedVehicleSnapshot,
    selectedBankContact,
    selectedCustomer,
    selectedVehicle,
  ])

  useEffect(() => {
    const pct = form.percentagePayoutAmount
    const amt = form.loanAmount
    if (pct != null && amt != null) {
      const computed = Math.round((amt * pct) / 100 * 100) / 100
      setForm(f => (f.payoutAmount === computed ? f : { ...f, payoutAmount: computed }))
    }
  }, [form.loanAmount, form.percentagePayoutAmount])

  const resetVehicle = () => { setSelectedVehicle(null); setVehicleQuery(''); setVehicleOpen(false) }

  const openAdd = () => {
    const nextForm = emptyForm()
    setForm(nextForm)
    setSavedFormSnapshot(JSON.stringify(nextForm))
    setSelectedCustomer(null)
    setSavedCustomerSnapshot('')
    setLoanMode('existing')
    setSavedLoanMode('existing')
    setSelectedBankContact(null)
    setSavedBankContactSnapshot('')
    resetVehicle()
    setSavedVehicleSnapshot('')
    setEditId(null)
    setVehicleLookupMessage('')
    setError('')
    setModal('add')
  }

  const openEdit = (r: LoanRow) => {
    const nextForm: LoanFormInput = {
      partnerId: r.fkPartnerId,
      bankName: r.bankName ?? '',
      bankPersonName: r.bankPersonName ?? '',
      bankPersonMobileNo: r.bankPersonMobileNo ?? '',
      bankPersonEmailId: r.bankPersonEmailId ?? '',
      customerId: r.customerId,
      customerNameLegacy: r.customerNameLegacy ?? '', customerMobileLegacy: r.customerMobileLegacy ?? '', customerEmailLegacy: r.customerEmailLegacy ?? '',
      inventoryId: r.inventoryId,
      fkVariantId: r.fkVariantId,
      registrationNo: r.registrationNo ?? '',
      carType: r.carType ?? 'PreOwned',
      carMake: clean(r.carMake), carModel: clean(r.carModel), carVariant: clean(r.carVariant), carYear: r.carYear,
      entryDate: fmtDate(r.entryDate),
      loanAmount: r.loanAmount ? Number(r.loanAmount) : null,
      percentagePayoutAmount: r.percentagePayoutAmount ? Number(r.percentagePayoutAmount) : null,
      payoutAmount: r.payoutAmount ? Number(r.payoutAmount) : null,
      initialAmountReceived: null,
      paymentStatus: r.paymentStatus ?? 'Pending',
      paymentDate: fmtDate(r.paymentDate), followupDate: fmtDate(r.followupDate),
      remarks: r.remarks ?? '',
    }
    const nextCustomer = r.customer
    const nextLoanMode = nextCustomer ? 'existing' : 'manual'
    const nextBankContact = r.partnerMaster
    const nextVehicle = vehicles.find(v => v.inventoryId === r.inventoryId) ?? null
    setForm(nextForm)
    setSavedFormSnapshot(JSON.stringify(nextForm))
    setSelectedCustomer(nextCustomer)
    setSavedCustomerSnapshot(optionSnapshot(nextCustomer))
    setLoanMode(nextLoanMode)
    setSavedLoanMode(nextLoanMode)
    setSelectedBankContact(nextBankContact)
    setSavedBankContactSnapshot(optionSnapshot(nextBankContact))
    setSelectedVehicle(nextVehicle)
    setSavedVehicleSnapshot(optionSnapshot(nextVehicle))
    setVehicleQuery('')
    setEditId(r.loanManagementId)
    setVehicleLookupMessage('')
    setError('')
    setModal('edit')
  }

  const openView = (r: LoanRow) => {
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
      carMake: clean(v.carVariantMaster?.carMakeMaster?.make),
      carModel: clean(v.carVariantMaster?.carModelMaster?.model),
      carVariant: clean(v.carVariantMaster?.variant),
      carYear: v.year,
      registrationNo: v.registrationNo ?? f.registrationNo,
    }))
  }

  const onCustomerChange = (c: LoanCustomerOption | null, lookupVehicle?: LoanCustomerVehicleContext | null) => {
    setSelectedCustomer(c)
    if (c) setLoanMode('existing')
    setForm(f => ({
      ...f,
      customerId: c?.custId ?? null,
      customerNameLegacy: c?.custName ?? '',
      customerMobileLegacy: c?.custMobile ?? '',
      customerEmailLegacy: c?.custEmail ?? '',
      ...(lookupVehicle ? {
        inventoryId: lookupVehicle.inventoryId,
        fkVariantId: lookupVehicle.fkVariantId,
        registrationNo: lookupVehicle.registrationNo ?? f.registrationNo,
        carMake: lookupVehicle.make ?? f.carMake,
        carModel: lookupVehicle.model ?? f.carModel,
        carVariant: lookupVehicle.variant ?? f.carVariant,
        carYear: lookupVehicle.year ?? f.carYear,
      } : {}),
    }))
    if (lookupVehicle?.inventoryId) {
      setSelectedVehicle(vehicles.find(vehicle => vehicle.inventoryId === lookupVehicle.inventoryId) ?? null)
      setVehicleLookupMessage(`Copied vehicle details from the selected inquiry.`)
    }
  }

  const selectLoanMode = (mode: 'existing' | 'manual') => {
    setLoanMode(mode)
    if (mode === 'manual') {
      setSelectedCustomer(null)
      setForm(current => ({ ...current, customerId: null, customerNameLegacy: '', customerMobileLegacy: '', customerEmailLegacy: '' }))
    }
  }

  const findVehicleByRegistration = () => {
    const registrationNo = form.registrationNo.trim()
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

  const f = <K extends keyof LoanFormInput>(k: K, v: LoanFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

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
    const newErrors: Record<string, string> = {}

    if (!form.registrationNo?.trim()) {
      newErrors.registrationNo = 'Registration number is required.'
    }
    if (!form.bankName?.trim()) {
      newErrors.bankName = 'Bank name is required.'
    }
    if (loanMode === 'existing' && !form.customerId) {
      newErrors.customer = 'Select or create the customer first.'
    }
    if (loanMode === 'manual' && !form.customerNameLegacy.trim()) {
      newErrors.customerNameLegacy = 'Customer name is required for a manual customer.'
    }
    if (!form.carMake.trim()) newErrors.carMake = 'Car make is required.'
    if (!form.carModel.trim()) newErrors.carModel = 'Car model is required.'
    if (!form.carVariant.trim()) newErrors.carVariant = 'Car variant is required.'
    if (form.carYear === null) newErrors.carYear = 'Car year is required.'
    if (form.loanAmount === null) {
      newErrors.loanAmount = 'Loan amount is required.'
    } else if (form.loanAmount <= 0) {
      newErrors.loanAmount = 'Loan amount must be greater than zero.'
    }
    if (form.percentagePayoutAmount === null) {
      newErrors.percentagePayoutAmount = 'Payout percentage is required.'
    } else if (form.percentagePayoutAmount < 0 || form.percentagePayoutAmount > 100) {
      newErrors.percentagePayoutAmount = 'Use a percentage from 0 to 100.'
    }
    if (!editId) {
      const payout = form.loanAmount !== null && form.percentagePayoutAmount !== null
        ? Math.round((form.loanAmount * form.percentagePayoutAmount) / 100 * 100) / 100
        : null
      if (form.initialAmountReceived === null || form.initialAmountReceived <= 0 || (payout !== null && form.initialAmountReceived > payout)) {
        newErrors.initialAmountReceived = payout !== null && form.initialAmountReceived !== null && form.initialAmountReceived > payout
          ? 'Initial received amount cannot exceed payout.'
          : 'Initial received amount is required.'
      }
    }
    if (form.carYear !== null && !isValidYear(form.carYear)) {
      newErrors.carYear = 'Enter a valid car year.'
    }
    if (form.followupDate && form.followupDate < todayDateValue()) {
      newErrors.followupDate = 'Follow-up date cannot be in the past.'
    }
    if (form.bankPersonMobileNo && !isValidPhone(form.bankPersonMobileNo)) {
      newErrors.bankPersonMobileNo = 'Enter a valid 10-digit bank mobile number.'
    }
    if (form.bankPersonEmailId && !isValidEmail(form.bankPersonEmailId)) {
      newErrors.bankPersonEmailId = 'Enter a valid bank email address.'
    }
    if (form.customerMobileLegacy && !isValidPhone(form.customerMobileLegacy)) {
      newErrors.customerMobileLegacy = 'Enter a valid 10-digit customer mobile number.'
    }
    if (form.customerEmailLegacy && !isValidEmail(form.customerEmailLegacy)) {
      newErrors.customerEmailLegacy = 'Enter a valid customer email address.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      const result = editId ? await updateLoan(editId, form) : await createLoan(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setSavedFormSnapshot(JSON.stringify(form))
      setSavedCustomerSnapshot(optionSnapshot(selectedCustomer))
      setSavedBankContactSnapshot(optionSnapshot(selectedBankContact))
      setSavedVehicleSnapshot(optionSnapshot(selectedVehicle))
      closeForm()
      window.location.reload()
    })
  }

  const del = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteLoan(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.loanManagementId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  const openPay = async (r: LoanRow) => {
    const requestId = ++historyRequestRef.current
    setPayRow(r)
    const received = Number(r.totalAmountReceived ?? 0)
    const payout = Number(r.payoutAmount ?? 0)
    setPayForm({ ...emptyPayment(), paymentStatus: payout > 0 && received > 0 && received < payout ? 'Partial' : r.paymentStatus ?? 'Partial' })
    setError('')
    setErrors({})
    setPayments([])
    setFollowups([])
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/loan/history?loanManagementId=${r.loanManagementId}`)
      const hist = await res.json().catch(() => ({ payments: [], followups: [] }))
      if (historyRequestRef.current !== requestId) return
      setPayments(Array.isArray(hist.payments) ? hist.payments : [])
      setFollowups(Array.isArray(hist.followups) ? hist.followups : [])
    } catch {
      if (historyRequestRef.current !== requestId) return
      setPayments([])
      setFollowups([])
      setError('Could not load payment history.')
    } finally {
      if (historyRequestRef.current === requestId) setHistoryLoading(false)
    }
  }

  const pf = <K extends keyof LogLoanPaymentInput>(k: K, v: LogLoanPaymentInput[K]) => setPayForm(prev => ({ ...prev, [k]: v }))

  const savePayment = () => {
    if (!payRow) return
    setError('')
    const newErrors: Record<string, string> = {}

    if (payForm.amountPaid === null) {
      newErrors.amountPaid = 'Amount paid is required.'
    } else if (payForm.amountPaid <= 0) {
      newErrors.amountPaid = 'Amount paid must be greater than zero.'
    }
    const totalPaidAlready = payments.reduce((sum, p) => sum + Number(p.amountPaid ?? 0), 0)
    const payoutAmt = Number(payRow.payoutAmount ?? 0)
    if (payForm.amountPaid !== null && (totalPaidAlready + payForm.amountPaid > payoutAmt)) {
      newErrors.amountPaid = 'Amount paid cannot exceed the pending payout.'
    }
    if (payForm.amountPaid !== null && payoutAmt > 0 && totalPaidAlready + payForm.amountPaid <= payoutAmt) {
      const expectedStatus = totalPaidAlready + payForm.amountPaid === payoutAmt ? 'Paid' : 'Partial'
      if (payForm.paymentStatus !== expectedStatus) newErrors.paymentStatus = `Select ${expectedStatus} for this payment total.`
    }
    if (payForm.paymentStatus === 'Pending' || payForm.paymentStatus === 'Partial') {
      if (!payForm.nextFollowUpDate?.trim()) {
        newErrors.nextFollowUpDate = 'Next follow-up date is required.'
      } else {
        const today = new Date().toISOString().slice(0, 10)
        if (payForm.nextFollowUpDate < today) {
          newErrors.nextFollowUpDate = 'Next follow-up date cannot be in the past.'
        }
      }
    }
    if ((payForm.paymentStatus === 'Pending' || payForm.paymentStatus === 'Partial') && !payForm.remark?.trim()) {
      newErrors.remark = 'Remark is required for pending or partial payment.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      const result = await logLoanPayment(payRow.loanManagementId, payForm)
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
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== 'All') params.set(key, String(value))
        })
        window.location.assign(`/api/loan/export${params.size ? `?${params}` : ''}`)
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Could not export loan records.')
      }
    })
  }

  const setFilter = <K extends keyof LoanFilters>(key: K, value: LoanFilters[K]) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    const params = new URLSearchParams()
    Object.entries(next).forEach(([name, current]) => {
      if (current && current !== 'All') params.set(name, String(current))
    })
    startTransition(() => router.push(`/loan${params.size ? `?${params}` : ''}`))
  }

  const navigatePage = (nextPage: number, nextPageSize = pageSize) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([name, current]) => {
      if (current && current !== 'All') params.set(name, String(current))
    })
    if (nextPage > 1) params.set('page', String(nextPage))
    if (nextPageSize !== 25) params.set('pageSize', String(nextPageSize))
    startTransition(() => router.push(`/loan${params.size ? `?${params}` : ''}`))
  }

  return (
    <div>
      <PageHeader
        title="Loan Management"
        subtitle={`${filtered.length} referral loans`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={exportRows} disabled={isExporting || filtered.length === 0}>
              <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : `${Object.values(filters).some(v => v && v !== 'All') ? 'Export Filtered' : 'Export All'} (${filtered.length})`}
            </Btn>
            <Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Loan</Btn>
          </div>
        }
      />

      <LoanFiltersPanel filters={filters} onChange={setFilter} onReset={() => {
        setFilters(emptyFilters())
        startTransition(() => router.push('/loan'))
      }} />
      {exportError && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{exportError}</div>}

      <Table minWidthClass="min-w-full" headers={['Reg No', 'Customer', 'Bank', 'Loan Amount', 'Payout', 'Received', 'Status', 'Follow-up', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.loanManagementId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{r.registrationNo ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{r.customer?.custName ?? r.customerNameLegacy ?? '—'}</div>
              <div className="text-xs text-gray-500 font-mono">{r.customerMobileLegacy ?? ''}</div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-700">{r.bankName ?? '—'}</div>
              <div className="text-xs text-gray-500">{r.partnerMaster?.name ?? ''}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.loanAmount)}</td>
            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmtMoney(r.payoutAmount)}</td>
            <td className="px-4 py-3 text-sm text-gray-600"><div>{fmtMoney(r.totalAmountReceived)}</div><div className="mt-1 text-xs font-medium text-orange-700">{fmtMoney(Math.max(0, Number(r.payoutAmount ?? 0) - Number(r.totalAmountReceived ?? 0)))} pending</div></td>
            <td className="px-4 py-3">{r.paymentStatus ? <Badge label={r.paymentStatus} /> : '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.followupDate) || '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openView(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="View"><Eye className="w-3.5 h-3.5" /></button>
                <button onClick={() => openPay(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Log Payment"><IndianRupee className="w-3.5 h-3.5" /></button>
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.loanManagementId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <LoanPagination total={total} page={page} pageSize={pageSize} pageCount={pageCount} pending={isPending} onNavigate={navigatePage} />

      <Modal title={editId ? 'Edit Loan' : 'Add Loan'} open={!!modal} onClose={requestCloseForm} width="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bank Name *" value={form.bankName} onChange={e => f('bankName', e.target.value)} placeholder="HDFC Bank, SBI..." error={!!errors.bankName} errorMessage={errors.bankName} />
            <Input label="Bank Person Name" value={form.bankPersonName} onChange={e => f('bankPersonName', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Bank Person Mobile No" value={form.bankPersonMobileNo} onChange={e => f('bankPersonMobileNo', e.target.value)} error={!!errors.bankPersonMobileNo} errorMessage={errors.bankPersonMobileNo} />
            <Input label="Bank Person Email ID" type="email" value={form.bankPersonEmailId} onChange={e => f('bankPersonEmailId', e.target.value)} error={!!errors.bankPersonEmailId} errorMessage={errors.bankPersonEmailId} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Customer Source *</label>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => selectLoanMode('existing')} className={`rounded-md px-3 py-2 text-sm font-medium transition ${loanMode === 'existing' ? 'bg-white text-[#1B2A6B] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Existing customer</button>
              <button type="button" onClick={() => selectLoanMode('manual')} className={`rounded-md px-3 py-2 text-sm font-medium transition ${loanMode === 'manual' ? 'bg-white text-[#1B2A6B] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Manual entry</button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Choose a Customer Master record or enter this customer manually. Every loan has a customer.</p>
          </div>

          {loanMode === 'existing' ? <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Customer *</label>
            <LoanCustomerLookup value={selectedCustomer} onChange={onCustomerChange} error={!!errors.customer} />
            {errors.customer && <p className="mt-1 text-xs text-red-600">{errors.customer}</p>}
          </div> : <div className="grid grid-cols-3 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <Input label="Customer Name *" value={form.customerNameLegacy} onChange={event => f('customerNameLegacy', event.target.value)} error={!!errors.customerNameLegacy} errorMessage={errors.customerNameLegacy} />
            <Input label="Customer Mobile" inputMode="numeric" maxLength={10} value={form.customerMobileLegacy} onChange={event => f('customerMobileLegacy', event.target.value.replace(/\D/g, ''))} error={!!errors.customerMobileLegacy} errorMessage={errors.customerMobileLegacy} />
            <Input label="Customer Email" type="email" value={form.customerEmailLegacy} onChange={event => f('customerEmailLegacy', event.target.value)} error={!!errors.customerEmailLegacy} errorMessage={errors.customerEmailLegacy} />
          </div>}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Vehicle (optional — link if from our stock)</label>
            {selectedVehicle ? (
              <div className={`flex items-center justify-between border ${errors.inventoryId ? 'border-red-500' : 'border-gray-200'} rounded-md px-3 py-2 bg-gray-50`}>
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Car className="w-4 h-4 text-gray-400" />{vehicleLabel(selectedVehicle)}
                </div>
                <button type="button" onClick={() => { setSelectedVehicle(null); setForm(fm => ({ ...fm, inventoryId: null, fkVariantId: null })) }} className="text-gray-400 hover:text-red-600">
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
                  error={!!errors.inventoryId}
                />
                {vehicleOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-3 py-2 text-xs text-gray-500">
                      <span>Matching stock vehicles</span>
                      <button type="button" onClick={() => setVehicleOpen(false)} className="font-medium text-[#1B2A6B] hover:underline">Close</button>
                    </div>
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
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <Input label="Registration No * (manual or stock)" value={form.registrationNo} onChange={e => { f('registrationNo', e.target.value); setVehicleLookupMessage('') }} error={!!errors.registrationNo} errorMessage={errors.registrationNo} disabled={!!selectedVehicle} className={selectedVehicle ? 'bg-gray-100 text-gray-500' : ''} />
              <Btn type="button" variant="outline" size="sm" onClick={findVehicleByRegistration} disabled={!!selectedVehicle}>Find Stock</Btn>
            </div>
            {selectedVehicle ? <p className="mt-1 text-xs text-gray-500">Vehicle fields are locked from stock. Remove the selected vehicle above to enter them manually.</p> : vehicleLookupMessage && <p className="mt-1 text-xs text-gray-500">{vehicleLookupMessage}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select label="Car Type *" value={form.carType} onChange={e => f('carType', e.target.value)}>
              {CAR_TYPES.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Input label="Make *" value={form.carMake} onChange={e => f('carMake', e.target.value)} error={!!errors.carMake} errorMessage={errors.carMake} disabled={!!selectedVehicle} className={selectedVehicle ? 'bg-gray-100 text-gray-500' : ''} />
            <Input label="Model *" value={form.carModel} onChange={e => f('carModel', e.target.value)} error={!!errors.carModel} errorMessage={errors.carModel} disabled={!!selectedVehicle} className={selectedVehicle ? 'bg-gray-100 text-gray-500' : ''} />
            <Input label="Variant *" value={form.carVariant} onChange={e => f('carVariant', e.target.value)} error={!!errors.carVariant} errorMessage={errors.carVariant} disabled={!!selectedVehicle} className={selectedVehicle ? 'bg-gray-100 text-gray-500' : ''} />
            <Input label="Year *" type="number" value={form.carYear ?? ''} onChange={e => f('carYear', e.target.value ? +e.target.value : null)} error={!!errors.carYear} errorMessage={errors.carYear} disabled={!!selectedVehicle} className={selectedVehicle ? 'bg-gray-100 text-gray-500' : ''} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Entry Date" type="date" value={form.entryDate} onChange={e => f('entryDate', e.target.value)} />
            <Input label="Loan Amount (₹) *" type="number" value={form.loanAmount ?? ''} onChange={e => f('loanAmount', e.target.value ? +e.target.value : null)} error={!!errors.loanAmount} errorMessage={errors.loanAmount} />
            <Input label="Payout % of Loan *" type="number" value={form.percentagePayoutAmount ?? ''} onChange={e => f('percentagePayoutAmount', e.target.value ? +e.target.value : null)} error={!!errors.percentagePayoutAmount} errorMessage={errors.percentagePayoutAmount} />
            <Input label="Payout Amount (auto)" value={form.payoutAmount != null ? `₹${form.payoutAmount.toLocaleString('en-IN')}` : ''} readOnly className="bg-gray-50" />
            {!editId && <Input label="Initial Amount Received (₹) *" type="number" value={form.initialAmountReceived ?? ''} onChange={e => f('initialAmountReceived', e.target.value ? +e.target.value : null)} error={!!errors.initialAmountReceived} errorMessage={errors.initialAmountReceived} />}
            <Select label="Payment Status *" value={form.paymentStatus} onChange={e => f('paymentStatus', e.target.value)}>
              {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Payment Date" type="date" value={form.paymentDate} onChange={e => f('paymentDate', e.target.value)} />
            <Input label="Follow-up Date" type="date" min={todayDateValue()} value={form.followupDate} onChange={e => f('followupDate', e.target.value)} error={!!errors.followupDate} errorMessage={errors.followupDate} />
          </div>
          <Textarea label="Remarks" value={form.remarks} onChange={e => f('remarks', e.target.value)} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={requestCloseForm} disabled={isPending}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Loan'}</Btn>
          </div>
        </div>
      </Modal>

      <Modal title={`View Loan${viewRow ? ` — ${viewRow.registrationNo ?? ''}` : ''}`} open={!!viewRow} onClose={() => setViewRow(null)} width="max-w-4xl">
        {viewRow && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2"><span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Loan #{viewRow.loanManagementId}</span><span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-[#1B2A6B]">{viewRow.customerId ? 'Customer Master' : 'Manual customer'}</span></div>
                  <div className="mt-3 text-2xl font-bold text-gray-900">{viewRow.customer?.custName ?? viewRow.customerNameLegacy ?? 'Customer not added'}</div>
                  <div className="mt-1 text-sm text-gray-600">Registration {viewRow.registrationNo ?? 'not added'} · Raised {fmtDate(viewRow.entryDate) || '—'} · { [clean(viewRow.carMake), clean(viewRow.carModel), clean(viewRow.carVariant)].filter(Boolean).join(' ') || 'Vehicle not added' }</div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <Badge label={viewRow.paymentStatus ?? 'Pending'} />
                  <div className="flex flex-wrap gap-2">
                    <Btn size="sm" variant="outline" onClick={() => { setViewRow(null); openEdit(viewRow) }}><Pencil className="h-3.5 w-3.5" />Edit</Btn>
                    <Btn size="sm" onClick={() => { setViewRow(null); void openPay(viewRow) }}><IndianRupee className="h-3.5 w-3.5" />Log Payment</Btn>
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              const followUp = viewRow.followupDate ? new Date(viewRow.followupDate) : null
              const isOpen = Number(viewRow.payoutAmount ?? 0) > Number(viewRow.totalAmountReceived ?? 0)
              if (!followUp || Number.isNaN(followUp.getTime()) || !isOpen) return null
              const today = new Date(); today.setHours(0, 0, 0, 0)
              const followUpDay = new Date(followUp); followUpDay.setHours(0, 0, 0, 0)
              const overdueDays = Math.floor((today.getTime() - followUpDay.getTime()) / 86_400_000)
              const message = overdueDays > 0 ? `Follow-up was due on ${fmtDate(followUp)} and is overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}.` : `Next follow-up is scheduled for ${fmtDate(followUp)}.`
              return <div className={`${overdueDays > 0 ? 'border-red-100 bg-red-50 text-red-700' : 'border-amber-100 bg-amber-50 text-amber-800'} flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm`}><span>{message}</span><Btn size="sm" variant="outline" onClick={() => { setViewRow(null); void openPay(viewRow) }}>{overdueDays > 0 ? 'Log payment' : 'Update follow-up'}</Btn></div>
            })()}

            {(() => {
              const payout = Number(viewRow.payoutAmount ?? 0)
              const received = Number(viewRow.totalAmountReceived ?? 0)
              const balance = Math.max(payout - received, 0)
              const progress = payout > 0 ? Math.min((received / payout) * 100, 100) : 0
              return <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Payout amount</div><div className="mt-1 text-lg font-bold text-gray-900">{fmtMoney(viewRow.payoutAmount)}</div></div>
                  <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-green-700">Amount received</div><div className="mt-1 text-lg font-bold text-green-800">{fmtMoney(viewRow.totalAmountReceived)}</div></div>
                  <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">Pending payout</div><div className="mt-1 text-lg font-bold text-orange-800">{fmtMoney(balance)}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-green-500" style={{ width: `${progress}%` }} /></div></div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between"><div className="text-sm font-semibold text-gray-800">Payment workflow</div>{viewRow.paymentStatus !== 'Received' && <span className="text-xs font-medium text-amber-700">Action needed</span>}</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={`rounded-lg px-3 py-2 ${balance > 0 ? 'bg-amber-50' : 'bg-green-50'}`}><div className="text-[11px] uppercase tracking-wide text-gray-500">Payment status</div><div className="mt-1 flex items-center gap-2"><Badge label={viewRow.paymentStatus ?? 'Pending'} />{balance > 0 && <span className="text-xs text-amber-700">{fmtMoney(balance)} due</span>}</div></div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2"><div className="text-[11px] uppercase tracking-wide text-gray-500">Next follow-up</div><div className="mt-1 text-sm font-semibold text-gray-800">{fmtDate(viewRow.followupDate) || 'Not scheduled'}</div></div>
                  </div>
                </div>
              </>
            })()}

            <div className="text-sm font-semibold text-gray-800">Customer details</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Registration No</div>
                <div className="mt-1 font-mono text-sm font-semibold text-gray-900">{viewRow.registrationNo ?? '—'}</div>
              </div>
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

            <div className="border-t border-gray-100 pt-5 text-sm font-semibold text-gray-800">Bank contact</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Bank Name</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.bankName ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Bank Person</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.bankPersonName ?? viewRow.partnerMaster?.name ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Bank Person Mobile</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.bankPersonMobileNo ?? viewRow.partnerMaster?.mobile ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2 xl:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Bank Person Email</div>
                <div className="mt-1 text-sm font-medium text-gray-900 break-all">{viewRow.bankPersonEmailId ?? viewRow.partnerMaster?.email ?? '—'}</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 text-sm font-semibold text-gray-800">Vehicle details</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Car Type</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.carType ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Vehicle</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{[clean(viewRow.carMake), clean(viewRow.carModel), clean(viewRow.carVariant)].filter(Boolean).join(' ') || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Car Year</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.carYear ?? '—'}</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 text-sm font-semibold text-gray-800">Loan details</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Entry Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDate(viewRow.entryDate) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Loan Amount</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtMoney(viewRow.loanAmount)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Payout %</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.percentagePayoutAmount ?? '—'}</div>
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
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment Status</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.paymentStatus ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDate(viewRow.paymentDate) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Follow-up Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDate(viewRow.followupDate) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2 xl:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Remarks</div>
                <div className="mt-1 text-sm font-medium text-gray-900 whitespace-pre-wrap">{viewRow.remarks ?? '—'}</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 text-sm font-semibold text-gray-800">Record activity</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDateTime(viewRow.createdDate)}</div>
                <div className="mt-1 text-xs text-gray-500">
                  By {viewRow.createdByUser?.displayName ?? viewRow.createdByUser?.userName ?? (viewRow.createdBy ? `User #${viewRow.createdBy}` : '—')}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Last Updated</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDateTime(viewRow.updatedDate)}</div>
                <div className="mt-1 text-xs text-gray-500">
                  By {viewRow.updatedByUser?.displayName ?? viewRow.updatedByUser?.userName ?? (viewRow.updatedBy ? `User #${viewRow.updatedBy}` : '—')}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Btn variant="outline" onClick={() => { setViewRow(null); openEdit(viewRow) }}><Pencil className="h-4 w-4" />Edit Loan</Btn>
              <Btn onClick={() => { setViewRow(null); void openPay(viewRow) }}><IndianRupee className="h-4 w-4" />Log Payment</Btn>
              <Btn variant="outline" onClick={() => setViewRow(null)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={`Log Payment${payRow ? ` — ${payRow.registrationNo ?? ''}` : ''}`} open={!!payRow} onClose={() => setPayRow(null)}>
        {payRow && (
          <div className="space-y-4">
            {(() => {
              const payout = Number(payRow.payoutAmount ?? 0)
              const received = payments.length > 0 ? payments.reduce((sum, payment) => sum + Number(payment.amountPaid ?? 0), 0) : Number(payRow.totalAmountReceived ?? 0)
              const pending = Math.max(0, payout - received)
              const settled = pending === 0 && payout > 0
              const displayStatus = settled ? 'Paid' : received > 0 ? 'Partial' : 'Pending'
              return <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"><div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Payout Amount</div><div className="mt-1 text-sm font-bold text-gray-900">{fmtMoney(payout)}</div></div>
                  <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2"><div className="text-[11px] font-semibold uppercase tracking-wide text-green-700">Amount Paid</div><div className="mt-1 flex items-center gap-2 text-sm font-bold text-green-800">{fmtMoney(received)}<Badge label={displayStatus} /></div></div>
                  <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2"><div className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">Pending Balance</div><div className="mt-1 text-sm font-bold text-orange-800">{fmtMoney(pending)}</div></div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Workflow</div><div className={`text-xs font-medium ${settled ? 'text-green-700' : 'text-orange-700'}`}>{settled ? 'Completed' : 'Action needed'}</div></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2"><div className="text-xs text-gray-500">Payment status</div><div className="mt-1"><Badge label={displayStatus} /></div></div>
                    <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2"><div className="text-xs text-gray-500">Next follow-up</div><div className="mt-1 text-sm font-medium text-gray-800">{settled ? 'No follow-up needed' : fmtDate(payRow.followupDate) || 'Set follow-up date'}</div></div>
                  </div>
                </div>
              </>
            })()}
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
                    <div key={p.loanPaymentId} className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span className="text-gray-400 whitespace-nowrap">{fmtDate(p.createdDt)}</span>
                      <span className="font-medium">{fmtMoney(p.amountPaid)}</span>
                      {p.paymentStatus && <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-700">Payment: {p.paymentStatus}</span>}
                    </div>
                  ))}
                </div>
              )}
              {followups.length > 0 && (
                <div className="mt-2 space-y-1 border border-gray-100 rounded-lg bg-gray-50 p-2 text-xs text-gray-500 max-h-32 overflow-y-auto">
                  {followups.map(fu => (
                    <div key={fu.loanFollowupId} className="flex flex-wrap items-center gap-2"><span>{fmtDate(fu.followupDate)}</span><span className="rounded bg-yellow-100 px-2 py-0.5 font-medium text-yellow-700">Follow-up</span><span>{fu.remark ?? '—'}</span></div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Amount Paid (₹) *" type="number" value={payForm.amountPaid ?? ''} onChange={e => pf('amountPaid', e.target.value ? +e.target.value : null)} error={!!errors.amountPaid} errorMessage={errors.amountPaid} />
              <Select label="Payment Status *" value={payForm.paymentStatus} onChange={e => pf('paymentStatus', e.target.value)} error={!!errors.paymentStatus} errorMessage={errors.paymentStatus}>
                {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Input label={`Next Follow-up Date${payForm.paymentStatus === 'Pending' || payForm.paymentStatus === 'Partial' ? ' *' : ''}`} type="date" value={payForm.nextFollowUpDate} onChange={e => pf('nextFollowUpDate', e.target.value)} error={!!errors.nextFollowUpDate} errorMessage={errors.nextFollowUpDate} />
            </div>
            <Textarea label={`Remark${payForm.paymentStatus === 'Pending' || payForm.paymentStatus === 'Partial' ? ' *' : ''}`} value={payForm.remark} onChange={e => pf('remark', e.target.value)} error={!!errors.remark} errorMessage={errors.remark} />

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => setPayRow(null)}>Cancel</Btn>
              <Btn onClick={savePayment} disabled={isPending}>{isPending ? 'Saving...' : 'Save Payment'}</Btn>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this loan record? This cannot be undone." />
      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={closeForm}
        message="You have unsaved changes in this loan form. Discard them and close?"
      />
    </div>
  )
}
