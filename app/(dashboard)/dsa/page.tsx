import { listDsa, getVehicles } from '@/features/dsa/queries'
import { DsaClient } from '@/features/dsa/DsaClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function DsaPage() {
  if (!(await canCurrentUserAccessRoute('/dsa'))) redirect('/dashboard')
  const [rows, vehicles] = await Promise.all([listDsa(), getVehicles()])

  const data = rows.map((r) => ({
    ...r,
    loanAmount: r.loanAmount ? r.loanAmount.toString() : null,
    percentageOfPayout: r.percentageOfPayout ? r.percentageOfPayout.toString() : null,
    payoutAmount: r.payoutAmount ? r.payoutAmount.toString() : null,
    amountPaid: r.amountPaid ? r.amountPaid.toString() : null,
  }))

  return <DsaClient initialData={data} vehicles={vehicles} />
}
