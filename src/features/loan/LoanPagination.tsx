'use client'

import { Btn, Select } from '@/components/ui'
import { LOAN_PAGE_SIZES } from './queries'

export function LoanPagination({ total, page, pageSize, pageCount, pending, onNavigate }: { total: number; page: number; pageSize: number; pageCount: number; pending: boolean; onNavigate: (page: number, pageSize?: number) => void }) {
  return <nav aria-label="Loan pagination" className="mt-4 flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <span>Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</span>
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label="Loans per page" disabled={pending} value={String(pageSize)} onChange={event => onNavigate(1, Number(event.target.value))} className="min-h-11 w-28">{LOAN_PAGE_SIZES.map(size => <option key={size} value={size}>{size} / page</option>)}</Select>
      <span>Page {page} of {pageCount}</span>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <Btn className="min-h-11 justify-center" variant="outline" size="sm" disabled={pending || page <= 1} onClick={() => onNavigate(page - 1)}>Previous</Btn>
      <Btn className="min-h-11 justify-center" variant="outline" size="sm" disabled={pending || page >= pageCount} onClick={() => onNavigate(page + 1)}>Next</Btn>
    </div>
  </nav>
}
