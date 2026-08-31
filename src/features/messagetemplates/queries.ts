import { prisma } from '@/lib/db/prisma'

export const MESSAGE_TYPES = ['Email'] as const

export async function listTemplates() {
  return prisma.messageTemplate.findMany({
    where: { messageType: 'Email' },
    orderBy: { typeId: 'desc' },
  })
}
