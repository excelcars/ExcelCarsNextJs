'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'
import { Badge, Btn, Input, Select, Table, PageHeader } from '@/components/ui'
import {
  OUTSTANDING_PAGE_SIZES,
  OUTSTANDING_PAYMENT_STATUSES,
  OUTSTANDING_TYPES,
  type OutstandingRow,
  getOutstandingDrillThroughHref,
} from './rules'
import { buildOutstandingCsv } from './csv'

const fmtMoney = (n: number | null | undefined) => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function fmtDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function fmtPercent(value: number | null) {
  if (value === null || value === undefined) return '—'
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`
}

function buildExportParams(filters: {
  customerName: string
  customerMobile: string
  registrationNo: string
  type: string
  paymentStatus: string
}) {
  const params = new URLSearchParams()

  if (filters.customerName) params.set('customerName', filters.customerName)
  if (filters.customerMobile) params.set('customerMobile', filters.customerMobile)
  if (filters.registrationNo) params.set('registrationNo', filters.registrationNo)
  if (filters.type && filters.type !== 'All') params.set('type', filters.type)
  if (filters.paymentStatus && filters.paymentStatus !== 'All') params.set('paymentStatus', filters.paymentStatus)

  return params
}

function downloadCsv(rows: OutstandingRow[]) {
  const blob = new Blob([buildOutstandingCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'outstanding-payments.csv'
  a.click()
  URL.revokeObjectURL(url)
}

async function readJsonResponse<T>(res: Response): Promise<T | null> {
  const textBody = await res.text()
  if (!textBody.trim()) return null
  try {
    return JSON.parse(textBody) as T
  } catch {
    return null
  }
}

interface CustomerSuggestion {
  custId: number
  custName: string
  custMobile: string | null
  custEmail: string | null
}

function AutocompleteInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  loading,
  open,
  suggestions,
  emptyMessage,
  error,
  onFocus,
  onSelect,
  renderSuggestion,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  loading: boolean
  open: boolean
  suggestions: string[] | CustomerSuggestion[]
  emptyMessage: string
  error: string
  onFocus: () => void
  onSelect: (value: string) => void
  renderSuggestion: (item: string | CustomerSuggestion) => { key: string; title: string; subtitle?: string | null; value: string }
}) {
  return (
    <div className="relative">
      <Input
        label={label}
        value={value}
        onChange={event => onChange(event.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        disabled={disabled}
      />
      {open ? (
        <div className="absolute z-10 mt-1 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg max-h-56">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>
          ) : error ? (
            <div className="px-3 py-2 text-sm text-red-500">{error}</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">{emptyMessage}</div>
          ) : (
            suggestions.map(item => {
              const suggestion = renderSuggestion(item)
              return (
                <button
                  key={suggestion.key}
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => onSelect(suggestion.value)}
                  className="w-full border-b border-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-50 last:border-0"
                >
                  <div className="font-medium text-gray-800">{suggestion.title}</div>
                  {suggestion.subtitle ? <div className="text-xs text-gray-500">{suggestion.subtitle}</div> : null}
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}

interface OutstandingClientProps {
  initialData: OutstandingRow[]
  initialCustomerName: string
  initialCustomerMobile: string
  initialRegistrationNo: string
  initialType: string
  initialPaymentStatus: string
  total: number
  totalBalance: number
  page: number
  pageCount: number
  pageSize: number
}

export function OutstandingClient({
  initialData,
  initialCustomerName,
  initialCustomerMobile,
  initialRegistrationNo,
  initialType,
  initialPaymentStatus,
  total,
  totalBalance,
  page,
  pageCount,
  pageSize,
}: OutstandingClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isExporting, startExportTransition] = useTransition()
  const [exportError, setExportError] = useState('')
  const [rows, setRows] = useState(initialData)
  const [customerName, setCustomerName] = useState(initialCustomerName)
  const [customerMobile, setCustomerMobile] = useState(initialCustomerMobile)
  const [registrationNo, setRegistrationNo] = useState(initialRegistrationNo)
  const [filterType, setFilterType] = useState(initialType)
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus)
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([])
  const [customerOpen, setCustomerOpen] = useState(false)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [customerError, setCustomerError] = useState('')
  const [registrationSuggestions, setRegistrationSuggestions] = useState<string[]>([])
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [registrationError, setRegistrationError] = useState('')
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const registrationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const customerRequestRef = useRef(0)
  const registrationRequestRef = useRef(0)

  useEffect(() => {
    setRows(initialData)
  }, [initialData])

  useEffect(() => {
    setCustomerName(initialCustomerName)
    setCustomerMobile(initialCustomerMobile)
    setRegistrationNo(initialRegistrationNo)
    setFilterType(initialType)
    setPaymentStatus(initialPaymentStatus)
  }, [initialCustomerMobile, initialCustomerName, initialPaymentStatus, initialRegistrationNo, initialType])

  useEffect(() => {
    if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current)
    if (customerName.trim().length < 2) {
      setCustomerSuggestions([])
      setCustomerLoading(false)
      setCustomerError('')
      return
    }

    customerDebounceRef.current = setTimeout(async () => {
      const requestId = ++customerRequestRef.current
      setCustomerLoading(true)
      setCustomerError('')
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(customerName.trim())}`)
        const payload = await readJsonResponse<CustomerSuggestion[] | { error?: string }>(res)
        if (customerRequestRef.current !== requestId) return
        if (!res.ok) {
          setCustomerSuggestions([])
          setCustomerError(payload && !Array.isArray(payload) && payload.error ? payload.error : 'Could not load customers.')
          return
        }
        setCustomerSuggestions(Array.isArray(payload) ? payload : [])
      } catch {
        if (customerRequestRef.current !== requestId) return
        setCustomerSuggestions([])
        setCustomerError('Could not load customers.')
      } finally {
        if (customerRequestRef.current === requestId) setCustomerLoading(false)
      }
    }, 250)

    return () => {
      if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current)
    }
  }, [customerName])

  useEffect(() => {
    if (registrationDebounceRef.current) clearTimeout(registrationDebounceRef.current)
    if (registrationNo.trim().length < 2) {
      setRegistrationSuggestions([])
      setRegistrationLoading(false)
      setRegistrationError('')
      return
    }

    registrationDebounceRef.current = setTimeout(async () => {
      const requestId = ++registrationRequestRef.current
      setRegistrationLoading(true)
      setRegistrationError('')
      try {
        const res = await fetch(`/api/reports/outstanding/registrations?q=${encodeURIComponent(registrationNo.trim())}`)
        const payload = await readJsonResponse<string[] | { error?: string }>(res)
        if (registrationRequestRef.current !== requestId) return
        if (!res.ok) {
          setRegistrationSuggestions([])
          setRegistrationError(payload && !Array.isArray(payload) && payload.error ? payload.error : 'Could not load registrations.')
          return
        }
        setRegistrationSuggestions(Array.isArray(payload) ? payload : [])
      } catch {
        if (registrationRequestRef.current !== requestId) return
        setRegistrationSuggestions([])
        setRegistrationError('Could not load registrations.')
      } finally {
        if (registrationRequestRef.current === requestId) setRegistrationLoading(false)
      }
    }, 250)

    return () => {
      if (registrationDebounceRef.current) clearTimeout(registrationDebounceRef.current)
    }
  }, [registrationNo])

  const pushQuery = (next: {
    customerName: string
    customerMobile: string
    registrationNo: string
    type: string
    paymentStatus: string
    page: number
    pageSize: number
  }) => {
    const params = new URLSearchParams()

    if (next.customerName) params.set('customerName', next.customerName)
    if (next.customerMobile) params.set('customerMobile', next.customerMobile)
    if (next.registrationNo) params.set('registrationNo', next.registrationNo)
    if (next.type !== 'All') params.set('type', next.type)
    if (next.paymentStatus !== 'All') params.set('paymentStatus', next.paymentStatus)
    if (next.page > 1) params.set('page', String(next.page))
    if (next.pageSize !== 25) params.set('pageSize', String(next.pageSize))

    startTransition(() => {
      router.push(`/reports/outstanding${params.toString() ? `?${params.toString()}` : ''}`)
    })
  }

  const applyFilters = () => {
    pushQuery({
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      registrationNo: registrationNo.trim(),
      type: filterType,
      paymentStatus,
      page: 1,
      pageSize,
    })
  }

  const clearFilters = () => {
    setCustomerName('')
    setCustomerMobile('')
    setRegistrationNo('')
    setFilterType('All')
    setPaymentStatus('All')
    setCustomerOpen(false)
    setRegistrationOpen(false)
    pushQuery({
      customerName: '',
      customerMobile: '',
      registrationNo: '',
      type: 'All',
      paymentStatus: 'All',
      page: 1,
      pageSize,
    })
  }

  const exportRows = () => {
    setExportError('')
    startExportTransition(async () => {
      const params = buildExportParams({
        customerName: initialCustomerName,
        customerMobile: initialCustomerMobile,
        registrationNo: initialRegistrationNo,
        type: initialType,
        paymentStatus: initialPaymentStatus,
      })

      try {
        const res = await fetch(`/api/reports/outstanding/export${params.toString() ? `?${params.toString()}` : ''}`)
        const payload = await readJsonResponse<OutstandingRow[] | { error?: string }>(res)
        if (!res.ok) {
          setExportError(payload && !Array.isArray(payload) && payload.error ? payload.error : 'Could not export outstanding payments.')
          return
        }
        if (!payload || !Array.isArray(payload)) {
          setExportError('Could not export outstanding payments.')
          return
        }
        downloadCsv(payload)
      } catch {
        setExportError('Could not export outstanding payments.')
      }
    })
  }

  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const pageEnd = total === 0 ? 0 : pageStart + rows.length - 1

  const hasActiveFilters = useMemo(() => {
    return Boolean(initialCustomerName || initialCustomerMobile || initialRegistrationNo || initialType !== 'All' || initialPaymentStatus !== 'All')
  }, [initialCustomerMobile, initialCustomerName, initialPaymentStatus, initialRegistrationNo, initialType])

  return (
    <div>
      <PageHeader
        title="Outstanding Payments"
        subtitle={`${total.toLocaleString('en-IN')} records · Page ${page} of ${pageCount} · ${pageSize} per page`}
        action={
          <Btn variant="outline" size="sm" onClick={exportRows} disabled={isExporting}>
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Btn>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <AutocompleteInput
          label="Customer Name"
          value={customerName}
          onChange={value => {
            setCustomerName(value)
            setCustomerOpen(true)
            setCustomerError('')
          }}
          onFocus={() => setCustomerOpen(customerName.trim().length >= 2)}
          placeholder="Filter by customer name"
          disabled={isPending}
          loading={customerLoading}
          open={customerOpen && customerName.trim().length >= 2}
          suggestions={customerSuggestions}
          emptyMessage="No customer matches"
          error={customerError}
          onSelect={value => {
            setCustomerName(value)
            setCustomerOpen(false)
          }}
          renderSuggestion={item => {
            const customer = item as CustomerSuggestion
            return {
              key: String(customer.custId),
              title: customer.custName,
              subtitle: customer.custMobile ?? customer.custEmail ?? null,
              value: customer.custName,
            }
          }}
        />
        <Input
          label="Customer Mobile"
          value={customerMobile}
          onChange={event => setCustomerMobile(event.target.value)}
          placeholder="Filter by customer mobile"
          disabled={isPending}
        />
        <AutocompleteInput
          label="Car Registration No"
          value={registrationNo}
          onChange={value => {
            setRegistrationNo(value)
            setRegistrationOpen(true)
            setRegistrationError('')
          }}
          onFocus={() => setRegistrationOpen(registrationNo.trim().length >= 2)}
          placeholder="Filter by registration no"
          disabled={isPending}
          loading={registrationLoading}
          open={registrationOpen && registrationNo.trim().length >= 2}
          suggestions={registrationSuggestions}
          emptyMessage="No registration matches"
          error={registrationError}
          onSelect={value => {
            setRegistrationNo(value)
            setRegistrationOpen(false)
          }}
          renderSuggestion={item => ({
            key: item as string,
            title: item as string,
            value: item as string,
          })}
        />
        <Select
          label="Type"
          value={filterType}
          onChange={event => setFilterType(event.target.value)}
          disabled={isPending}
        >
          {OUTSTANDING_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
        <Select
          label="Payment Status"
          value={paymentStatus}
          onChange={event => setPaymentStatus(event.target.value)}
          disabled={isPending}
        >
          {OUTSTANDING_PAYMENT_STATUSES.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
        <Select
          label="Rows Per Page"
          value={String(pageSize)}
          onChange={event => pushQuery({
            customerName: initialCustomerName,
            customerMobile: initialCustomerMobile,
            registrationNo: initialRegistrationNo,
            type: initialType,
            paymentStatus: initialPaymentStatus,
            page: 1,
            pageSize: Number(event.target.value),
          })}
          disabled={isPending}
        >
          {OUTSTANDING_PAGE_SIZES.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </Select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Btn onClick={applyFilters} disabled={isPending}>{isPending ? 'Applying...' : 'Apply Filters'}</Btn>
        <Btn variant="outline" onClick={clearFilters} disabled={isPending || !hasActiveFilters}>Clear</Btn>
        <div className="text-sm text-gray-500">
          Showing {pageStart}-{pageEnd} of {total.toLocaleString('en-IN')} records
        </div>
      </div>

      {exportError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>
      ) : null}

      <div className={`space-y-3 transition-opacity ${isPending ? 'opacity-60' : 'opacity-100'}`}>
        {isPending ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading outstanding payment results...</span>
          </div>
        ) : null}

        <Table
          headers={[
            'Sr. No.',
            'Type',
            'Customer Name',
            'Customer Mobile',
            'Customer Email',
            'Car Registration No',
            'Payment Status',
            'Next Follow-up',
            'Remark',
            'Total Amount',
            '% of Payout',
            'Payout Amount',
            'Amount Paid',
            'Bal Amt',
          ]}
          empty={rows.length === 0}
          minWidthClass="min-w-[1280px]"
          compact
          columnWidths={['4%', '5%', '8%', '8%', '9%', '7%', '10%', '7%', '12%', '7%', '4%', '7%', '7%', '5%']}
        >
          {rows.map((row, index) => {
            const serialNo = (page - 1) * pageSize + index + 1

            return (
              <tr key={row.key} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-sm text-gray-700">{serialNo}</td>
                <td className="px-4 py-3"><Badge label={row.type} /></td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.customerName ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.customerMobile ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.customerEmail ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">
                  {row.registrationNo ? (
                    <Link
                      href={getOutstandingDrillThroughHref(row.type, row.registrationNo)}
                      className="hover:underline text-blue-800"
                    >
                      {row.registrationNo}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.paymentStatus ? <Badge label={row.paymentStatus} /> : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(row.followupDate)}</td>
                <td className="px-4 py-3 text-sm text-gray-600"><span className="block break-words">{row.remark ?? '—'}</span></td>
                <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(row.totalAmount)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{fmtPercent(row.percentageOfPayout)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div>{fmtMoney(row.payoutAmount)}</div>
                  {row.type === 'RTO' ? (
                    <div className="text-xs text-gray-400">Transfer Charges</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(row.amountPaid)}</td>
                <td className={`px-4 py-3 text-sm font-semibold ${row.balance > 0 ? 'text-red-600' : row.balance < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                  {fmtMoney(row.balance)}
                </td>
              </tr>
            )
          })}
          {rows.length > 0 && (
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-3" colSpan={13}>Total Balance (all filtered rows)</td>
              <td className={`px-4 py-3 ${totalBalance > 0 ? 'text-red-600' : totalBalance < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                {fmtMoney(totalBalance)}
              </td>
            </tr>
          )}
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500">
          {total === 0 ? 'No matching rows found.' : `Showing ${pageStart}-${pageEnd} of ${total.toLocaleString('en-IN')} rows.`}
        </div>
        <div className="flex items-center gap-2">
          <Btn
            variant="outline"
            onClick={() => pushQuery({
              customerName: initialCustomerName,
              customerMobile: initialCustomerMobile,
              registrationNo: initialRegistrationNo,
            type: initialType,
            paymentStatus: initialPaymentStatus,
              page: page - 1,
              pageSize,
            })}
            disabled={isPending || page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Btn>
          <div className="text-sm text-gray-600">Page {page} of {pageCount}</div>
          <Btn
            variant="outline"
            onClick={() => pushQuery({
              customerName: initialCustomerName,
              customerMobile: initialCustomerMobile,
              registrationNo: initialRegistrationNo,
              type: initialType,
              paymentStatus: initialPaymentStatus,
              page: page + 1,
              pageSize,
            })}
            disabled={isPending || page >= pageCount}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Btn>
        </div>
      </div>
    </div>
  )
}
