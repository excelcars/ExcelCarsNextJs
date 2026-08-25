import { prisma } from '@/lib/db/prisma'

export const PAYMENT_STATUSES = ['Pending', 'Paid'] as const

export async function listDsa() {
  const rows = await prisma.dsaManagement.findMany({
    include: {
      customer: true,
      partnerMaster: true,
      inventoryManagement: {
        include: {
          carVariantMaster: {
            include: {
              carMakeMaster: true,
              carModelMaster: true,
            },
          },
        },
      },
    },
    orderBy: { dsaMainId: 'desc' },
  })

  const userIds = Array.from(new Set(rows.flatMap(row => [row.createdBy, row.updatedBy]).filter((id): id is number => typeof id === 'number')))
  const users = userIds.length
    ? await prisma.userTable.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, userName: true, displayName: true },
      })
    : []

  const userMap = new Map(users.map(user => [user.userId, user]))

  return rows.map(row => ({
    ...row,
    createdByUser: row.createdBy ? userMap.get(row.createdBy) ?? null : null,
    updatedByUser: row.updatedBy ? userMap.get(row.updatedBy) ?? null : null,
  }))
}

export async function getVehicles() {
  return prisma.inventoryManagement.findMany({
    select: {
      inventoryId: true,
      registrationNo: true,
      sku: true,
      customerId: true,
      customerName: true,
      mobileNoOwnedBy: true,
      emailIdOwnedBy: true,
      fkVariantId: true,
      carVariantMaster: {
        select: { variant: true, carMakeMaster: { select: { make: true } }, carModelMaster: { select: { model: true } } },
      },
    },
    orderBy: { inventoryId: 'desc' },
  })
}
