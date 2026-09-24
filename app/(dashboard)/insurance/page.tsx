import { listInsurance, getVehicles } from '@/features/insurance/queries'
import { InsuranceClient } from '@/features/insurance/InsuranceClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function InsurancePage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    page?: string
    pageSize?: string
    fromDate?: string
    toDate?: string
  }>
}) {
  if (!(await canCurrentUserAccessRoute('/insurance'))) redirect('/dashboard')
  const sp = await searchParams
  const search = sp.search ?? ''
  const page = Math.max(1, Number(sp.page) || 1)
  const pageSize = Number(sp.pageSize) || 25
  const fromDate = sp.fromDate ?? ''
  const toDate = sp.toDate ?? ''
  const [result, vehicles] = await Promise.all([listInsurance({ search, page, pageSize, fromDate, toDate }), getVehicles()])

  const data = result.rows.map((r) => ({
    ...r,
    insurancePremium: r.insurancePremium ? r.insurancePremium.toString() : null,
    oDPremium: r.oDPremium ? r.oDPremium.toString() : null,
    payoutPercentageOdPremium: r.payoutPercentageOdPremium ? r.payoutPercentageOdPremium.toString() : null,
    payoutAmount: r.payoutAmount ? r.payoutAmount.toString() : null,
    totalAmountReceived: r.totalAmountReceived ? r.totalAmountReceived.toString() : null,
  }))

  return (
    <InsuranceClient
      initialData={data}
      vehicles={vehicles}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      pageSize={result.pageSize}
      initialSearch={search}
      initialFromDate={fromDate}
      initialToDate={toDate}
    />
  )
}
