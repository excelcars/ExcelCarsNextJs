'use client'

import { Btn, Select } from '@/components/ui'
import { INSURANCE_PAGE_SIZES } from './queries'

export function InsurancePagination({ total, page, pageSize, pageCount, pending, onNavigate }: { total: number; page: number; pageSize: number; pageCount: number; pending: boolean; onNavigate: (page: number, pageSize?: number) => void }) {
  return <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-600"><span>Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</span><div className="flex items-center gap-2"><Select value={String(pageSize)} onChange={event => onNavigate(1, Number(event.target.value))} className="w-28" disabled={pending}>{INSURANCE_PAGE_SIZES.map(size => <option key={size} value={size}>{size} / page</option>)}</Select><Btn variant="outline" size="sm" disabled={pending || page <= 1} onClick={() => onNavigate(page - 1)}>Previous</Btn><span>Page {page} of {pageCount}</span><Btn variant="outline" size="sm" disabled={pending || page >= pageCount} onClick={() => onNavigate(page + 1)}>Next</Btn></div></div>
}
