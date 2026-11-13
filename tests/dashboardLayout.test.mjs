import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as react from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { Prisma } from '@prisma/client'

function load(path, imports) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const compiledModule = { exports: {} }
  runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: name => {
    assert.ok(name in imports, `Unexpected import: ${name}`)
    return imports[name]
  } })
  return compiledModule.exports
}

function nodes(element) {
  if (!element || typeof element !== 'object') return []
  if (Array.isArray(element)) return element.flatMap(nodes)
  return [element, ...nodes(element.props?.children)]
}

const recharts = Object.fromEntries(['BarChart', 'Bar', 'Cell', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'ResponsiveContainer'].map(name => [name, name]))
const imports = { 'react/jsx-runtime': jsxRuntime, recharts, '@/components/ui': { N: '#1B2A6B' } }

test('appointment dashboard counts and linked follow-up queue include current and legacy sub-status names', async () => {
  const appointments = load('src/lib/inquiryAppointments.ts', {})
  let aggregate
  const dashboard = load('src/features/dashboard/queries.ts', {
    '@/lib/db/prisma': { prisma: { $queryRaw: async query => {
      aggregate = query
      return [{ appointment: 2, own_appointment: 1 }]
    } } },
    '@prisma/client': { Prisma },
    '@/lib/inquiryAppointments': appointments,
  })
  const rows = await dashboard.getLegacyLeadDetails({ userId: 7, roleId: 1 })
  const appointment = rows.find(row => row.label === "Today's Appointment Fixed")
  assert.equal(appointment.total, 2)
  assert.equal(appointment.own, 1)
  assert.equal(appointment.other, 1)
  const params = new URL(appointment.href, 'https://example.test').searchParams
  assert.equal(params.get('subStatus'), 'Appointment Fixed')
  assert.equal(params.get('followUpDateFrom'), params.get('followUpDateTo'))
  assert.equal(new URL(appointment.ownHref, 'https://example.test').searchParams.get('userId'), '7')

  // Both total and own aggregate clauses must include both saved names.
  const clauses = aggregate.sql.split('\n').filter(line => /AS (?:own_)?appointment,/.test(line))
  assert.equal(clauses.length, 2)
  for (const clause of clauses) {
    assert.match(clause, /status = 'FollowUp'/)
    assert.match(clause, /LOWER\(sub_status\) IN \(\?,\?\)/)
    assert.match(clause, /follow_up_date >= \? AND follow_up_date < \?/)
  }
  assert.equal(aggregate.values.filter(value => value === 'appointment fixed').length, 2)
  assert.equal(aggregate.values.filter(value => value === 'appt. fixed').length, 2)

  let where
  const followups = load('src/features/followup/queries.ts', {
    '@/lib/db/prisma': { prisma: { inquiry: {
      findMany: async args => { where = args.where; return [] },
      count: async () => 0,
    } } },
    '@/lib/access/inquiryOwnership': { buildInquiryOwnershipWhere: userId => ({ createdBy: userId }) },
    '@/lib/inquiryAppointments': appointments,
  })
  const filters = Object.fromEntries([
    'search', 'contactOutcome', 'customerName', 'inquiryDateFrom', 'inquiryDateTo',
    'visitedDateFrom', 'visitedDateTo', 'budgetFrom', 'budgetTo', 'website',
    'customerMobile', 'userId', 'makeId', 'modelId', 'variantId',
  ].map(key => [key, '']))
  Object.assign(filters, Object.fromEntries(params), { classification: 'All', page: 1 })
  for (const subStatus of ['Appointment Fixed', 'Appt. Fixed', 'appointment fixed']) {
    await followups.listFollowupQueue({ ...filters, subStatus })
    assert.deepEqual(Array.from(where.subStatus.in), ['Appointment Fixed', 'Appt. Fixed'])
    assert.equal(where.subStatus.mode, 'insensitive')
    assert.equal(where.status, 'FollowUp')
    assert.ok(where.followUpDate.gte < where.followUpDate.lte)
  }
  await followups.listFollowupQueue({ ...filters, subStatus: 'Busy' })
  assert.equal(where.subStatus.contains, 'Busy')
})

function loadWorkTable() {
  return load('src/features/dashboard/DashboardCommandCenterClient.tsx', {
    'react/jsx-runtime': jsxRuntime, react, 'lucide-react': {},
    '@/components/ui': { Badge: 'Badge', Modal: 'Modal' },
    './LeadSourceChart': { LeadSourceChart: 'LeadSourceChart' },
    './LeadLocationChart': { LeadLocationChart: 'LeadLocationChart' },
  }).WorkTable
}

