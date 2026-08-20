import { listTodayFollowups, getUsersForFilter } from '@/features/reports/today/queries'
import { TodayClient } from '@/features/reports/today/TodayClient'
import { auth } from '../../../../auth'
import { prisma } from '@/lib/db/prisma'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default async function TodayReportPage({
  searchParams,
}: {
  searchParams: Promise<{ fromDate?: string; toDate?: string; userId?: string }>
}) {
  const sp = await searchParams
  const fromDate = sp.fromDate || today()
  const toDate = sp.toDate || today()
  const userId = sp.userId ? Number(sp.userId) : null

  const session = await auth()
  const me = session?.user?.id
    ? await prisma.userTable.findUnique({ where: { userId: Number(session.user.id) }, select: { userId: true, roleName: true } })
    : null
  const restrictToUserId = me?.roleName === 'InquiryAssistant' ? me.userId : null

  const [rows, users] = await Promise.all([
    listTodayFollowups({ fromDate, toDate, userId, restrictToUserId }),
    getUsersForFilter(),
  ])

  return (
    <TodayClient
      initialData={rows}
      users={users}
      fromDate={fromDate}
      toDate={toDate}
      userId={userId}
      restricted={!!restrictToUserId}
    />
  )
}
