import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { Prisma } from '@prisma/client'

function load(path, imports) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const compiledModule = { exports: {} }
  runInNewContext(source, { module: compiledModule, exports: compiledModule.exports, console, process: { env: { NODE_ENV: 'test' } }, require(name) {
    assert.ok(name in imports, `Unexpected import in ${path}: ${name}`)
    return imports[name]
  } })
  return compiledModule.exports
}
const plain = value => JSON.parse(JSON.stringify(value))
const ownershipImports = prisma => ({
  '@/lib/db/prisma': { prisma },
  '@/lib/access/accessControl': { getAuthorizedUserIdForRoute: async () => 7 },
})
const ownership = load('src/lib/access/inquiryOwnership.ts', ownershipImports({}))
const appointments = load('src/lib/inquiryAppointments.ts', {})

for (const [roleId, roleName, restricted] of [[4, 'InquiryAssistant', true], [1, 'SystemAdmin', false], [2, 'SuperAdmin', false]]) {
  test(`${roleName}: enquiry access follows saved assignment after reassignment`, async () => {
    let where
    const policy = load('src/lib/access/inquiryOwnership.ts', ownershipImports({
      userTable: { findUnique: async () => ({ roleId, roleName }) },
      inquiry: { findFirst: async args => { where = args.where; return null } },
    }))
    const scope = await policy.getInquiryOwnershipScopeForRoute('/inquiry')
    assert.equal(scope.restricted, restricted)
    assert.equal(scope.restrictToUserId, restricted ? 7 : null)
    assert.equal(await policy.canAccessInquiryByOwnership(10, '/inquiry'), !restricted)
    if (restricted) assert.deepEqual(plain(where), { AND: [{ inquiryId: 10 }, { assignedTo: 7 }] })
  })
}

function inquiryQueries(prisma) {
  return load('src/features/inquiry/queries.ts', {
    '@/lib/db/prisma': { prisma }, '@/lib/access/inquiryOwnership': ownership,
    './sourceMaster.server': {}, './locationMaster.server': {},
  })
}
const inquiryFilters = {
  search: '', status: 'All', classification: 'All', source: 'All', locationId: '', location: '',
  subStatus: 'All', followUpDate: '', inquiryDate: '', visitedDate: '', budgetMin: '', budgetMax: '',
  makeId: '', modelId: '', variantId: '', quickFilter: 'all', page: 1,
}
const followupFilters = {
  search: '', classification: 'All', contactOutcome: '', customerName: '', inquiryDateFrom: '', inquiryDateTo: '',
  followUpDateFrom: '', followUpDateTo: '', visitedDateFrom: '', visitedDateTo: '', budgetFrom: '', budgetTo: '',
  status: 'FollowUp', subStatus: '', website: '', customerMobile: '', userId: '', makeId: '', modelId: '', variantId: '', page: 1,
}

test('follow-up defaults to my assignments, preserves explicit admin scopes, and enforces assistant restrictions', async () => {
  const { resolveFollowupUserId } = load('src/features/followup/userScope.ts', {})
  const admin = { userId: 7, restrictToUserId: null }
  const assistant = { userId: 7, restrictToUserId: 7 }
  assert.equal(resolveFollowupUserId(undefined, admin), '7')
  assert.equal(resolveFollowupUserId('', admin), '7')
  assert.equal(resolveFollowupUserId('all', admin), 'all')
  assert.equal(resolveFollowupUserId('8', admin), '8')
  assert.equal(resolveFollowupUserId(undefined, admin, '7'), 'all')
  for (const requested of [undefined, 'all', '8']) assert.equal(resolveFollowupUserId(requested, assistant, '7'), '7')

  const api = load('src/features/followup/queries.ts', {
    '@/lib/db/prisma': { prisma: { inquiry: {
      findMany: async args => { calls.push(args.where); return [] }, count: async () => 0,
    } } },
    '@/lib/access/inquiryOwnership': ownership, '@/lib/inquiryAppointments': appointments,
  })
  const calls = []
  for (const userId of ['7', '8', 'all']) {
    for (const classification of ['All', 'Hot', 'Warm', 'Cold']) {
      const filters = { ...followupFilters, userId, classification }
      await api.listFollowupQueue(filters)
      await api.listFollowupsForExport(filters)
      const [listed, exported] = calls.splice(0)
      assert.deepEqual(plain(listed), plain(exported))
      assert.equal(listed.classification, classification === 'All' ? undefined : classification)
      if (userId === 'all') assert.equal(listed.AND, undefined)
      else assert.deepEqual(plain(listed.AND), [{ assignedTo: Number(userId) }])
    }
  }
})

