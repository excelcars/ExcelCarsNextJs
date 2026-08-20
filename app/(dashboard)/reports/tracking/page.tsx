import { listTrackingStock } from '@/features/reports/tracking/queries'
import { TrackingClient } from '@/features/reports/tracking/TrackingClient'

export default async function TrackingReportPage() {
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
