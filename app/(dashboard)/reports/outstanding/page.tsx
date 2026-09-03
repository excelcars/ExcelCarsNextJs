import { OUTSTANDING_TYPES, listOutstanding } from '@/features/reports/outstanding/queries'
import { OutstandingClient } from '@/features/reports/outstanding/OutstandingClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function OutstandingReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    customerName?: string
    customerMobile?: string
    registrationNo?: string
    type?: string
    page?: string
    pageSize?: string
  }>
}) {
  if (!(await canCurrentUserAccessRoute('/reports/outstanding'))) redirect('/dashboard')
  const sp = await searchParams
  const customerName = sp.customerName ?? ''
  const customerMobile = sp.customerMobile ?? ''
  const registrationNo = sp.registrationNo ?? ''
  const type = OUTSTANDING_TYPES.includes((sp.type ?? 'All') as (typeof OUTSTANDING_TYPES)[number])
    ? (sp.type ?? 'All') as (typeof OUTSTANDING_TYPES)[number]
    : 'All'
  const page = Number(sp.page) || 1
  const pageSize = Number(sp.pageSize) || 25

  const result = await listOutstanding({
    customerName,
    customerMobile,
    registrationNo,
    type,
    page,
    pageSize,
  })

  return (
    <OutstandingClient
      initialData={result.rows}
      initialCustomerName={customerName}
      initialCustomerMobile={customerMobile}
      initialRegistrationNo={registrationNo}
      initialType={type}
      total={result.total}
      totalBalance={result.totalBalance}
      page={result.page}
      pageCount={result.pageCount}
      pageSize={result.pageSize}
    />
  )
}
