import { listLoans, getVehicles } from '@/features/loan/queries'
import { LoanClient } from '@/features/loan/LoanClient'

export default async function LoanPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
  }>
}) {
  const sp = await searchParams
  const search = sp.search ?? ''

  const [rows, vehicles] = await Promise.all([listLoans(), getVehicles()])

  const data = rows.map((r) => ({
    ...r,
    loanAmount: r.loanAmount ? r.loanAmount.toString() : null,
    percentagePayoutAmount: r.percentagePayoutAmount ? r.percentagePayoutAmount.toString() : null,
    payoutAmount: r.payoutAmount ? r.payoutAmount.toString() : null,
    totalAmountReceived: r.totalAmountReceived ? r.totalAmountReceived.toString() : null,
  }))

  return <LoanClient initialData={data} vehicles={vehicles} initialSearch={search} />
}