test('new/unattended queue carries old untouched leads forward and shares list, count and export scopes', async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysAgo = days => { const date = new Date(today); date.setDate(date.getDate() - days); return date }
  const records = [
    { inquiryId: 1, dateOfInquiry: today, status: 'Open', assignedTo: 7, followupInquiry: [] },
    { inquiryId: 2, dateOfInquiry: daysAgo(1), status: 'Open', assignedTo: 7, followupInquiry: [] },
    { inquiryId: 3, dateOfInquiry: daysAgo(10), status: 'Open', assignedTo: 8, followupInquiry: [] },
    { inquiryId: 4, dateOfInquiry: daysAgo(30), status: 'Open', assignedTo: null, followupInquiry: [] },
    { inquiryId: 5, dateOfInquiry: daysAgo(1), status: 'FollowUp', assignedTo: 7, followupInquiry: [{}] },
    { inquiryId: 6, dateOfInquiry: daysAgo(10), status: 'Open', assignedTo: 7, followupInquiry: [{}] },
    ...['Closed', 'Booked', 'Converted'].map((status, i) => ({ inquiryId: 7 + i, dateOfInquiry: daysAgo(10), status, assignedTo: 7, followupInquiry: [] })),
    { inquiryId: 10, dateOfInquiry: today, status: 'Closed', assignedTo: 7, followupInquiry: [{}] },
    { inquiryId: 11, dateOfInquiry: daysAgo(-1), status: 'Open', assignedTo: 7, followupInquiry: [] },
  ]
  function matches(row, where) {
    return Object.entries(where).every(([key, value]) => {
      if (key === 'AND') return value.every(condition => matches(row, condition))
      if (key === 'OR') return value.some(condition => matches(row, condition))
      if (key === 'followupInquiry') return row.followupInquiry.length === 0
      if (key === 'dateOfInquiry') return (!value.gte || row[key] >= value.gte) && (!value.lt || row[key] < value.lt)
      if (value && typeof value === 'object' && 'not' in value) return row[key] != null && row[key] !== value.not
      return row[key] === value
    })
  }
  let listWhere, countWhere, orderBy
  const api = inquiryQueries({ inquiry: {
    findMany: async args => {
      listWhere = args.where; orderBy = args.orderBy
      return records.filter(row => matches(row, args.where))
    },
    count: async args => { countWhere = args.where; return records.filter(row => matches(row, args.where)).length },
  } })
  for (const [scope, expected] of [
    [{}, [1, 2, 3, 4, 10]], [{ userId: '7' }, [1, 2, 10]],
    [{ excludeUserId: '7' }, [3, 4]], [{ restrictToUserId: 7, userId: '8', excludeUserId: '7' }, [1, 2, 10]],
  ]) {
    const filters = { ...inquiryFilters, quickFilter: 'newUnattended', ...scope }
    const result = await api.listInquiries(filters)
    assert.deepEqual(Array.from(result.rows, row => row.inquiryId), expected)
    assert.equal(result.total, expected.length)
    assert.deepEqual(plain(listWhere), plain(countWhere))
    const exported = await api.listInquiriesForExport(filters)
    assert.deepEqual(Array.from(exported, row => row.inquiryId), expected)
    assert.deepEqual(plain(orderBy), [{ dateOfInquiry: { sort: 'asc', nulls: 'last' } }, { inquiryId: 'asc' }])
  }
})

test('new/unattended dashboard totals and links include old Open leads without follow-up history', async () => {
  let query
  const api = load('src/features/dashboard/queries.ts', {
    '@/lib/db/prisma': { prisma: { $queryRaw: async value => { query = value; return [{ fresh: 5, own_fresh: 3 }] } } },
    '@prisma/client': { Prisma }, '@/lib/inquiryAppointments': appointments,
  })
  const rows = await api.getLegacyLeadDetails({ userId: 7, roleId: 1 })
  const row = rows.find(row => row.label === 'New / Unattended Lead')
  assert.equal(row.total, 5)
  assert.equal(row.own, 3)
  assert.equal(row.other, 2)
  for (const href of [row.href, row.ownHref, row.otherHref]) {
    const params = new URL(href, 'https://example.test').searchParams
    assert.equal(params.get('quickFilter'), 'newUnattended')
    assert.equal(params.has('inquiryDate'), false)
  }
  assert.equal(new URL(row.ownHref, 'https://example.test').searchParams.get('userId'), '7')
  assert.equal(new URL(row.otherHref, 'https://example.test').searchParams.get('excludeUserId'), '7')
  for (const clause of query.sql.split('\n').filter(line => /AS (?:own_)?fresh,/.test(line))) {
    assert.match(clause, /status = 'Open' AND date_of_inquiry < \?/)
    assert.match(clause, /NOT EXISTS \(SELECT 1 FROM followup_inquiry f WHERE f.fk_inquiry_id = inquiry.inquiry_id\)/)
  }
})

