'use client'

import { Btn, Input, SearchBar, Select } from '@/components/ui'
import { PAYMENT_STATUSES } from './queries'
import type { LoanFilters } from './LoanClient'

export function LoanFiltersPanel({ filters, onChange, onReset }: { filters: LoanFilters; onChange: <K extends keyof LoanFilters>(key: K, value: LoanFilters[K]) => void; onReset: () => void }) {
  return <div className="mb-4 space-y-4">
    <SearchBar value={filters.search} onChange={value => onChange('search', value)} placeholder="Reg no, customer, bank..." />
    <div className="rounded-xl border border-gray-200 bg-white p-4"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Input label="Registration No" value={filters.registrationNo} onChange={e => onChange('registrationNo', e.target.value)} />
      <Input label="Customer Name" value={filters.customerName} onChange={e => onChange('customerName', e.target.value)} />
      <Input label="Customer Mobile" value={filters.customerMobile} onChange={e => onChange('customerMobile', e.target.value)} />
      <Input label="Bank Name" value={filters.bankName} onChange={e => onChange('bankName', e.target.value)} />
      <Input label="Bank Person Name" value={filters.bankPersonName} onChange={e => onChange('bankPersonName', e.target.value)} />
      <Select label="Payment Status" value={filters.paymentStatus} onChange={e => onChange('paymentStatus', e.target.value)}><option value="All">All</option>{PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}</Select>
      <Input label="From Date" type="date" value={filters.fromDate} onChange={e => onChange('fromDate', e.target.value)} />
      <Input label="To Date" type="date" value={filters.toDate} onChange={e => onChange('toDate', e.target.value)} />
    </div><div className="mt-4 flex justify-end"><Btn variant="outline" size="sm" onClick={onReset}>Reset Filters</Btn></div></div>
  </div>
}
