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
import { cleanCatalogName } from '../src/lib/catalogNames.ts'

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
  await api.rememberPartnerVehicleMapping(tx, input)
  assert.equal(write.create.description, input.existingCars[0].subVariant)
  await assert.rejects(api.rememberPartnerVehicleMapping(tx, { ...input, description: 'invented description' }), api.PartnerVehicleMappingError)
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
    './QuickVehicleMapping': { QuickVehicleMapping: () => jsxRuntime.jsx('button', { children: 'Needs vehicle mapping · Map vehicle' }) },
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

test('quick mapping enforces access and updates only the original unmapped vehicle while remembering its description', async () => {
  let allowed = false, owned = true, reads = 0, updated, remembered, inquiryUpdate, logged, changed = false, olderRows = [], olderWhere
  const updates = []
  const mapping = load('src/features/inquiry/partnerVehicleMapping.server.ts', { './partnerVehicleCatalog': catalogModule })
  const car = { inquiryCarDetailsId: 8, fkInquiryId: 7, fkVariantId: null, subVariant: 'BMW X1 partner trim', year: 2018 }
  const db = {
    partnerWebhookPayload: { findFirst: async ({ where }) => { reads++; assert.equal(where.inquiryId, 7); return { rawPayload: { mmv: car.subVariant } } } },
    inquiryCarDetails: {
      findMany: async ({ where }) => {
        if (typeof where.fkInquiryId === 'object') { olderWhere = where; return olderRows }
        return [car]
      },
      updateMany: async args => { updated = args; updates.push(args); return { count: changed ? 0 : 1 } },
    },
    carVariantMaster: { findMany: async () => [variant, { ...variant, pkVariantId: 11, variant: 'NA' }], findUnique: async ({ where }) => where.pkVariantId === 10 ? variant : null },
    carMakeMaster: { findMany: async () => [{ pkMakeId: 1, make: 'BMW' }, { pkMakeId: 2, make: 'NA' }] },
    carModelMaster: { findMany: async () => [{ pkModelId: 2, fkMakeId: 1, model: 'X1' }] },
    partnerVehicleMapping: { findUnique: async () => null, upsert: async args => { remembered = args } },
    inquiry: { update: async args => { inquiryUpdate = args } },
    $transaction: async callback => callback(db),
  }
  const api = load('src/features/inquiry/quickVehicleMapping.actions.ts', {
    'next/cache': { revalidatePath() {} }, '@/lib/db/prisma': { prisma: db },
    '@/lib/access/accessControl': { getAuthorizedUserIdForRoute: async () => allowed ? 4 : null },
    '@/lib/access/inquiryOwnership': { canAccessInquiryByOwnership: async () => owned,
      getInquiryOwnershipScopeForRoute: async () => ({ userId: 4, restrictToUserId: 4 }),
      buildInquiryOwnershipWhere: userId => ({ createdBy: userId }) },
    '@/lib/catalogNames': { cleanCatalogName },
    './partnerVehicleCatalog': catalogModule, './partnerVehicleMapping.server': mapping,
    './eventLog': { ensureInquiryActivityLogTable: async () => {}, logInquiryEvent: async (_, event) => { logged = event } },
  })
  assert.ok((await api.getQuickVehicleMappingOptions(7)).error)
  assert.equal((await api.saveQuickVehicleMapping(7, 10)).success, false)
  allowed = true; owned = false
  assert.equal((await api.saveQuickVehicleMapping(7, 10)).success, false)
  assert.equal(reads, 0)
  owned = true
  const choices = await api.getQuickVehicleMappingOptions(7)
  assert.equal(choices.description, car.subVariant)
  assert.equal(choices.options.length, 1)
  assert.equal(choices.makes.length, 1)
  assert.equal(choices.canCreateCatalog, true)
  assert.equal((await api.saveQuickVehicleMapping(7, -1)).success, false)
  assert.equal((await api.saveQuickVehicleMapping(7, 999)).success, false)
  assert.equal(updated, undefined)
  assert.equal((await api.saveQuickVehicleMapping(7, 10)).success, true)
  assert.equal(updated.where.inquiryCarDetailsId, 8)
  assert.equal(updated.where.fkInquiryId, 7)
  assert.equal(updated.where.fkVariantId, null)
  assert.equal(updated.where.subVariant, car.subVariant)
  assert.equal(updated.data.fkVariantId, 10)
  assert.equal(updated.data.makeLegacy, 'BMW')
  assert.equal(updated.data.updatedBy, 4)
  assert.equal(updated.data.subVariant, undefined)
  assert.equal(updated.data.year, undefined)
  assert.equal(inquiryUpdate.data.status, undefined)
  assert.equal(remembered.create.description, car.subVariant)
  assert.equal(remembered.create.variantId, 10)
  assert.equal(logged.actorUserId, 4)
  olderRows = [
    { ...car, inquiryCarDetailsId: 9, fkInquiryId: 12, subVariant: 'BMW X1 partner-trim' },
    { ...car, inquiryCarDetailsId: 10, fkInquiryId: 13, subVariant: 'Different vehicle' },
    { ...car, inquiryCarDetailsId: 11, fkInquiryId: 14, fkVariantId: 20 },
    { ...car, inquiryCarDetailsId: 12, fkInquiryId: 15, makeLegacy: 'Edited manually' },
  ]
  assert.equal((await api.getQuickVehicleMappingOptions(7)).olderInquiryCount, 1)
  assert.equal(olderWhere.inquiry.AND[0].createdBy, 4)
  assert.equal(olderWhere.makeLegacy, null)
  updates.length = 0
  const bulk = await api.saveQuickVehicleMapping(7, 10, { applyToExisting: true, description: car.subVariant })
  assert.equal(bulk.success, true)
  assert.equal(bulk.updatedOlderCount, 1)
  assert.equal(updates.length, 2)
  assert.equal(updates[1].where.inquiryCarDetailsId, 9)
  assert.equal(updates[1].where.inquiry.createdBy, 4)
  assert.equal(updates[1].data.subVariant, undefined)
  updates.length = 0
  await api.saveQuickVehicleMapping(7, 10, { applyToExisting: false })
  assert.equal(updates.length, 1)
  changed = true
  assert.match((await api.saveQuickVehicleMapping(7, 10)).error, /changed/)
  car.fkVariantId = 10
  assert.match((await api.getQuickVehicleMappingOptions(7)).error, /already mapped/)
})

