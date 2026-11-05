'use client'

import { Btn, Select } from '@/components/ui'
import { INSURANCE_PAGE_SIZES } from './constants'

export function InsurancePagination({ total, page, pageSize, pageCount, pending, onNavigate }: { total: number; page: number; pageSize: number; pageCount: number; pending: boolean; onNavigate: (page: number, pageSize?: number) => void }) {
  return <nav aria-label="Insurance pagination" className="mt-4 flex min-w-0 flex-col gap-3 text-sm text-gray-600 lg:flex-row lg:items-center lg:justify-between">
    <span>Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</span>
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Select aria-label="Policies per page" value={String(pageSize)} onChange={event => onNavigate(1, Number(event.target.value))} className="min-h-11 sm:w-32" disabled={pending}>{INSURANCE_PAGE_SIZES.map(size => <option key={size} value={size}>{size} / page</option>)}</Select>
      <div className="flex items-center justify-between gap-2 [&_button]:min-h-11 [&_button]:justify-center">
        <Btn variant="outline" size="sm" disabled={pending || page <= 1} onClick={() => onNavigate(page - 1)}>Previous</Btn>
        <span aria-live="polite" className="text-center">Page {page} of {pageCount}</span>
        <Btn variant="outline" size="sm" disabled={pending || page >= pageCount} onClick={() => onNavigate(page + 1)}>Next</Btn>
      </div>
    </div>
  </nav>
}