for (const kind of ['inquiry', 'followup']) {
  test(`${kind}: list and export use identical ownership filters and cannot override assistant scope`, async () => {
    const queries = []
    const prisma = { inquiry: { findMany: async args => { queries.push(args); return [] }, count: async () => 0 } }
    const api = kind === 'inquiry' ? inquiryQueries(prisma) : load('src/features/followup/queries.ts', {
      '@/lib/db/prisma': { prisma }, '@/lib/access/inquiryOwnership': ownership, '@/lib/inquiryAppointments': appointments,
    })
    const list = kind === 'inquiry' ? api.listInquiries : api.listFollowupQueue
    const exportRows = kind === 'inquiry' ? api.listInquiriesForExport : api.listFollowupsForExport
    const base = kind === 'inquiry' ? inquiryFilters : followupFilters
    for (const filters of [{ userId: '8' }, { excludeUserId: '7' }, { restrictToUserId: 7, userId: '8', excludeUserId: '7' }]) {
      await list({ ...base, ...filters })
      await exportRows({ ...base, ...filters })
      const [rows, exported] = queries.splice(0)
      assert.deepEqual(plain(rows.where), plain(exported.where))
      const expected = filters.restrictToUserId ? { assignedTo: 7 } : filters.userId ? { assignedTo: 8 }
        : { OR: [{ assignedTo: null }, { assignedTo: { not: 7 } }] }
      assert.deepEqual(plain(rows.where.AND), [expected])
      assert.ok(rows.select.assignedToUser.select.employee)
    }
  })
}

test('dropdown includes active users of all roles without requiring employee links', async () => {
  let args
  const rows = [{ userId: 7, empId: null, userName: 'assistant', displayName: null, employee: null }]
  const api = inquiryQueries({ userTable: { findMany: async query => { args = query; return rows } } })
  assert.equal(await api.getInquiryAssistants(), rows)
  assert.deepEqual(plain(args.where), { status: 'Active' })
  assert.ok(args.select.userId && args.select.employee.select.empFirstName)
})

test('due notifications exclude enquiries created by the user but assigned elsewhere and archive stale tasks', async () => {
  let where, archived
  const db = {
    inquiry: { findMany: async args => { where = args.where; return [] } },
    userNotification: { updateMany: async args => { archived = args.where } },
  }
  const api = load('src/features/notifications/service.ts', { '@/lib/db/prisma': { prisma: db } })
  await api.syncFollowupNotificationsForUser(7, db)
  assert.equal(where.assignedTo, 7)
  assert.equal(where.OR, undefined)
  assert.equal(archived.recipientUserId, 7)
  assert.deepEqual(plain(archived.entityId), { notIn: [] })
})

test('today report enforces the same assignment restriction as the follow-up queue', async () => {
  let where
  const contract = load('src/features/reports/today/queryContract.ts', {})
  const dates = load('src/features/reports/today/date.ts', {})
  const api = load('src/features/reports/today/queries.ts', {
    '@/lib/db/prisma': { prisma: { followupInquiry: { findMany: async args => { where = args.where; return [] } } } },
    '@/lib/access/inquiryOwnership': ownership, '@/lib/listFormatters': {}, './date': dates, './queryContract': contract,
  })
  await api.listTodayFollowups({ fromDate: '2026-11-18', toDate: '2026-11-18', userId: 8, restrictToUserId: 7 })
  assert.deepEqual(plain(where.inquiry), { assignedTo: 7 })
})

for (const restrictToUserId of [null, 7]) {
  test(`dashboard: ${restrictToUserId ? 'assistant' : 'admin'} scopes counts, followups, sources and regions consistently`, async () => {
    const calls = []
    const prisma = {
      inquiry: {
        count: async args => { calls.push(args); return 0 },
        findMany: async args => { calls.push(args); return [] },
      },
      inquirySourceMaster: { findMany: async args => { calls.push(args); return [] } },
    }
    const api = load('src/features/dashboard/queries.ts', {
      '@/lib/db/prisma': { prisma }, '@prisma/client': { Prisma }, '@/lib/inquiryAppointments': appointments,
    })
    await api.getDashboardStats({ restrictToUserId, includeInventory: false, includeLoan: false, includeInsurance: false, includeRto: false })
    await api.getPendingFollowups(null, restrictToUserId)
    await api.getLeadSourceBreakdown(restrictToUserId)
    await api.getLeadRegionBreakdowns(restrictToUserId)
    for (const call of calls) {
      const scope = call.where.inquiries?.some ?? call.where
      assert.equal(scope.assignedTo, restrictToUserId ?? undefined)
      if (call.select?._count) assert.deepEqual(plain(call.select._count.select.inquiries.where), restrictToUserId ? { assignedTo: 7 } : {})
    }
  })
}

