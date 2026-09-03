import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Btn, Select } from '@/components/ui'

export function InventoryPagination({
  page,
  pageCount,
  pageSize,
  total,
  pageSizeOptions,
  isPending,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageCount: number
  pageSize: number
  total: number
  pageSizeOptions: number[]
  isPending: boolean
  isLoading: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-gray-500">Page {page} of {pageCount} · {total.toLocaleString('en-IN')} total records</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Rows</span>
          <Select value={String(pageSize)} onChange={event => onPageSizeChange(Number(event.target.value))} className="min-w-24" disabled={isLoading}>
            {pageSizeOptions.map(option => <option key={option} value={option}>{option} / page</option>)}
          </Select>
        </div>
        <div className="flex gap-1.5">
          <Btn variant="outline" size="sm" disabled={page <= 1 || isPending || isLoading} onClick={() => onPageChange(page - 1)}><ChevronLeft className="w-3.5 h-3.5" />Prev</Btn>
          <Btn variant="outline" size="sm" disabled={page >= pageCount || isPending || isLoading} onClick={() => onPageChange(page + 1)}>Next<ChevronRight className="w-3.5 h-3.5" /></Btn>
        </div>
      </div>
    </div>
  )
}
