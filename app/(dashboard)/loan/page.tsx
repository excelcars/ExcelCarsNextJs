import { listLoans, getVehicles } from '@/features/loan/queries'
import { LoanClient } from '@/features/loan/LoanClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function LoanPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string; registrationNo?: string; customerName?: string; customerMobile?: string; bankName?: string; bankPersonName?: string; paymentStatus?: string; fromDate?: string; toDate?: string; page?: string; pageSize?: string
  }>
}) {
  if (!(await canCurrentUserAccessRoute('/loan'))) redirect('/dashboard')
  const sp = await searchParams
  const search = sp.search ?? ''

  const [result, vehicles] = await Promise.all([listLoans({ ...sp, page: Number(sp.page) || 1, pageSize: Number(sp.pageSize) || 25 }), getVehicles()])

  const data = result.rows.map((r) => ({
    ...r,
    loanAmount: r.loanAmount ? r.loanAmount.toString() : null,
    percentagePayoutAmount: r.percentagePayoutAmount ? r.percentagePayoutAmount.toString() : null,
    payoutAmount: r.payoutAmount ? r.payoutAmount.toString() : null,
    totalAmountReceived: r.totalAmountReceived ? r.totalAmountReceived.toString() : null,
  }))

  return <LoanClient initialData={data} vehicles={vehicles} initialSearch={search} initialFilters={sp} total={result.total} page={result.page} pageSize={result.pageSize} pageCount={result.pageCount} />
}
