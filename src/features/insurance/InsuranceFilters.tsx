'use client'

import { Btn, Input, SearchBar } from '@/components/ui'

export function InsuranceFilters({ search, fromDate, toDate, page, pageCount, pageSize, total, pending, onSearch, onFromDate, onToDate, onReset, onPrevious, onNext }: {
  search: string; fromDate: string; toDate: string; page: number; pageCount: number; pageSize: number; total: number; pending: boolean
  onSearch: (value: string) => void; onFromDate: (value: string) => void; onToDate: (value: string) => void; onReset: () => void; onPrevious: () => void; onNext: () => void
}) {
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-end gap-3">
      <SearchBar value={search} onChange={onSearch} placeholder="Reg no, customer, agent..." disabled={pending} />
      <Input label="From Date" type="date" value={fromDate} onChange={e => onFromDate(e.target.value)} disabled={pending} />
      <Input label="To Date" type="date" value={toDate} onChange={e => onToDate(e.target.value)} disabled={pending} />
      <Btn variant="outline" size="sm" onClick={onReset} disabled={pending || (!search && !fromDate && !toDate)}>Reset Filters</Btn>
    </div><div className="text-xs text-gray-500">Page {page} of {pageCount} · {pageSize} per page</div></div>
    <div className="mt-4 flex items-center justify-between gap-3"><div className="text-sm text-gray-500">Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</div><div className="flex items-center gap-2"><Btn variant="outline" size="sm" onClick={onPrevious} disabled={page <= 1 || pending}>Previous</Btn><Btn variant="outline" size="sm" onClick={onNext} disabled={page >= pageCount || pending}>Next</Btn></div></div>
  </>
}
