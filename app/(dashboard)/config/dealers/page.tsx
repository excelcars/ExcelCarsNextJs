import { listDealers } from '@/features/dealers/queries'
import { DealersClient } from '@/features/dealers/DealersClient'

export default async function DealersPage() {
  const rows = await listDealers()
  return <DealersClient initialData={rows} />
}
