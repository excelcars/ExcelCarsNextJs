import { listDealersPaged, normalizeDealerSearchField, normalizeDealerSortOption } from '@/features/dealers/queries'
import { DealersClient } from '@/features/dealers/DealersClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function DealersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; field?: string; sort?: string; page?: string }>
}) {
  if (!(await canCurrentUserAccessRoute('/config/dealers'))) redirect('/dashboard')
  const params = await searchParams
  const search = params.search ?? ''
  const field = normalizeDealerSearchField(params.field)
  const sort = normalizeDealerSortOption(params.sort)
  const { rows, total, page, pageCount } = await listDealersPaged({ search, field, sort, page: Number(params.page) || 1 })
  return <DealersClient initialData={rows} total={total} page={page} pageCount={pageCount} search={search} field={field} sort={sort} />
}
