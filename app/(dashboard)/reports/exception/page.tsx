import { listExceptions, getUsersForFilter } from '@/features/reports/exception/queries'
import { ExceptionClient } from '@/features/reports/exception/ExceptionClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function ExceptionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ fromDate?: string; toDate?: string; userId?: string; page?: string }>
}) {
  if (!(await canCurrentUserAccessRoute('/reports/exception'))) redirect('/dashboard')
  const sp = await searchParams
  const fromDate = sp.fromDate ?? ''
  const toDate = sp.toDate ?? ''
  const userId = sp.userId ? Number(sp.userId) : null
  const page = Number(sp.page) || 1

  const [{ rows, total, pageCount }, users] = await Promise.all([
    listExceptions({ fromDate, toDate, userId, page }),
    getUsersForFilter(),
  ])

  return (
    <ExceptionClient
      initialData={rows}
      users={users}
      total={total}
      page={page}
      pageCount={pageCount}
      fromDate={fromDate}
      toDate={toDate}
      userId={userId}
    />
  )
}
