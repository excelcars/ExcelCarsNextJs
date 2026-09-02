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
    <Table
      headers={[
        'Sr. No',
        'Inquiry_Date / Website',
        'Customer Details',
        'Car Details',
        'Budget / Classification',
        'Visited Date',
        'Status / Sub Status',
        'FollowUp Date',
        'Remark',
        'Actions',
      ]}
      empty={empty}
      emptyMessage={emptyMessage}
    >
      {children}
    </Table>
  )
}
