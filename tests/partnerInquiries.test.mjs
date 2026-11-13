import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as crypto from 'node:crypto'
import { Prisma } from '@prisma/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { matchPartnerVehicle, partnerVehicleSelection, partnerVehicleKey } from '../src/features/inquiry/partnerVehicleCatalog.ts'
import { readablePartnerPayload } from '../src/features/inquiry/partnerPayload.ts'

function load(path, imports) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const compiledModule = { exports: {} }
  runInNewContext(source, { module: compiledModule, exports: compiledModule.exports, Buffer, Error, console,
    require(name) { if (!(name in imports)) throw new Error(`Unexpected import ${name}`); return imports[name] } })
  return compiledModule.exports
}
const catalogModule = { matchPartnerVehicle, partnerVehicleSelection, partnerVehicleKey }
const variant = { pkVariantId: 10, variant: 'sDrive 20d', carMakeMaster: { pkMakeId: 1, make: 'BMW' }, carModelMaster: { pkModelId: 2, fkMakeId: 1, model: 'X1' } }

test('contact lookup uses normalized inquiry/customer mobile and linked customer, with active matches first', async () => {
  let query
  const api = load('src/features/inquiry/existingInquiry.server.ts', { '@prisma/client': { Prisma } })
  const client = { $queryRaw: async sql => { query = sql; return [] } }
  await api.findContactInquiries(client, { mobile: '+91 97028 08199', customerId: 8, excludeInquiryId: 9, preferActive: true, limit: 1 })
  assert.equal(api.normalizeInquiryMobile('+91 97028 08199'), '9702808199')
  assert.match(query.sql, /LEFT JOIN customer/)
  assert.match(query.sql, /i\.mobileno/)
  assert.match(query.sql, /c\.cust_mobile/)
  assert.match(query.sql, /i\.customer_id =/)
  assert.match(query.sql, /closed.*converted/)
  assert.ok(query.values.includes('9702808199'))
  assert.ok(query.values.includes(9))
  assert.equal(query.values.at(-1), 1)
})

test('new partner lead IDs link to the contact inquiry, preserve its state, and deduplicate vehicle rows', async () => {
  const cars = [{ inquiryCarDetailsId: 1, fkVariantId: 10, subVariant: 'BMW X1 sDrive20d', year: 2018 }]
  const updates = [], claims = [], logs = [], notices = []
  let lookupAfterLock = false, locked = false, creates = 0, payloadId = 0
  const db = {
    partnerWebhookPayload: { create: async () => ({ partnerWebhookPayloadId: ++payloadId }), update: async input => updates.push(input) },
    inquirySourceMaster: { findFirst: async () => ({ sourceId: 3, displayName: 'CarDekho' }) },
    inquiryPortalAssignment: { findFirst: async () => ({ assignedToUserId: 99 }) },
    partnerWebhookLead: { create: async () => ({ partnerWebhookLeadId: payloadId }), update: async input => claims.push(input) },
    inquiry: {
      create: async () => { creates++; throw new Error('Must not create an inquiry for an existing contact') },
      findUnique: async () => ({ inquiryId: 42, inquiryNo: 'Inquiry/42', remark: 'Existing follow-up notes', assignedTo: 7, createdBy: 8, inquiryCarDetails: cars }),
      update: async input => updates.push(input),
    },
    inquiryCarDetails: { create: async ({ data }) => cars.push({ ...data, inquiryCarDetailsId: cars.length + 1 }), update: async () => {} },
    $executeRaw: async () => { locked = true }, $queryRaw: async () => [], $transaction: async callback => callback(db),
  }
  const api = load('src/features/inquiry/partnerWebhook.ts', {
    'node:crypto': crypto, '@prisma/client': { Prisma }, '@/lib/db/prisma': { prisma: db },
    './eventLog': { ensureInquiryActivityLogTable: async () => {}, logInquiryEvent: async (_tx, event) => logs.push(event) },
    './sourceMaster.server': { ensureInquirySourceMasterSeed: async () => {} },
    '@/features/notifications/service': { createUserNotification: async (_tx, notice) => notices.push(notice) },
    './partnerVehicleCatalog.server': { resolvePartnerVehicle: async () => partnerVehicleSelection(variant) },
    './existingInquiry.server': { findContactInquiries: async () => { lookupAfterLock = locked; return [{ inquiry_id: 42 }] } },
    './partnerVehicleCatalog': catalogModule,
  })
  const payload = { lead_id: 'new-cdk-1', buyer_name: 'Test', buyer_mobile: '+91 9702808199', mmv: 'BMW X1 sDrive20d', mfg_year: '2018' }
  assert.equal((await api.receivePartnerInquiry('CARDEKHO', payload)).inquiryId, 42)
  assert.equal(cars.length, 1)
  assert.equal((await api.receivePartnerInquiry('CARDEKHO', { ...payload, lead_id: 'new-cdk-2', mfg_year: '2020' })).linked, true)
  assert.equal(cars.length, 2)
  assert.equal(creates, 0)
  assert.equal(lookupAfterLock, true)
  assert.equal(claims.length, 2)
  assert.ok(claims.every(claim => claim.data.inquiryId === 42))
  for (const update of updates.filter(update => 'remark' in update.data)) {
    assert.match(update.data.remark, /^Existing follow-up notes/)
    assert.match(update.data.remark, /Lead ID: new-cdk/)
    for (const field of ['assignedTo', 'status', 'sourceId', 'sourceDetail', 'followUpDate', 'dateOfInquiry']) assert.equal(update.data[field], undefined)
  }
  assert.ok(logs.every(event => event.eventType === 'partner_inquiry_linked'))
  assert.ok(notices.every(notice => notice.recipientUserId === 7))
  const jd = await api.receivePartnerInquiry('JUSTDIAL', { leadid: 'new-jd-1', name: 'Test', mobile: '9702808199' })
  assert.equal(jd.inquiryId, 42)
  assert.equal(jd.linked, true)
  assert.equal(creates, 0)
  assert.equal(cars.length, 2)
})

