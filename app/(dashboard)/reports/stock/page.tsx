import { listStock } from '@/features/reports/stock/queries'
import { StockReportClient } from '@/features/reports/stock/StockReportClient'

export default async function StockReportPage() {
  const rows = await listStock({ search: '', status: 'All' })

  const data = rows.map((r) => ({
    ...r,
    kmsDriven: r.kmsDriven ? r.kmsDriven.toString() : null,
    price: r.price ? r.price.toString() : null,
  }))

  return <StockReportClient initialData={data} />
}
