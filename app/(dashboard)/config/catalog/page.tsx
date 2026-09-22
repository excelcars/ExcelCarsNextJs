import { getCatalogMakes, listCatalogSummary } from '@/features/catalog/adminQueries'
import { CatalogClient } from '@/features/catalog/CatalogClient'

export const dynamic = 'force-dynamic'

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const sp = await searchParams
  const search = sp.search ?? ''
  const page = Number(sp.page) || 1
  const [{ rows, total, pageCount }, makes] = await Promise.all([listCatalogSummary(search, page), getCatalogMakes()])
  return <CatalogClient initialData={rows} total={total} page={page} pageCount={pageCount} search={search} makes={makes} />
}
