'use server'

import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { canAccessInquiryByOwnership } from '@/lib/access/inquiryOwnership'
import { readablePartnerPayload } from './partnerPayload'

export async function getInquiryPartnerDetails(inquiryId: number, route = '/inquiry') {
  if (!Number.isSafeInteger(inquiryId) || inquiryId <= 0 || !['/inquiry', '/followup'].includes(route)) return null
  if (!(await getAuthorizedUserIdForRoute(route)) || !(await canAccessInquiryByOwnership(inquiryId, route))) return null
  const rows = await prisma.partnerWebhookPayload.findMany({
    where: { inquiryId, partner: { in: ['CARDEKHO', 'JUSTDIAL'] } },
    orderBy: { partnerWebhookPayloadId: 'desc' },
    distinct: ['partner', 'externalLeadId'], take: 50,
    select: { partnerWebhookPayloadId: true, partner: true, rawPayload: true, receivedAt: true },
  })
  const submissions = rows.map(row => ({ id: row.partnerWebhookPayloadId, partner: row.partner, receivedAt: row.receivedAt.toISOString(), fields: readablePartnerPayload(row.partner, row.rawPayload) }))
  return submissions.length ? { ...submissions[0], submissions } : null
}
