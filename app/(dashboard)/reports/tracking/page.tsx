import { listTrackingStock } from '@/features/reports/tracking/queries'
import { TrackingClient } from '@/features/reports/tracking/TrackingClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function TrackingReportPage() {
  if (!(await canCurrentUserAccessRoute('/reports/tracking'))) redirect('/dashboard')
  const rows = await listTrackingStock()

  const data = rows.map((r) => ({
    inventoryId: r.inventoryId,
    registrationNo: r.registrationNo,
    sku: r.sku,
    year: r.year,
    status: r.status,
    carVariantMaster: r.carVariantMaster,
  }))

  return <TrackingClient initialData={data} />
}
