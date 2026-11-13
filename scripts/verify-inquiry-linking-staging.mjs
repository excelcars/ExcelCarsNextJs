import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { PrismaClient } from '@prisma/client'
import { matchPartnerVehicle } from '../src/features/inquiry/partnerVehicleCatalog.ts'

const staging = parseEnv(readFileSync('.env.staging.local', 'utf8'))
const production = parseEnv(readFileSync('.env.production.local', 'utf8'))
const identity = value => { const url = new URL(value); return url.hostname.replace('-pooler.', '.') + url.pathname }
assert.notEqual(identity(staging.DATABASE_URL), identity(production.DATABASE_URL))
const base = process.argv.find(arg => arg.startsWith('--base-url='))?.slice(11) ?? 'http://localhost:3005'
assert.ok(['http://localhost:3005', 'https://excelcaruat.vercel.app'].includes(base))
const db = new PrismaClient({ datasourceUrl: staging.DATABASE_URL })
const stamp = Date.now().toString()
const prefix = `STAGING-LINK-QA-${stamp}`
const mobile = `000${stamp.slice(-7)}`
const newMobile = `001${stamp.slice(-7)}`
const created = []
try {
  const preflight = await fetch(`${base}/api/webhooks/cardekho/inquiry`, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', 'x-webhook-secret': staging.CARDEKHO_WEBHOOK_SECRET }, body: '{}', signal: AbortSignal.timeout(45_000) })
  assert.equal(preflight.status, 422, 'Webhook authentication/validation must succeed before seeding QA records')
  const catalog = await db.carVariantMaster.findMany({ include: { carMakeMaster: true, carModelMaster: true } })
  const variant = catalog.find(row => matchPartnerVehicle(`${row.carMakeMaster?.make} ${row.carModelMaster?.model} ${row.variant}`, catalog))
  assert.ok(variant)
  const description = `${variant.carMakeMaster.make.trim()} ${variant.carModelMaster.model.trim()} ${variant.variant.trim()}`
  const owner = await db.userTable.findFirst({ where: { status: 'Active' }, select: { userId: true } })
  assert.ok(owner)
  const customer = await db.customer.create({ data: { custName: `${prefix} contact`, custMobile: `+91 ${mobile}`, updatedBy: owner.userId } })
  const seed = await db.inquiry.create({ data: {
    inquiryNo: `${prefix}/existing`, customerId: customer.custId, customerNameLegacy: `${prefix} existing contact`,
    mobileno: null, website: 'Walk-in', sourceDetail: 'Original manual inquiry',
    status: 'FollowUp', classification: 'Hot', assignedTo: owner.userId, createdBy: owner.userId,
    dateOfInquiry: new Date(), followUpDate: new Date(Date.now() + 86400000), remark: 'Keep original follow-up notes',
  } })
  created.push(seed.inquiryId)
  const payload = { buyer_name: `${prefix} repeat contact`, buyer_mobile: mobile, mmv: description, mfg_year: '2018', no_of_owners: '1', reg_no: 'STAGING-QA' }
  async function send(body) {
    const response = await fetch(`${base}/api/webhooks/cardekho/inquiry`, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', 'x-webhook-secret': staging.CARDEKHO_WEBHOOK_SECRET }, body: JSON.stringify(body), signal: AbortSignal.timeout(45_000) })
    assert.equal(response.status, 200, `Webhook failed (${response.status})`)
    assert.equal(await response.text(), 'SUCCESS')
    const lead = await db.partnerWebhookLead.findUnique({ where: { partner_externalLeadId: { partner: 'CARDEKHO', externalLeadId: body.lead_id } } })
    assert.ok(lead?.inquiryId)
    return lead.inquiryId
  }
  const first = { ...payload, lead_id: `${prefix}-existing-a` }
  const second = { ...payload, buyer_mobile: `+91 ${mobile}`, lead_id: `${prefix}-existing-b`, mfg_year: '2019' }
  const linked = await Promise.all([send(first), send(second)])
  assert.deepEqual(linked, [seed.inquiryId, seed.inquiryId])
  assert.equal(await send(first), seed.inquiryId)
  const after = await db.inquiry.findUnique({ where: { inquiryId: seed.inquiryId }, include: { inquiryCarDetails: true } })
  for (const field of ['website', 'sourceDetail', 'status', 'classification', 'assignedTo', 'customerId', 'mobileno']) assert.equal(after[field], seed[field])
  for (const field of ['dateOfInquiry', 'followUpDate']) assert.equal(after[field].toISOString(), seed[field].toISOString())
  assert.ok(after.remark.startsWith('Keep original follow-up notes'))
  assert.equal(after.remark.split(first.lead_id).length - 1, 1)
  assert.equal(after.remark.split(second.lead_id).length - 1, 1)
  assert.equal(after.inquiryCarDetails.length, 2)
  const leads = await db.partnerWebhookLead.findMany({ where: { inquiryId: seed.inquiryId } })
  assert.equal(leads.length, 2)
  assert.equal(await db.partnerWebhookPayload.count({ where: { inquiryId: seed.inquiryId } }), 3)
  const freshA = { ...payload, buyer_mobile: newMobile, lead_id: `${prefix}-fresh-a` }
  const freshB = { ...freshA, lead_id: `${prefix}-fresh-b` }
  const fresh = await Promise.all([send(freshA), send(freshB)])
  created.push(...new Set(fresh))
  assert.equal(fresh[0], fresh[1], 'Concurrent leads for a new contact must share one inquiry')
  assert.equal(await db.inquiry.count({ where: { mobileno: newMobile } }), 1)
  assert.equal(await db.inquiryCarDetails.count({ where: { fkInquiryId: fresh[0] } }), 1)
  const retries = await Promise.all([send(freshA), send(freshA)])
  assert.ok(retries.every(id => id === fresh[0]))
  assert.equal(await db.partnerWebhookLead.count({ where: { inquiryId: fresh[0] } }), 2)
  const report = { environment: 'staging', baseUrl: base, verifiedAt: new Date().toISOString(), inquiryIds: created, checks: ['normalized linked-customer mobile match', 'new lead IDs linked to existing inquiry', 'owner/status/source/follow-up preserved', 'new vehicle requirements appended', 'retry does not repeat notes or vehicles', 'original receipts retained', 'concurrent new contact creates one inquiry', 'simultaneous retries remain idempotent'] }
  mkdirSync('storage', { recursive: true })
  writeFileSync('storage/inquiry-linking-staging-verification.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error(error.name === 'AssertionError' ? error.message : error.code ? `Verification failed (${error.code}).` : error.message)
  console.error('QA inquiry IDs:', created.join(', '))
  process.exitCode = 1
} finally { await db.$disconnect() }
