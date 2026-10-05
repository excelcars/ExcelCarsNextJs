import { getTrackingMakes, listTrackingStock, normalizeTrackingFilters, normalizeTrackingPage, normalizeTrackingPageSize } from '@/features/reports/tracking/queries'
import { TrackingClient } from '@/features/reports/tracking/TrackingClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function TrackingReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await canCurrentUserAccessRoute('/reports/tracking'))) redirect('/dashboard')
  const params = await searchParams
  const value = (key: string) => typeof params[key] === 'string' ? params[key] : ''
  const filters = normalizeTrackingFilters({ search: value('search'), make: value('make'), model: value('model'), variant: value('variant'), colour: value('colour'), fuelType: value('fuelType') })
  const [result, makes, canAccessChecklist, canAccessInsurance, canAccessRto, canAccessLoan] = await Promise.all([
    listTrackingStock(filters, normalizeTrackingPage(Number(value('page'))), normalizeTrackingPageSize(Number(value('pageSize')))),
    getTrackingMakes(),
    canCurrentUserAccessRoute('/checklist'), canCurrentUserAccessRoute('/insurance'), canCurrentUserAccessRoute('/rto'), canCurrentUserAccessRoute('/loan'),
  ])

  const data = result.rows.map((r) => ({
    inventoryId: r.inventoryId,
    registrationNo: r.registrationNo,
    sku: r.sku,
    year: r.year,
    status: r.status,
    colour: r.colour,
    fuelType: r.fuelType,
    ownedBy: r.ownedBy,
    customerName: r.customerName,
    customer: r.customer,
    carVariantMaster: r.carVariantMaster,
  }))

  return <TrackingClient initialData={data} makes={makes} filters={filters} total={result.total} page={result.page} pageSize={result.pageSize} pageCount={result.pageCount} canAccessChecklist={canAccessChecklist} canAccessInsurance={canAccessInsurance} canAccessRto={canAccessRto} canAccessLoan={canAccessLoan} />
}