test('legacy dashboard aggregate counts assignees, restricts assistant SQL, and provides other-record links', async () => {
  let query
  const api = load('src/features/dashboard/queries.ts', {
    '@/lib/db/prisma': { prisma: { $queryRaw: async sql => { query = sql; return [{ all: 3, own_all: 1 }] } } },
    '@prisma/client': { Prisma }, '@/lib/inquiryAppointments': appointments,
  })
  const admin = await api.getLegacyLeadDetails({ userId: 7, roleId: 2 })
  assert.equal(admin[0].other, 2)
  assert.match(admin[0].otherHref, /excludeUserId=7/)
  assert.doesNotMatch(query.sql, /created_by/)
  const own = await api.getLegacyLeadDetails({ userId: 7, roleId: 4 })
  assert.equal(own[0].total, 1)
  assert.equal(own[0].other, 0)
  assert.match(query.sql, /FROM inquiry\s+WHERE assigned_to = \?/)
})

test('creation persists creator assignment; reassignment and clearing survive subsequent reads', async () => {
  let row, allowed = true, owned = true
  const revalidated = []
  const db = {
    inquirySourceMaster: { findUnique: async () => ({ sourceId: 1, code: 'WalkIn', displayName: 'Walk In', isActive: true }) },
    customer: { findUnique: async () => ({ custId: 1, custName: 'Customer', custMobile: '9876543210', custEmail: '' }) },
    $queryRaw: async () => [{ max_inquiry_number: 5 }],
    userTable: { findUnique: async ({ where }) => ({ userId: where.userId, status: 'Active', roleName: 'InquiryAssistant' }) },
    inquiry: {
      create: async ({ data }) => { row = { inquiryId: 10, inquiryNo: data.inquiryNo, assignedTo: data.assignedToUser.connect.userId, createdBy: data.createdByUser.connect.userId }; return row },
      findUnique: async () => row,
      update: async ({ data }) => { row.assignedTo = data.assignedToUser.connect?.userId ?? null; return row },
    },
    $transaction: async callback => callback(db),
  }
  const imports = {
    '@/lib/db/prisma': { prisma: db }, '@prisma/client': { Prisma },
    'next/cache': { revalidatePath: path => revalidated.push(path) },
    '@/lib/access/accessControl': { getAuthorizedUserIdForRoute: async () => allowed ? 7 : null },
    '@/lib/access/inquiryOwnership': { canAccessInquiryByOwnership: async () => owned },
    '@/lib/inquiryFollowupValidation': { validateInquiryFormInput: () => ({ error: null }), requiresInquiryFollowupDate: () => false },
    './sourceMaster.server': { ensureInquirySourceMasterSeed: async () => {} },
    './eventLog': { logInquiryEvent: async () => {} },
    '@/features/notifications/service': { createUserNotification: async () => {}, archiveFollowupNotifications: async () => {} },
  }
  for (const name of [
    '@/lib/whatsapp/sendingPolicy.mjs', '../../../auth', '@/lib/email/sendMail', '@/lib/email/templates',
    '@/lib/vehicleEmailLinks', '@/lib/whatsapp/meta', './workflow', './locationMaster.server', './partnerVehicleMapping.server',
  ]) imports[name] = {}
  const api = load('src/features/inquiry/actions.ts', imports)
  const result = await api.createInquiry({
    inquiryNo: '', dateOfInquiry: '2026-11-18', sourceCode: 'WalkIn', sourceDetail: '', locationId: null, location: '',
    customerId: 1, status: 'Open', classification: 'Warm', subStatus: '', remark: '', followUpDate: '',
    inquiryCars: [], visitedDateOfCustomer: '', budgetOfCustomer: null,
  })
  assert.equal(result.success, true, result.error)
  assert.equal((await db.inquiry.findUnique()).assignedTo, 7)
  assert.equal(row.createdBy, 7)
  assert.ok(revalidated.includes('/inquiry') && revalidated.includes('/dashboard'))
  assert.equal((await api.assignInquiry({ inquiryId: 10, assignedToUserId: 8 })).success, true)
  assert.equal((await db.inquiry.findUnique()).assignedTo, 8)
  owned = false
  assert.equal((await api.assignInquiry({ inquiryId: 10, assignedToUserId: 9 })).success, false)
  assert.equal(row.assignedTo, 8)
  owned = true
  assert.equal((await api.assignInquiry({ inquiryId: 10, assignedToUserId: null })).success, true)
  assert.equal((await db.inquiry.findUnique()).assignedTo, null)
  allowed = false
  assert.equal((await api.assignInquiry({ inquiryId: 10, assignedToUserId: 7 })).success, false)
})
