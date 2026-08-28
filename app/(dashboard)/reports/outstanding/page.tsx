import { listOutstanding } from '@/features/reports/outstanding/queries'
import { OutstandingClient } from '@/features/reports/outstanding/OutstandingClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function OutstandingReportPage() {
  if (!(await canCurrentUserAccessRoute('/reports/outstanding'))) redirect('/dashboard')
  const rows = await listOutstanding()
  return <OutstandingClient initialData={rows} />
}
