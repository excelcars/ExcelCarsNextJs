import { listUsers, getAssignableRoles } from '@/features/useraccess/queries'
import { UserAccessClient } from '@/features/useraccess/UserAccessClient'
import { auth } from '../../../../auth'
import { prisma } from '@/lib/db/prisma'

export default async function UserAccessPage() {
  const session = await auth()
  const me = session?.user?.id
    ? await prisma.userTable.findUnique({ where: { userId: Number(session.user.id) }, select: { roleId: true } })
    : null

  const [rows, roles] = await Promise.all([listUsers(), getAssignableRoles(me?.roleId ?? null)])

  return <UserAccessClient initialData={rows} roles={roles} />
}
