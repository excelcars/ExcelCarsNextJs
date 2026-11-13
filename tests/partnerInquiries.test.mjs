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
    partnerWebhookPayload: { findFirst: async ({ where }) => { assert.equal(where.inquiryId, 7); return { rawPayload } } },
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
    '@/lib/db/prisma': { prisma: { partnerWebhookPayload: { findFirst: async () => { reads++; return { partner: 'CARDEKHO', receivedAt: new Date(), rawPayload: { mmv: 'BMW X1', secret: 'hidden' } } } } } },
  })
  assert.equal(await api.getInquiryPartnerDetails(7), null)
  allowed = true; owned = false
  assert.equal(await api.getInquiryPartnerDetails(7), null)
  assert.equal(reads, 0)
  owned = true
  assert.equal((await api.getInquiryPartnerDetails(7)).fields[0].value, 'BMW X1')
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
  const row = { inquiryId: 7, website: 'CarDekho', sourceDetail: 'Partner lead ID: 1', inquiryCarDetails: [{ subVariant: 'BMW <X1>', year: 2018, carVariantMaster: null }] }
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
