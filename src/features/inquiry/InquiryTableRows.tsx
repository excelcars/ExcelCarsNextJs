'use client'

import type { ReactNode } from 'react'

type InquiryTableRowsProps<T> = {
  rows: T[]
  children: (row: T, index: number) => ReactNode
}

export function InquiryTableRows<T>({ rows, children }: InquiryTableRowsProps<T>) {
  return <>{rows.map(children)}</>
}
