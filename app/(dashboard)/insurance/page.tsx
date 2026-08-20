import { listInsurance, getVehicles } from '@/features/insurance/queries'
import { InsuranceClient } from '@/features/insurance/InsuranceClient'

export default async function InsurancePage() {
  const [rows, vehicles] = await Promise.all([listInsurance(), getVehicles()])

  const data = rows.map((r) => ({
    ...r,
    insurancePremium: r.insurancePremium ? r.insurancePremium.toString() : null,
    oDPremium: r.oDPremium ? r.oDPremium.toString() : null,
    payoutPercentageOdPremium: r.payoutPercentageOdPremium ? r.payoutPercentageOdPremium.toString() : null,
    payoutAmount: r.payoutAmount ? r.payoutAmount.toString() : null,
    totalAmountReceived: r.totalAmountReceived ? r.totalAmountReceived.toString() : null,
  }))

  return <InsuranceClient initialData={data} vehicles={vehicles} />
}
