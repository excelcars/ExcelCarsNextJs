'use client'

import { Btn, FilterPanel, Input, SearchBar } from '@/components/ui'

export function InsuranceFilters({ search, fromDate, toDate, pending, onSearch, onFromDate, onToDate, onReset }: {
  search: string; fromDate: string; toDate: string; pending: boolean
  onSearch: (value: string) => void; onFromDate: (value: string) => void; onToDate: (value: string) => void; onReset: () => void
}) {
  return <FilterPanel>
    <div className="mb-3"><div className="text-sm font-semibold text-gray-900">Filters</div><div className="text-xs text-gray-500">Search by policy details or narrow results by date.</div></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SearchBar value={search} onChange={onSearch} placeholder="Reg no, customer, agent..." disabled={pending} />
      <Input label="From Date" type="date" value={fromDate} onChange={e => onFromDate(e.target.value)} disabled={pending} />
      <Input label="To Date" type="date" value={toDate} onChange={e => onToDate(e.target.value)} disabled={pending} />
    </div><div className="mt-3 flex justify-end"><Btn variant="outline" size="sm" onClick={onReset} disabled={pending || (!search && !fromDate && !toDate)}>Reset Filters</Btn></div>
  </FilterPanel>
}
