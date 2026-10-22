import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { Prisma } from '@prisma/client'
import * as jsxRuntime from 'react/jsx-runtime'

// Execute the real pages/actions/access policy with stubbed I/O. These tests
// never create a Prisma client or connect to any database.
function loadSource(path, imports = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const compiledModule = { exports: {} }
  runInNewContext(source, {
    module: compiledModule,
    exports: compiledModule.exports,
    require(name) {
      if (!(name in imports)) throw new Error(`Unexpected import in ${path}: ${name}`)
      return imports[name]
    },
  }, { filename: path })
  return compiledModule.exports
}

const catalog = loadSource('src/lib/access/accessCatalog.ts')
const validation = loadSource('src/lib/validation.ts')
const catalogNames = loadSource('src/lib/catalogNames.ts')

for (const [route, parameter, query] of [
  ['models', 'makeId', 'getModelsByMake'], ['variants', 'modelId', 'getVariantsByModel'],
]) {
  for (const scenario of ['signed out', 'ordinary lookup', 'repair denied', 'repair permitted', 'invalid ID']) {
    test(`catalog ${route}: ${scenario}`, async () => {
      const calls = []
      const repair = scenario.startsWith('repair')
      const handler = loadSource(`app/api/catalog/${route}/route.ts`, {
        'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
        '../../../../auth': { auth: async () => scenario === 'signed out' ? null : { user: { id: '10' } } },
        '@/lib/access/accessControl': { canCurrentUserAccessRoute: async () => scenario === 'repair permitted' },
        '@/features/inventory/queries': { [query]: async (...args) => { calls.push(args); return [{ id: 7 }] } },
      })
      const params = new URLSearchParams({ [parameter]: scenario === 'invalid ID' ? '-1' : '7', includeIncomplete: repair ? '1' : '0' })
      const result = await handler.GET({ nextUrl: { searchParams: params } })
      assert.equal(result.status, scenario === 'signed out' ? 401 : scenario === 'repair denied' ? 403 : 200)
      if (scenario === 'ordinary lookup' || scenario === 'repair permitted') assert.deepEqual(calls, [[7, repair]])
      else assert.equal(calls.length, 0)
    })
  }
}
const agentTypes = ['Insurance Agent', 'RTO Agent']
const agentInput = { partnerType: 'Insurance Agent', name: 'Test Agent', mobile: '9876543210', email: '' }
const modules = [
  {
    route: '/config/agents', permission: 'Agent_Management',
    actions: 'src/features/agents/adminActions.ts', page: 'app/(dashboard)/config/agents/page.tsx',
    cases: [['createAgent', [agentInput]], ['updateAgent', [7, agentInput]], ['deleteAgent', [7]]],
  },
  {
    route: '/config/catalog', permission: 'Vehicle_Master_Management',
    actions: 'src/features/catalog/adminActions.ts', page: 'app/(dashboard)/config/catalog/page.tsx',
    cases: [
      ['createMake', ['Test Make']], ['updateMake', [7, 'Test Make']], ['deleteMake', [7]],
      ['createModel', ['Test Model', 7]], ['updateModel', [8, 'Test Model', 7]], ['deleteModel', [8]],
      ['createVariant', ['Test Variant', 7, 8]], ['updateVariant', [9, 'Test Variant', 7, 8]], ['deleteVariant', [9]],
    ],
  },
]

function harness({ signedIn = true, grants = [] } = {}) {
  const calls = { business: [], queries: 0, revalidated: [] }
  const delegate = name => ({
    findUnique: async () => { calls.business.push(`${name}.findUnique`); return { make: 'Test Make', model: 'Test Model', fkMakeId: 7, carMakeMaster: { make: 'Test Make' } } },
    findFirst: async () => { calls.business.push(`${name}.findFirst`); return null },
    findMany: async () => { calls.business.push(`${name}.findMany`); return [] },
    count: async () => { calls.business.push(`${name}.count`); return 0 },
    create: async () => { calls.business.push(`${name}.create`); return { pkMakeId: 7, pkModelId: 8, pkVariantId: 9 } },
    update: async () => { calls.business.push(`${name}.update`) },
    delete: async () => { calls.business.push(`${name}.delete`) },
    deleteMany: async () => { calls.business.push(`${name}.deleteMany`) },
  })
  const prisma = Object.fromEntries([
    'partnerMaster', 'carMakeMaster', 'carModelMaster', 'carVariantMaster',
    'inventoryManagement', 'customerFeedback', 'dsaManagement', 'inquiryCarDetails',
    'insuranceMain', 'loanManagement', 'rtoAgent',
  ].map(name => [name, delegate(name)]))
  prisma.$transaction = operations => Promise.all(operations)
  prisma.userTable = { findUnique: async () => ({ userId: 10, roleId: 4, status: 'Active', userName: 'Test User' }) }
  prisma.accessFunctionRole = { findMany: async () => grants.map(accessFunctionName => ({ accessFunction: { accessFunctionName } })) }
  const access = loadSource('src/lib/access/accessControl.ts', {
    '../../../auth': { auth: async () => signedIn ? { user: { id: '10' } } : null },
    '@/lib/db/prisma': { prisma },
    './accessCatalog': catalog,
  })
  const queryResult = () => { calls.queries++; return { rows: [], total: 0, pageCount: 1 } }
  const imports = {
    '@/lib/access/accessControl': access,
    '@/lib/db/prisma': { prisma },
    '@prisma/client': { Prisma },
    'next/cache': { revalidatePath: path => calls.revalidated.push(path) },
    'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`) } },
    'react/jsx-runtime': jsxRuntime,
    './adminQueries': { AGENT_TYPES: agentTypes },
    '@/lib/validation': validation,
    '@/lib/catalogNames': catalogNames,
    '@/features/agents/adminQueries': { AGENT_TYPES: agentTypes, listAgentsPaged: async () => queryResult() },
    '@/features/agents/AgentsClient': { AgentsClient: () => null },
    '@/features/catalog/adminQueries': { listCatalogSummary: async () => queryResult(), getCatalogMakes: async () => { calls.queries++; return [] } },
    '@/features/catalog/CatalogClient': { CatalogClient: () => null },
  }
  return { calls, imports, prisma }
}

