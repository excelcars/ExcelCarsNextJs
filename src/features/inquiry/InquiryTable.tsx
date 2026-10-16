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
    <div className="[&_th]:px-2 [&_td]:px-2 [&_th:first-child]:w-[88px] [&_td:first-child]:w-[88px]">
      <Table
        headers={['Sr. No.', 'Inquiry', 'Customer Details', 'Vehicle', 'Budget / Owner', 'Status / Follow-up', 'Remark', 'Actions']}
        empty={empty}
        emptyMessage={emptyMessage}
      >
        {children}
      </Table>
    </div>
  )
}
