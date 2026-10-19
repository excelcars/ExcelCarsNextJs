import { prisma } from '@/lib/db/prisma'

export async function getPortalAssignmentSettings() {
  const [sources, users] = await Promise.all([
    prisma.inquirySourceMaster.findMany({
      where: { isActive: true, category: { in: ['Portal', 'Marketplace', 'Directory'] } },
      orderBy: [{ reportingSort: 'asc' }, { displayName: 'asc' }],
      select: {
        sourceId: true,
        code: true,
        displayName: true,
        category: true,
        portalAssignment: {
          select: {
            assignedToUserId: true,
            isActive: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.userTable.findMany({
      where: { status: 'Active', roleName: 'InquiryAssistant', empId: { not: null } },
      orderBy: [{ displayName: 'asc' }, { userName: 'asc' }, { userId: 'asc' }],
      select: { userId: true, displayName: true, userName: true },
    }),
  ])

  return { sources, users }
}