for (const [name, args] of [
  ['createMake', [' NULL ']], ['updateMake', [7, 'NA']],
  ['createModel', ['n/a', 7]], ['updateModel', [8, ' ', 7]],
  ['createVariant', ['—', 7, 8]], ['updateVariant', [9, '-', 7, 8]],
]) {
  test(`catalog ${name} rejects placeholder names before database queries`, async () => {
    const { calls, imports } = harness({ grants: ['Vehicle_Master_Management'] })
    const result = await loadSource('src/features/catalog/adminActions.ts', imports)[name](...args)
    assert.equal(result.success, false)
    assert.match(result.error, /placeholders/)
    assert.equal(calls.business.length, 0)
    assert.equal(calls.revalidated.length, 0)
  })
}

for (const model of [null, { model: 'Test', fkMakeId: 99, carMakeMaster: { make: 'Test' } }, { model: 'NA', fkMakeId: 7, carMakeMaster: { make: 'Test' } }, { model: 'Test', fkMakeId: 7, carMakeMaster: { make: null } }]) {
  test(`catalog variants reject missing, mismatched or unnamed parents: ${JSON.stringify(model)}`, async () => {
    const { calls, imports, prisma } = harness({ grants: ['Vehicle_Master_Management'] })
    prisma.carModelMaster.findUnique = async () => model
    const actions = loadSource('src/features/catalog/adminActions.ts', imports)
    for (const result of [await actions.createVariant('Valid', 7, 8), await actions.updateVariant(9, 'Valid', 7, 8)]) assert.equal(result.success, false)
    assert.equal(calls.business.length, 0)
    assert.equal(calls.revalidated.length, 0)
  })
}

test('catalog models reject unnamed parent makes', async () => {
  const { calls, imports, prisma } = harness({ grants: ['Vehicle_Master_Management'] })
  prisma.carMakeMaster.findUnique = async () => ({ make: 'null' })
  const actions = loadSource('src/features/catalog/adminActions.ts', imports)
  assert.equal((await actions.createModel('Valid', 7)).success, false)
  assert.equal((await actions.updateModel(8, 'Valid', 7)).success, false)
  assert.equal(calls.business.length, 0)
})

for (const mod of modules) {
  for (const [name, args] of mod.cases) {
    for (const scenario of ['signed out', 'wrong permission']) {
      test(`${mod.route}: ${name} denies ${scenario} before module data access`, async () => {
        const { calls, imports } = harness({ signedIn: scenario !== 'signed out', grants: ['Inventory_Management'] })
        const result = await loadSource(mod.actions, imports)[name](...args)
        assert.equal(result.success, false)
        assert.equal(result.error, 'Not authorized.')
        assert.equal(calls.business.length, 0)
        assert.equal(calls.revalidated.length, 0)
      })
    }
    test(`${mod.route}: ${name} permits the assigned module permission`, async () => {
      const { calls, imports } = harness({ grants: [mod.permission] })
      const result = await loadSource(mod.actions, imports)[name](...args)
      assert.equal(result.success, true)
      assert.ok(calls.business.length > 0)
      assert.deepEqual(calls.revalidated, [mod.route])
    })
  }
  for (const scenario of ['signed out', 'wrong permission']) {
    test(`${mod.route}: page denies ${scenario} before querying module data`, async () => {
      const { calls, imports } = harness({ signedIn: scenario !== 'signed out', grants: ['Inventory_Management'] })
      await assert.rejects(loadSource(mod.page, imports).default({ searchParams: Promise.resolve({}) }), /REDIRECT:\/dashboard/)
      assert.equal(calls.queries, 0)
    })
  }
  test(`${mod.route}: page renders for the assigned module permission`, async () => {
    const { calls, imports } = harness({ grants: [mod.permission] })
    const page = await loadSource(mod.page, imports).default({ searchParams: Promise.resolve({}) })
    assert.ok(page)
    assert.ok(calls.queries > 0)
  })
}
