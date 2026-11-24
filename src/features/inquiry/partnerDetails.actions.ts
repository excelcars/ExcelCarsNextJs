'use server'

import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { canAccessInquiryByOwnership } from '@/lib/access/inquiryOwnership'
import { readablePartnerPayload } from './partnerPayload'

export async function getInquiryPartnerDetails(inquiryId: number, route = '/inquiry') {
  if (!Number.isSafeInteger(inquiryId) || inquiryId <= 0 || !['/inquiry', '/followup'].includes(route)) return null
  if (!(await getAuthorizedUserIdForRoute(route)) || !(await canAccessInquiryByOwnership(inquiryId, route))) return null
  const row = await prisma.partnerWebhookPayload.findFirst({
    where: { inquiryId, partner: { in: ['CARDEKHO', 'JUSTDIAL', 'WEBSITE'] } },
    orderBy: { partnerWebhookPayloadId: 'asc' },
    select: { partner: true, rawPayload: true, receivedAt: true },
  })
  return row ? { partner: row.partner, receivedAt: row.receivedAt.toISOString(), fields: readablePartnerPayload(row.partner, row.rawPayload) } : null
}
