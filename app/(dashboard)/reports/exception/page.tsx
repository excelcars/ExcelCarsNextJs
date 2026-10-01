import { listExceptions, getUsersForFilter } from '@/features/reports/exception/queries'
import { ExceptionClient } from '@/features/reports/exception/ExceptionClient'
import { normalizeExceptionFilters } from '@/features/reports/exception/rules'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function ExceptionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ fromDate?: string; toDate?: string; userId?: string; page?: string }>
}) {
  if (!(await canCurrentUserAccessRoute('/reports/exception'))) redirect('/dashboard')
  const sp = await searchParams
  const { filters, error } = normalizeExceptionFilters(sp)

  const [data, users] = await Promise.all([
    error
      ? Promise.resolve({ rows: [], total: 0, page: filters.page, pageCount: 1 })
      : listExceptions(filters),
    getUsersForFilter(),
  ])

  return (
    <ExceptionClient
      initialData={data.rows}
      users={users}
      total={data.total}
      page={data.page}
      pageCount={data.pageCount}
      fromDate={filters.fromDate}
      toDate={filters.toDate}
      userId={filters.userId}
      filterError={error}
    />
  )
}
