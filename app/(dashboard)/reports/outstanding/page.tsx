import { listOutstanding } from '@/features/reports/outstanding/queries'
import { OutstandingClient } from '@/features/reports/outstanding/OutstandingClient'

export default async function OutstandingReportPage() {
  const rows = await listOutstanding()
  return <OutstandingClient initialData={rows} />
}