test('mobile record cards preserve every field and action from desktop rows', () => {
  const WorkTable = loadWorkTable()
  let clicks = 0
  const action = react.createElement('button', { onClick: () => clicks++ }, 'Details')
  const row = react.createElement('tr', { key: 'customer-1' },
    react.createElement('td', null, 'Sample customer'),
    react.createElement('td', null, '75000'),
    react.createElement('td', null, react.createElement('a', { href: '/loan?search=MH00AB1234' }, 'Open'), action),
  )
  const tree = WorkTable({ headers: ['Customer', 'Balance', 'Action'], children: [row] })
  const card = nodes(tree).find(node => node.type === 'dl')
  assert.deepEqual(nodes(card).filter(node => node.type === 'dt').map(node => node.props.children), ['Customer', 'Balance', 'Action'])
  assert.ok(nodes(card).some(node => node.type === 'dd' && node.props.children === 'Sample customer'))
  assert.ok(nodes(card).some(node => node.type === 'dd' && node.props.children === '75000'))
  assert.equal(nodes(card).find(node => node.type === 'a').props.href, '/loan?search=MH00AB1234')
  nodes(card).find(node => node.type === 'button').props.onClick()
  assert.equal(clicks, 1)
  assert.ok(nodes(tree).some(node => node.type === 'tbody' && node.props.children[0] === row))
})

test('empty mobile workspaces show the same specific message as desktop', () => {
  const tree = loadWorkTable()({ headers: ['Name'], children: [], empty: 'No birthdays today' })
  assert.equal(nodes(tree).filter(node => ['p', 'td'].includes(node.type) && node.props.children === 'No birthdays today').length, 2)
  assert.equal(nodes(tree).filter(node => node.type === 'dl').length, 0)
})

test('source chart exposes counts and selection in place with keyboard accessible controls', () => {
  const { LeadSourceChart } = load('src/features/dashboard/LeadSourceChart.tsx', imports)
  const data = [{ name: 'CarDekho', sourceCode: 'CARDEKHO', value: 2861 }]
  const selected = []
  const tree = LeadSourceChart({ data, totalLeads: 53505, selectedSourceCode: 'CARDEKHO', onSelectSource: source => selected.push(source) })
  const button = nodes(tree).find(node => node.type === 'button')
  assert.equal(button.props['aria-pressed'], true)
  assert.match(button.props['aria-label'], /CarDekho: 2,861 leads/)
  assert.ok(nodes(tree).some(node => node.type === 'strong' && node.props.children === '2,861'))
  assert.ok(nodes(tree).some(node => node.props?.role === 'status'))
  button.props.onClick()
  assert.equal(selected[0], data[0])
})

test('location chart has explicit height and period buttons respond once', () => {
  const updates = []
  const { LeadLocationChart } = load('src/features/dashboard/LeadLocationChart.tsx', {
    ...imports, react: { useMemo: fn => fn(), useState: value => [value, next => updates.push(next)] },
    'next/navigation': { useRouter: () => ({ push() {} }) },
  })
  const tree = LeadLocationChart({ breakdowns: { month: [{ name: 'Mumbai', value: 1 }], quarter: [], year: [] } })
  assert.equal(nodes(tree).find(node => node.props?.style?.height).props.style.height, 180)
  const quarter = nodes(tree).find(node => node.type === 'button' && node.props.children === 'Quarter')
  quarter.props.onClick()
  assert.deepEqual(updates, ['quarter'])
})

test('workspace controls have a separate grid row, and every tab selects on one click', () => {
  const updates = []
  let stateIndex = 0
  const fakeReact = {
    ...react, useEffect() {}, useMemo: fn => fn(), useRef: () => ({ current: null }),
    useState: value => { const index = stateIndex++; return [value, next => updates.push({ index, next })] },
  }
  const icons = Object.fromEntries(['AlertTriangle', 'Car', 'ChevronRight', 'Clock', 'ExternalLink', 'FileText', 'Search', 'Shield', 'Sun', 'Users'].map(name => [name, name]))
  const { DashboardCommandCenterClient } = load('src/features/dashboard/DashboardCommandCenterClient.tsx', {
    'react/jsx-runtime': jsxRuntime, react: fakeReact, 'lucide-react': icons,
    '@/components/ui': { Badge: 'Badge', Modal: 'Modal' },
    './LeadSourceChart': { LeadSourceChart: 'LeadSourceChart' }, './LeadLocationChart': { LeadLocationChart: 'LeadLocationChart' },
  })
  const tree = DashboardCommandCenterClient({
    firstName: 'Test', todayLabel: 'Today', permissions: { canInventory: true, canInquiry: true, canFollowup: true, canInsurance: true, canLoan: true, canRto: true },
    stats: { totalInquiries: 0 }, todayStats: {}, leadSources: [], leadRegionBreakdowns: { all: {}, bySource: {} },
    followups: [], leadDetails: [], reminders: [], pendingPolicies: [], expiryRenewalPolicies: [], assignedExpiryRenewalPolicies: [], rtoPending: [], pendingPayments: [],
  })
  const all = nodes(tree)
  const tablist = all.find(node => node.props?.role === 'tablist')
  const toolbar = all.find(node => nodes(node.props?.children).includes(tablist) && node !== tree && node.props?.className?.includes('border-b'))
  assert.ok(toolbar.props.className.includes('grid'))
  assert.ok(!tablist.props.className.includes('flex-1'))
  const tabs = all.filter(node => node.props?.role === 'tab')
  assert.equal(tabs.length, 9)
  for (const tab of tabs) {
    updates.length = 0
    tab.props.onClick()
    assert.equal(updates.filter(update => update.index === 0).length, 1)
    assert.equal(updates[0].next, tab.key)
  }
  assert.ok(!tree.props.className.includes('overflow-hidden'))
})
