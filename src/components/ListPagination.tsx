'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Btn } from '@/components/ui'

type ListPaginationProps = {
  page: number
  pageCount: number
  total: number
  showingText: string
  pending: boolean
  className?: string
  onPageChange: (page: number) => void
}

export function ListPagination({ page, pageCount, total, showingText, pending, className = '', onPageChange }: ListPaginationProps) {
  if (pageCount <= 1) return null

  return (
    <div className={`flex items-center justify-between ${className}`.trim()}>
      <div className="text-xs text-gray-500">{showingText} of {total.toLocaleString('en-IN')} · Page {page} of {pageCount}</div>
      <div className="flex gap-1.5">
        <Btn variant="outline" size="sm" disabled={pending || page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft className="h-3.5 w-3.5" />Prev</Btn>
        <Btn variant="outline" size="sm" disabled={pending || page >= pageCount} onClick={() => onPageChange(page + 1)}>Next<ChevronRight className="h-3.5 w-3.5" /></Btn>
      </div>
    </div>
  )
}
