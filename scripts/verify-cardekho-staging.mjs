import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { PrismaClient } from '@prisma/client'
import * as catalogApi from '../src/features/inquiry/partnerVehicleCatalog.ts'

const staging = parseEnv(readFileSync('.env.staging.local', 'utf8'))
const production = parseEnv(readFileSync('.env.production.local', 'utf8'))
const identity = value => { const url = new URL(value); return url.hostname.replace('-pooler.', '.') + url.pathname }
assert.notEqual(identity(staging.DATABASE_URL), identity(production.DATABASE_URL), 'Staging target must differ from production')
assert.ok(staging.CARDEKHO_WEBHOOK_SECRET, 'Set the CarDekho staging webhook secret first')
const base = process.argv.find(arg => arg.startsWith('--base-url='))?.slice(11) ?? 'http://localhost:3005'
assert.ok(['http://localhost:3005', 'https://excelcaruat.vercel.app'].includes(base), 'Only the local preview or the approved hosted staging URL can receive the staging secret')
const db = new PrismaClient({ datasourceUrl: staging.DATABASE_URL })
const prefix = `STAGING-CDK-QA-${Date.now()}`
const mobileSeed = Number(Date.now().toString().slice(-7))
const qaMobile = offset => `000${String((mobileSeed + offset) % 10000000).padStart(7, '0')}`
const records = []
try {
  const preflight = await fetch(`${base}/api/webhooks/cardekho/inquiry`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45_000),
    headers: { 'Content-Type': 'application/json', 'x-webhook-secret': staging.CARDEKHO_WEBHOOK_SECRET }, body: '{}',
  })
  assert.equal(preflight.status, 422, preflight.status === 401
    ? 'Staging rejected the configured webhook secret. Align CARDEKHO_WEBHOOK_SECRET between the deployment and .env.staging.local before testing.'
    : `Staging preflight failed (${preflight.status}); no QA inquiries were created.`)
  const catalog = await db.carVariantMaster.findMany({ include: { carMakeMaster: true, carModelMaster: true } })
  const chosen = catalog.find(row => catalogApi.matchPartnerVehicle(`${row.carMakeMaster?.make} ${row.carModelMaster?.model} ${row.variant}`, catalog))
  assert.ok(chosen, 'Need a complete staging catalog vehicle')
  const description = `${chosen.carMakeMaster.make.trim()} ${chosen.carModelMaster.model.trim()} ${chosen.variant.trim()}`
  const expected = catalogApi.matchPartnerVehicle(description, catalog)
  const payload = { lead_id: `${prefix}-matched`, buyer_name: 'STAGING QA CarDekho matched', buyer_mobile: qaMobile(0), mmv: description, mfg_year: '2018', reg_no: 'STAGING-QA', km_driven: '45000', no_of_owners: '1' }
  async function post(body, authorized = true) {
    return fetch(`${base}/api/webhooks/cardekho/inquiry`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45_000), headers: { 'Content-Type': 'application/json', ...(authorized ? { 'x-webhook-secret': staging.CARDEKHO_WEBHOOK_SECRET } : {}) }, body: JSON.stringify(body) })
  }
  async function send(body) {
    const response = await post(body)
    assert.equal(response.status, 200, `Webhook status ${response.status}: ${await response.clone().text()}`)
    assert.equal(await response.text(), 'SUCCESS')
    const lead = await db.partnerWebhookLead.findUnique({ where: { partner_externalLeadId: { partner: 'CARDEKHO', externalLeadId: body.lead_id } } })
    const inquiry = await db.inquiry.findUnique({ where: { inquiryId: lead.inquiryId }, include: { inquiryCarDetails: true } })
    records.push({ inquiryId: inquiry.inquiryId, inquiryNo: inquiry.inquiryNo, leadId: body.lead_id })
    return inquiry
  }
  assert.equal((await post(payload, false)).status, 401)
  const matched = await send(payload)
  assert.equal(matched.inquiryCarDetails[0].fkVariantId, expected.fkVariantId)
  assert.equal(matched.inquiryCarDetails[0].subVariant, description)
  const retry = await post(payload)
  assert.equal(retry.status, 200)
  assert.equal(await db.partnerWebhookLead.count({ where: { partner: 'CARDEKHO', externalLeadId: payload.lead_id } }), 1)
  const unknownText = `Staging QA manually reviewed vehicle ${prefix}`
  const unknown = await send({ ...payload, buyer_mobile: qaMobile(1), lead_id: `${prefix}-unmatched`, buyer_name: 'STAGING QA CarDekho mapping review', mmv: unknownText })
  assert.equal(unknown.inquiryCarDetails[0].fkVariantId, null)
  // Exercise the same confirmation service used by the authorized inquiry edit
  // action, with an existing staging user and only this synthetic description.
  const user = await db.userTable.findFirst({ where: { status: 'Active' }, select: { userId: true } })
  assert.ok(user, 'Need an active staging user for mapping audit')
  const output = ts.transpileModule(readFileSync('src/features/inquiry/partnerVehicleMapping.server.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  runInNewContext(output, { module, exports: module.exports, Error, require: name => { if (name === './partnerVehicleCatalog') return catalogApi; throw new Error(`Unexpected dependency ${name}`) } })
  const manual = await send({ ...payload, buyer_mobile: qaMobile(2), lead_id: `${prefix}-manual`, buyer_name: 'STAGING QA CarDekho confirmed mapping', mmv: `${unknownText} confirmed` })
  await db.$transaction(async tx => {
    await module.exports.rememberPartnerVehicleMapping(tx, { inquiryId: manual.inquiryId, userId: user.userId, existingCars: manual.inquiryCarDetails, cars: [{ subVariant: `${unknownText} confirmed`, fkVariantId: expected.fkVariantId }] })
    await tx.inquiryCarDetails.update({ where: { inquiryCarDetailsId: manual.inquiryCarDetails[0].inquiryCarDetailsId }, data: expected })
  }, { timeout: 30_000 })
  const remembered = await send({ ...payload, buyer_mobile: qaMobile(3), lead_id: `${prefix}-remembered`, buyer_name: 'STAGING QA CarDekho remembered mapping', mmv: `${unknownText} confirmed` })
  assert.equal(remembered.inquiryCarDetails[0].fkVariantId, expected.fkVariantId)
  const storedPayload = await db.partnerWebhookPayload.findFirst({ where: { inquiryId: matched.inquiryId }, select: { rawPayload: true } })
  assert.equal(storedPayload.rawPayload.mmv, description)
  mkdirSync('storage', { recursive: true })
  const report = { environment: 'staging', baseUrl: base, verifiedAt: new Date().toISOString(), checks: ['unsigned request rejected', 'complete catalog match', 'raw MMV preserved', 'duplicate retry idempotent', 'unmatched vehicle accepted', 'mapping confirmation persisted', 'future lead uses saved mapping', 'original JSON retained'], records }
  writeFileSync('storage/cardekho-staging-verification.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error(error.code ? `Staging verification failed (${error.code}).` : error.message)
  console.error('Created QA records:', JSON.stringify(records))
  process.exitCode = 1
} finally { await db.$disconnect() }
