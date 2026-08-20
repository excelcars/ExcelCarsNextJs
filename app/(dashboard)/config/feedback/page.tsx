import { listFeedback, getVehicles } from '@/features/feedback/queries'
import { FeedbackClient } from '@/features/feedback/FeedbackClient'

export default async function FeedbackPage() {
  const [rows, vehicles] = await Promise.all([listFeedback(), getVehicles()])
  return <FeedbackClient initialData={rows} vehicles={vehicles} />
}
