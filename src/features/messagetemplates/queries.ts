import { prisma } from '@/lib/db/prisma'

export const MESSAGE_TYPES = ['SMS', 'Email'] as const

export async function listTemplates() {
  return prisma.messageTemplate.findMany({
    orderBy: { typeId: 'desc' },
  })
}