test('legacy CarDekho descriptions work without webhook payloads and other sources cannot create mappings', async () => {
  const api = load('src/features/inquiry/partnerVehicleMapping.server.ts', { './partnerVehicleCatalog': catalogModule })
  let website = 'CarDekho'
  const db = {
    partnerWebhookPayload: { findFirst: async () => null },
    inquiry: { findUnique: async () => ({ website, source: null }) },
  }
  const cars = [{ subVariant: 'Mercedes-Benz E-class 280 CDI' }]
  assert.equal(await api.resolvePartnerMappingDescription(db, 7, cars), cars[0].subVariant)
  await assert.rejects(api.resolvePartnerMappingDescription(db, 7, cars, 'Invented vehicle'), api.PartnerVehicleMappingError)
  await assert.rejects(api.resolvePartnerMappingDescription(db, 7, []), api.PartnerVehicleMappingError)
  website = 'Justdial'
  await assert.rejects(api.resolvePartnerMappingDescription(db, 7, cars), api.PartnerVehicleMappingError)
})

test('mapping dialog adds a missing variant in place and submits the older-inquiry option', async () => {
  const data = { description: 'BMW X1 partner trim', options: [], makes: [{ id: 1, name: 'BMW' }],
    models: [{ id: 2, makeId: 1, name: 'X1' }], canCreateCatalog: true, olderInquiryCount: 3 }
  const states = [true, false, false, '', data, '1', '2', '__new__', { make: '', model: '', variant: 'New trim' }, true, '']
  let stateIndex = 0, created, saved, refreshes = 0
  const fakeReact = {
    useEffect() {}, useId: () => 'mapping', useRef: () => ({ current: null }),
    useState: initial => {
      const index = stateIndex++
      if (!(index in states)) states[index] = initial
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
    },
  }
  const api = load('src/features/inquiry/QuickVehicleMapping.tsx', {
    'react/jsx-runtime': jsxRuntime, react: fakeReact,
    'next/navigation': { useRouter: () => ({ refresh() { refreshes++ } }) },
    './quickVehicleMapping.actions': {
      getQuickVehicleMappingOptions: async () => ({ ...data, options: [{ variantId: 20, makeId: 1, modelId: 2, make: 'BMW', model: 'X1', variant: 'New trim' }] }),
      saveQuickVehicleMapping: async (...args) => { saved = args; return { success: true, updatedOlderCount: 3 } },
    },
    '@/features/catalog/adminActions': {
      createMake: async () => { throw new Error('Unexpected make creation') }, createModel: async () => { throw new Error('Unexpected model creation') },
      createVariant: async (...args) => { created = args; return { success: true, id: 20 } },
    },
  })
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
  const render = () => { stateIndex = 0; return nodes(api.QuickVehicleMapping({ inquiryId: 7, vehicleDescription: data.description })) }
  let tree = render()
  assert.ok(tree.some(node => node.type === 'option' && node.props.children === '+ Add a missing variant'))
  await tree.find(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children[0] === 'Add ').props.onClick()
  assert.deepEqual(created, ['New trim', 1, 2])
  tree = render()
  assert.equal(states[7], '20')
  await tree.find(node => node.type === 'button' && node.props.children === 'Save & remember mapping').props.onClick()
  assert.equal(saved[0], 7)
  assert.equal(saved[1], 20)
  assert.equal(saved[2].applyToExisting, true)
  assert.equal(saved[2].description, data.description)
  tree = render()
  assert.ok(tree.some(node => node.props?.role === 'status' && /3 older matching inquiries/.test(node.props.children)))
  tree.find(node => node.type === 'button' && node.props.children === 'Done').props.onClick()
  assert.equal(refreshes, 1)
})
