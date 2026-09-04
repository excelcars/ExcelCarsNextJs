'use client'

import type { ReactNode } from 'react'
import { Table } from '@/components/ui'

type InquiryTableProps = {
  empty: boolean
  emptyMessage: string
  children: ReactNode
}

export function InquiryTable({ empty, emptyMessage, children }: InquiryTableProps) {
  return (
    <div className="[&_table]:min-w-0 [&_th]:px-2 [&_td]:px-2 [&_th:first-child]:w-16 [&_th:first-child]:min-w-16 [&_th:first-child]:max-w-16 [&_td:first-child]:w-16 [&_td:first-child]:min-w-16 [&_td:first-child]:max-w-16">
      <Table
        headers={['Sr. No.', 'Inquiry', 'Customer Details', 'Vehicle', 'Budget / Owner', 'Status / Follow-up', 'Remark', 'Actions']}
        empty={empty}
        emptyMessage={emptyMessage}
        minWidthClass="min-w-0"
      >
        {children}
      </Table>
    </div>
  )
}