test('saved confirmed mappings take precedence and invalid targets fall back to catalog matching', async () => {
  let saved = { variant }
  const resolver = load('src/features/inquiry/partnerVehicleCatalog.server.ts', {
    './partnerVehicleCatalog': catalogModule,
    '@/lib/db/prisma': { prisma: { partnerVehicleMapping: { findUnique: async () => saved }, carVariantMaster: { findMany: async () => [variant] } } },
  })
  assert.equal((await resolver.resolvePartnerVehicle('CARDEKHO', 'A manually confirmed description')).fkVariantId, 10)
  saved = { variant: { ...variant, variant: 'NA' } }
  assert.equal(await resolver.resolvePartnerVehicle('CARDEKHO', 'A manually confirmed description'), null)
  assert.equal((await resolver.resolvePartnerVehicle('CARDEKHO', 'BMW X1 sDrive20d')).fkVariantId, 10)
})

test('remembering a mapping is bound to the original stored payload and rejects conflicting selections', async () => {
  let write
  let rawPayload = { mmv: 'BMW X1 partner trim' }
  const api = load('src/features/inquiry/partnerVehicleMapping.server.ts', { './partnerVehicleCatalog': catalogModule })
  const tx = {
    partnerWebhookPayload: { findMany: async ({ where }) => { assert.equal(where.inquiryId, 7); return [{ rawPayload }] } },
    carVariantMaster: { findUnique: async () => variant },
    partnerVehicleMapping: { findUnique: async () => null, upsert: async input => { write = input } },
  }
  const input = { inquiryId: 7, userId: 4, existingCars: [{ subVariant: rawPayload.mmv }], cars: [{ subVariant: rawPayload.mmv, fkVariantId: 10 }] }
  await api.rememberPartnerVehicleMapping(tx, input)
  assert.equal(write.create.confirmedBy, 4)
  assert.equal(write.create.variantId, 10)
  assert.equal(write.create.description, rawPayload.mmv)
  await assert.rejects(api.rememberPartnerVehicleMapping(tx, { ...input, cars: [{ subVariant: 'invented description', fkVariantId: 10 }] }), api.PartnerVehicleMappingError)
  await assert.rejects(api.rememberPartnerVehicleMapping(tx, { ...input, cars: [...input.cars, { subVariant: rawPayload.mmv, fkVariantId: 20 }] }), api.PartnerVehicleMappingError)
  rawPayload = null
  await assert.rejects(api.rememberPartnerVehicleMapping(tx, input), api.PartnerVehicleMappingError)
})

test('partner details require route permission and inquiry ownership before reading payloads', async () => {
  let allowed = false, owned = true, reads = 0
  const api = load('src/features/inquiry/partnerDetails.actions.ts', {
    '@/lib/access/accessControl': { getAuthorizedUserIdForRoute: async () => allowed ? 1 : null },
    '@/lib/access/inquiryOwnership': { canAccessInquiryByOwnership: async () => owned },
    './partnerPayload': { readablePartnerPayload },
    '@/lib/db/prisma': { prisma: { partnerWebhookPayload: { findMany: async () => { reads++; return [{ partnerWebhookPayloadId: 1, partner: 'CARDEKHO', receivedAt: new Date(), rawPayload: { mmv: 'BMW X1', secret: 'hidden' } }, { partnerWebhookPayloadId: 2, partner: 'JUSTDIAL', receivedAt: new Date(), rawPayload: { category: 'Used cars' } }] } } } },
  })
  assert.equal(await api.getInquiryPartnerDetails(7), null)
  allowed = true; owned = false
  assert.equal(await api.getInquiryPartnerDetails(7), null)
  assert.equal(reads, 0)
  owned = true
  const details = await api.getInquiryPartnerDetails(7)
  assert.equal(details.fields[0].value, 'BMW X1')
  assert.equal(details.submissions.length, 2)
  assert.equal(details.submissions[1].fields[0].value, 'Used cars')
  assert.equal(await api.getInquiryPartnerDetails(7, '/dashboard'), null)
  assert.equal(reads, 1)
})

