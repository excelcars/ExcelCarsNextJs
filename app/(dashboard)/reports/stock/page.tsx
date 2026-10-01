import { listStockPage, normalizeStockFilters, normalizeStockPage, normalizeStockPageSize } from '@/features/reports/stock/queries'
import { StockReportClient } from '@/features/reports/stock/StockReportClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!(await canCurrentUserAccessRoute('/reports/stock'))) redirect('/dashboard')
  const canAccessInventory = await canCurrentUserAccessRoute('/inventory')
  const params = await searchParams
  const value = (key: string) => typeof params[key] === 'string' ? params[key] : ''
  const filters = normalizeStockFilters({
    search: value('search'),
    status: value('status') || 'All',
    make: value('make'),
    model: value('model'),
    variant: value('variant'),
    colour: value('colour'),
    fuelType: value('fuelType'),
    ownerType: value('ownerType'),
    ownerName: value('ownerName'),
    ownerMobile: value('ownerMobile'),
    registrationNo: value('registrationNo'),
  })
  const result = await listStockPage(
    filters,
    normalizeStockPage(Number(value('page'))),
    normalizeStockPageSize(Number(value('pageSize'))),
    value('sort'),
  )

  const data = result.rows.map((r) => ({
    ...r,
    kmsDriven: r.kmsDriven ? r.kmsDriven.toString() : null,
    price: r.price ? r.price.toString() : null,
  }))

  return <StockReportClient
    initialData={data}
    initialFilters={filters}
    total={result.total}
    page={result.page}
    pageSize={result.pageSize}
    pageCount={result.pageCount}
    sort={result.sort}
    totalValue={result.totalValue}
    statusCounts={result.statusCounts}
    canAccessInventory={canAccessInventory}
  />
}
