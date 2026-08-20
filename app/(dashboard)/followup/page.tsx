import { listFollowupQueue } from '@/features/followup/queries'
import { FollowupClient } from '@/features/followup/FollowupClient'

export default async function FollowupPage() {
  const rows = await listFollowupQueue()

  const data = rows.map((r) => ({
    ...r,
    budgetOfCustomer: r.budgetOfCustomer ? r.budgetOfCustomer.toString() : null,
  }))

  return <FollowupClient initialData={data} />
}
