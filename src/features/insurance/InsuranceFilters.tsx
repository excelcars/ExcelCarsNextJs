'use client'

import { Btn, Input, SearchBar } from '@/components/ui'

export function InsuranceFilters({ search, fromDate, toDate, pending, onSearch, onFromDate, onToDate, onReset }: {
  search: string; fromDate: string; toDate: string; pending: boolean
  onSearch: (value: string) => void; onFromDate: (value: string) => void; onToDate: (value: string) => void; onReset: () => void
}) {
  return <div className="mb-4 space-y-4">
    <SearchBar value={search} onChange={onSearch} placeholder="Reg no, customer, agent..." disabled={pending} />
    <div className="rounded-xl border border-gray-200 bg-white p-4"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Input label="From Date" type="date" value={fromDate} onChange={e => onFromDate(e.target.value)} disabled={pending} />
      <Input label="To Date" type="date" value={toDate} onChange={e => onToDate(e.target.value)} disabled={pending} />
    </div><div className="mt-4 flex justify-end"><Btn variant="outline" size="sm" onClick={onReset} disabled={pending || (!search && !fromDate && !toDate)}>Reset Filters</Btn></div></div>
  </div>
}