test('webhook saves resolved catalog fields, keeps original text and retains unmatched inquiries', async () => {
  let selection = partnerVehicleSelection(variant), created
  const db = {
    partnerWebhookPayload: { create: async () => ({ partnerWebhookPayloadId: 1 }), update: async () => {} },
    inquirySourceMaster: { findFirst: async () => ({ sourceId: 3, displayName: 'CarDekho' }) },
    inquiryPortalAssignment: { findFirst: async () => null },
    partnerWebhookLead: { create: async () => ({ partnerWebhookLeadId: 1 }), update: async () => {} },
    inquiry: { create: async ({ data }) => { created = data; return { inquiryId: 7 } } },
    $executeRaw: async () => 0,
    $queryRaw: async query => query.sql.includes('MAX') ? [{ max_inquiry_number: 1 }] : [],
    $transaction: async callback => callback(db),
  }
  const api = load('src/features/inquiry/partnerWebhook.ts', {
    'node:crypto': crypto, '@prisma/client': { Prisma }, '@/lib/db/prisma': { prisma: db },
    './eventLog': { ensureInquiryActivityLogTable: async () => {}, logInquiryEvent: async () => {} },
    './sourceMaster.server': { ensureInquirySourceMasterSeed: async () => {} },
    '@/features/notifications/service': { createUserNotification: async () => {} },
    './partnerVehicleCatalog.server': { resolvePartnerVehicle: async () => selection },
    './existingInquiry.server': { findContactInquiries: async () => [] },
    './partnerVehicleCatalog': catalogModule,
  })
  const payload = { lead_id: 'test-1', buyer_name: 'Test', buyer_mobile: '9000000000', mmv: 'BMW X1 sDrive20d', mfg_year: '2018' }
  assert.equal((await api.receivePartnerInquiry('CARDEKHO', payload)).success, true)
  assert.equal(created.inquiryCarDetails.create.fkVariantId, 10)
  assert.equal(created.inquiryCarDetails.create.subVariant, payload.mmv)
  selection = null
  await api.receivePartnerInquiry('CARDEKHO', payload)
  assert.equal(created.inquiryCarDetails.create.fkVariantId, undefined)
  assert.equal(created.inquiryCarDetails.create.subVariant, payload.mmv)
  assert.equal((await api.receivePartnerInquiry('CARDEKHO', { ...payload, lead_id: '' })).status, 422)
  await api.receivePartnerInquiry('JUSTDIAL', { leadid: 'jd-1', name: 'Test', mobile: '9000000000' })
  assert.equal(created.inquiryCarDetails, undefined)
})

test('table and compact cards show partner details and retain unmatched vehicle text', () => {
  const imports = {
    'react/jsx-runtime': jsxRuntime, 'lucide-react': { Mail: () => null, MapPin: () => null, Phone: () => null },
    '@/lib/listFormatters': { cleanListValue: value => value?.trim() ?? '', formatListDate: () => '', formatListMoney: () => '' },
    '@/components/ui': { Badge: () => null }, './PartnerInquiryDetails': { PartnerInquiryDetails: () => jsxRuntime.jsx('span', { children: 'Partner details' }) },
  }
  const { InquiryTableDataCells } = load('src/features/inquiry/InquiryTableDataCells.tsx', imports)
  const row = { inquiryId: 7, website: 'Walk-in', sourceDetail: 'Original manual inquiry', hasPartnerPayload: true, hasCardekhoPayload: true, inquiryCarDetails: [{ subVariant: 'BMW <X1>', year: 2018, carVariantMaster: null }] }
  const markup = renderToStaticMarkup(jsxRuntime.jsx('table', { children: jsxRuntime.jsx('tbody', { children: jsxRuntime.jsx('tr', { children: jsxRuntime.jsx(InquiryTableDataCells, { row, number: 1, assignedToLabel: 'Unassigned' }) }) }) }))
  assert.match(markup, /BMW &lt;X1&gt;/)
  assert.match(markup, /Needs vehicle mapping/)
  assert.match(markup, /Partner details/)
  const { InquiryMobileCard } = load('src/features/inquiry/InquiryMobileCard.tsx', imports)
  const card = renderToStaticMarkup(jsxRuntime.jsx(InquiryMobileCard, { row, number: 1, assignedToLabel: 'Unassigned' }))
  assert.match(card, /BMW &lt;X1&gt;/)
  assert.match(card, /Needs vehicle mapping/)
  assert.match(card, /Partner details/)
})
