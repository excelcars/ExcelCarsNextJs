import { listTodayFollowups, getUsersForFilter } from '@/features/reports/today/queries'
import { TodayClient } from '@/features/reports/today/TodayClient'
import { auth } from '../../../../auth'
import { prisma } from '@/lib/db/prisma'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { indiaDateKey, validateIndiaDateRange } from '@/features/reports/today/date'
import { parseTodayUserId } from '@/features/reports/today/filters'
import { redirect } from 'next/navigation'

function today() {
  return indiaDateKey()
}

export default async function TodayReportPage({
  searchParams,
}: {
  searchParams: Promise<{ fromDate?: string; toDate?: string; userId?: string; search?: string }>
}) {
  if (!(await canCurrentUserAccessRoute('/reports/today'))) redirect('/dashboard')
  const sp = await searchParams
  const fromDate = sp.fromDate || today()
  const toDate = sp.toDate || today()
  const userId = parseTodayUserId(sp.userId)
  const searched = sp.search === '1'
  const searchError = searched ? validateIndiaDateRange(fromDate, toDate) : null

  const session = await auth()
  const me = session?.user?.id
    ? await prisma.userTable.findUnique({ where: { userId: Number(session.user.id) }, select: { userId: true, roleId: true } })
    : null
  // Legacy report row security is keyed to role ID 4, not the role display name.
  const restrictToUserId = me?.roleId === 4 ? me.userId : null

  const reportResult = searched && !searchError
    ? listTodayFollowups({ fromDate, toDate, userId, restrictToUserId })
      .then(rows => ({ rows, queryError: null as string | null }))
      .catch(() => ({ rows: [], queryError: 'Could not load the report. Please try again.' }))
    : Promise.resolve({ rows: [], queryError: null as string | null })

  const [{ rows, queryError }, users] = await Promise.all([
    reportResult,
    getUsersForFilter(me?.roleId ?? null),
  ])

  return (
    <TodayClient
      initialData={rows}
      users={users}
      fromDate={fromDate}
      toDate={toDate}
      userId={userId}
      restricted={!!restrictToUserId}
      searched={searched}
      searchError={searchError}
      queryError={queryError}
    />
  )
}
