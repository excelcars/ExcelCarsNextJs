import type { PrismaClient } from '@prisma/client'
export function sendLoggedWhatsAppTemplate(prisma: PrismaClient, input: {
  to: string; customerName: string; templateName: string; body: string; components: unknown[]; buttonUrlSuffix?: string
}): Promise<{ success: boolean; providerMessageId?: string; error?: string }>
