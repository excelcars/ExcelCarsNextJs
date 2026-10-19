'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { PORTAL_ASSIGNMENT_MANAGEMENT_FUNCTION } from '@/lib/access/accessCatalog'

export async function savePortalAssignment(sourceId: number, assignedToUserId: number | null) {
  const actor = await getAuthorizedActorForFunctions([PORTAL_ASSIGNMENT_MANAGEMENT_FUNCTION])
  if (!actor) return { success: false, error: 'Not authorized.' }
  if (!Number.isInteger(sourceId) || sourceId <= 0) return { success: false, error: 'Select a valid portal.' }

  const source = await prisma.inquirySourceMaster.findFirst({
    where: { sourceId, isActive: true, category: { in: ['Portal', 'Marketplace', 'Directory'] } },
    select: { sourceId: true },
  })
  if (!source) return { success: false, error: 'This portal source is no longer active.' }

  if (assignedToUserId === null) {
    await prisma.inquiryPortalAssignment.deleteMany({ where: { sourceId } })
  } else {
    const assignee = await prisma.userTable.findFirst({
      where: { userId: assignedToUserId, status: 'Active', roleName: 'InquiryAssistant', empId: { not: null } },
      select: { userId: true },
    })
    if (!assignee) return { success: false, error: 'Select an active InquiryAssistant.' }

    await prisma.inquiryPortalAssignment.upsert({
      where: { sourceId },
      create: { sourceId, assignedToUserId, isActive: true, createdBy: actor.userId, updatedBy: actor.userId },
      update: { assignedToUserId, isActive: true, updatedAt: new Date(), updatedBy: actor.userId },
    })
  }

  revalidatePath('/config/portal-assignments')
  return { success: true }
}
