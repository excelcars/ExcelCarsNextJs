import { listRtoAgents, getVehicles } from '@/features/rto/queries'
import { RtoClient } from '@/features/rto/RtoClient'

export default async function RtoPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    registrationNo?: string
  }>
}) {
  const sp = await searchParams
  const search = sp.search ?? ''
  const registrationNo = sp.registrationNo ?? ''

  const [rows, vehicles] = await Promise.all([listRtoAgents(), getVehicles()])

  const data = rows.map((r) => ({
    ...r,
    transferCharges: r.transferCharges ? r.transferCharges.toString() : null,
    amtPaid: r.amtPaid ? r.amtPaid.toString() : null,
  }))

  return (
    <RtoClient
      initialData={data}
      vehicles={vehicles}
      initialSearch={search}
      initialRegistrationNo={registrationNo}
    />
  )
}
