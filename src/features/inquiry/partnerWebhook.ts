import { timingSafeEqual } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { ensureInquiryActivityLogTable, logInquiryEvent } from './eventLog'
import { ensureInquirySourceMasterSeed } from './sourceMaster.server'
import { createUserNotification } from '@/features/notifications/service'
import { resolvePartnerVehicle } from './partnerVehicleCatalog.server'


type Partner = 'CARDEKHO' | 'JUSTDIAL' | 'WEBSITE'
type Payload = Record<string, unknown>

type AcceptedLead = {
  leadId: string
  customerName: string
  mobile: string
  email: string
  vehicle: { description: string; year: number; owners: number | null } | null
  remark: string
}

function text(value: unknown, max = 500) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : ''
}

function normalizeMobile(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

function integer(value: unknown) {
  const parsed = Number(text(value))
  return Number.isInteger(parsed) ? parsed : null
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function secureEqual(actual: string | null, expected: string) {
  if (!actual) return false
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function isPartnerWebhookAuthorized(headers: Headers, secret: string | undefined) {
  const expected = secret?.trim()
  if (!expected) return false
  const authorization = headers.get('authorization')
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null
  return secureEqual(bearer, expected) || secureEqual(headers.get('x-webhook-secret'), expected)
}

function parseCardekho(payload: Payload): { lead: AcceptedLead | null; error?: string } {
  const leadId = text(payload.lead_id, 120)
  const customerName = text(payload.buyer_name)
  const mobile = normalizeMobile(text(payload.buyer_mobile, 50))
  const description = text(payload.mmv)
  const year = integer(payload.mfg_year)
  const owners = payload.no_of_owners === undefined || text(payload.no_of_owners) === '' ? null : integer(payload.no_of_owners)
  const currentYear = new Date().getFullYear()
  if (!leadId || !customerName || !mobile || !description || year === null) return { lead: null, error: 'lead_id, buyer_name, buyer_mobile, mmv, and mfg_year are required.' }
  if (!/^\d{10}$/.test(mobile)) return { lead: null, error: 'buyer_mobile must contain a valid 10-digit mobile number.' }
  if (year < 1900 || year > currentYear + 1) return { lead: null, error: 'mfg_year is invalid.' }
  if (owners !== null && owners < 0) return { lead: null, error: 'no_of_owners must be zero or greater.' }
  return {
    lead: {
      leadId,
      customerName,
      mobile,
      email: '',
      vehicle: { description, year, owners },
      remark: ['Partner: Cardekho', `Lead ID: ${leadId}`, text(payload.reg_no) ? `Registration: ${text(payload.reg_no)}` : '', text(payload.km_driven) ? `KM Driven: ${text(payload.km_driven)}` : ''].filter(Boolean).join('\n'),
    },
  }
}

function parseJustdial(payload: Payload): { lead: AcceptedLead | null; error?: string } {
  const leadId = text(payload.leadid, 120)
  const customerName = text(payload.name)
  const mobile = normalizeMobile(text(payload.mobile, 50))
  const email = text(payload.email, 255)
  if (!leadId || !customerName || !mobile) return { lead: null, error: 'leadid, name, and mobile are required.' }
  if (!/^\d{10}$/.test(mobile)) return { lead: null, error: 'mobile must contain a valid 10-digit mobile number.' }
  if (!validEmail(email)) return { lead: null, error: 'email is invalid.' }
  const details = [
    ['Partner', 'Justdial'], ['Lead ID', leadId], ['Lead Type', text(payload.leadtype)], ['Category', text(payload.category)], ['Company', text(payload.company)], ['City', text(payload.city)], ['Area', text(payload.area)], ['Branch Area', text(payload.brancharea)], ['Pincode', text(payload.pincode)], ['Branch PIN', text(payload.branchpin)], ['Lead Date', text(payload.date)], ['Lead Time', text(payload.time)], ['Parent ID', text(payload.parentid)], ['Phone', text(payload.phone)], ['DND Mobile', text(payload.dncmobile)], ['DND Phone', text(payload.dncphone)],
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`)
  return { lead: { leadId, customerName, mobile, email, vehicle: null, remark: details.join('\n') } }
}
function parseWebsite(payload: Payload): { lead: AcceptedLead | null; error?: string } {
  const leadId = text(payload.lead_id, 120)
  const leadType = text(payload.lead_type, 50).toUpperCase()
  const customerName = text(payload.name, 120)
  const mobile = normalizeMobile(text(payload.mobile, 50))
  const email = text(payload.email, 255)

  const allowedTypes = [
    'SELL_CAR',
    'EXCHANGE_CAR',
    'POST_REQUIREMENT',
    'CONTACT_US',
    'REQUEST_CALLBACK',
    'TEST_DRIVE',
    'MAKE_OFFER',
  ]

  if (!leadId || !leadType || !customerName || !mobile) {
    return {
      lead: null,
      error: 'lead_id, lead_type, name, and mobile are required.',
    }
  }

  if (!allowedTypes.includes(leadType)) {
    return { lead: null, error: 'Invalid lead_type.' }
  }

  if (!/^\d{10}$/.test(mobile)) {
    return { lead: null, error: 'mobile must contain a valid 10-digit mobile number.' }
  }

  if (!validEmail(email)) {
    return { lead: null, error: 'email is invalid.' }
  }

  const vehicle = text(payload.vehicle_requested, 200)
  const remarks = text(payload.remarks, 1000)

  const details = [
    `Website Lead Type: ${leadType}`,
    vehicle ? `Vehicle: ${vehicle}` : '',
    remarks ? `Remarks: ${remarks}` : '',
    `Lead ID: ${leadId}`,
  ].filter(Boolean)

  return {
    lead: {
      leadId,
      customerName,
      mobile,
      email,
      vehicle: null,
      remark: details.join('\n'),
    },
  }
}
async function findCustomerId(mobile: string) {
  const rows = await prisma.$queryRaw<Array<{ cust_id: number }>>(Prisma.sql`
    SELECT cust_id FROM customer
    WHERE RIGHT(regexp_replace(COALESCE(cust_mobile, ''), '\\D', '', 'g'), 10) = ${mobile}
    ORDER BY cust_id DESC LIMIT 1
  `)
  return rows[0]?.cust_id ?? null
}

async function nextInquiryNumber(client: Prisma.TransactionClient) {
  const rows = await client.$queryRaw<Array<{ max_inquiry_number: number | bigint | null }>>(Prisma.sql`
    SELECT COALESCE(MAX((regexp_match(inquiry_no, '([0-9]+)$'))[1]::int), 0) AS max_inquiry_number
    FROM inquiry WHERE inquiry_no ~ '[0-9]+$'
  `)
  const max = Number(rows[0]?.max_inquiry_number ?? 0)
  return `Inquiry/${Number.isFinite(max) ? max + 1 : 1}`
}

export async function receivePartnerInquiry(partner: Partner, payload: Payload) {
  const receivedAt = new Date()
const parsed =
  partner === 'CARDEKHO'
    ? parseCardekho(payload)
    : partner === 'JUSTDIAL'
      ? parseJustdial(payload)
      : parseWebsite(payload)
  const rawPayload = await prisma.partnerWebhookPayload.create({
    data: {
      partner,
      externalLeadId: parsed.lead?.leadId ?? null,
      rawPayload: payload as Prisma.InputJsonValue,
      receivedAt,
    },
    select: { partnerWebhookPayloadId: true },
  })
  if (!parsed.lead) return { success: false as const, status: 422, error: parsed.error ?? 'Invalid payload.' }
  const lead = parsed.lead
  const vehicleSelection = lead.vehicle ? await resolvePartnerVehicle(partner, lead.vehicle.description) : null
  await ensureInquirySourceMasterSeed()
const sourceCode = partner === 'WEBSITE' ? 'EXCEL_CARS_MUMBAI' : partner

const source = await prisma.inquirySourceMaster.findFirst({
  where: { code: sourceCode, isActive: true },
  select: { sourceId: true, displayName: true }
})
  if (!source) return { success: false as const, status: 409, error: `${partner} is not an active inquiry source.` }
  const sourceDetail = `Partner lead ID: ${lead.leadId}`

  const [customerId, assignment] = await Promise.all([
    findCustomerId(lead.mobile),
    prisma.inquiryPortalAssignment.findFirst({ where: { sourceId: source.sourceId, isActive: true, assignedToUser: { status: 'Active', roleName: 'InquiryAssistant' } }, select: { assignedToUserId: true } }),
  ])

  try {
    await ensureInquiryActivityLogTable()
    return await prisma.$transaction(async tx => {
      const now = receivedAt
      const claim = await tx.partnerWebhookLead.create({
        data: { partner, externalLeadId: lead.leadId, sourceId: source.sourceId, createdAt: now },
        select: { partnerWebhookLeadId: true },
      })
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(42815501)`
      const inquiry = await tx.inquiry.create({
        data: {
          inquiryNo: await nextInquiryNumber(tx), dateOfInquiry: now, website: source.displayName, sourceId: source.sourceId, sourceDetail,
          customerId, customerNameLegacy: lead.customerName, mobileno: lead.mobile, email: lead.email || null,
          classification: 'Warm', status: 'Open', remark: lead.remark, assignedTo: assignment?.assignedToUserId ?? null, createdDt: now, updatedDt: now,
          ...(lead.vehicle ? { inquiryCarDetails: { create: { ...vehicleSelection, subVariant: lead.vehicle.description, year: lead.vehicle.year, noOfOwners: lead.vehicle.owners, createdDt: now, updatedDt: now } } } : {}),
        },
        select: { inquiryId: true },
      })
      await tx.partnerWebhookLead.update({ where: { partnerWebhookLeadId: claim.partnerWebhookLeadId }, data: { inquiryId: inquiry.inquiryId } })
      await tx.partnerWebhookPayload.update({ where: { partnerWebhookPayloadId: rawPayload.partnerWebhookPayloadId }, data: { inquiryId: inquiry.inquiryId } })
      await logInquiryEvent(tx, { inquiryId: inquiry.inquiryId, eventType: 'partner_inquiry_received', eventLabel: `${source.displayName} enquiry received`, eventDetail: `${sourceDetail}${assignment ? `; assigned to user #${assignment.assignedToUserId}` : '; unassigned'}`, createdAt: now })
      if (assignment?.assignedToUserId) {
        await createUserNotification(tx, { recipientUserId: assignment.assignedToUserId, type: 'portal_lead', title: `New ${source.displayName} lead`, body: `${lead.customerName || 'A new customer'} has been assigned to you.`, href: `/inquiry?search=${encodeURIComponent(lead.leadId)}`, entityType: 'inquiry', entityId: inquiry.inquiryId, dedupeKey: `portal_lead:${partner}:${lead.leadId}:${assignment.assignedToUserId}` })
      }
      return { success: true as const, duplicate: false, inquiryId: inquiry.inquiryId }
    }, { maxWait: 10_000, timeout: 30_000 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.partnerWebhookLead.findUnique({
        where: { partner_externalLeadId: { partner, externalLeadId: lead.leadId } },
        select: { inquiryId: true },
      })
      if (existing?.inquiryId) {
        await prisma.partnerWebhookPayload.update({ where: { partnerWebhookPayloadId: rawPayload.partnerWebhookPayloadId }, data: { inquiryId: existing.inquiryId } })
        return { success: true as const, duplicate: true, inquiryId: existing.inquiryId }
      }
    }
    throw error
  }
}
