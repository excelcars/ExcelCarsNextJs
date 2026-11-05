import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { Prisma } from '@prisma/client'
import * as messageText from '../src/lib/whatsapp/messageText.mjs'

function load(path, imports) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const compiledModule = { exports: {} }
  runInNewContext(source, { module: compiledModule, exports: compiledModule.exports, URL, Date, process: { env: {} }, require(name) {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`)
    return imports[name]
  } })
  return compiledModule.exports
}

const catalog = load('src/lib/access/accessCatalog.ts', {})
const outbound = load('src/lib/whatsapp/outboundHistory.ts', { '@prisma/client': { Prisma } })
function harness({ authorized = true, fail = false, legacy = false, rows = [] } = {}) {
  const queries = []
  const summary = { total: 3, phones: 2, submitted: 2, delivered: 1, failed: 1 }
  const route = load('app/api/messages/logs/route.ts', {
    'next/server': { NextResponse: Response }, '@prisma/client': { Prisma },
    '@/lib/access/accessCatalog': catalog,
    '@/lib/access/accessControl': { getAuthorizedActorForFunctions: async functions => {
      assert.deepEqual([...functions], [catalog.WHATSAPP_LOGS_FUNCTION])
      return authorized ? { userId: 1 } : null
    } },
    '@/lib/whatsapp/outboundHistory': outbound,
    '@/lib/whatsapp/messageText.mjs': messageText,
    '@/lib/db/prisma': { prisma: {
      $queryRaw(query) {
        if (!query.text) return Promise.resolve([{ sent: !legacy, replies: !legacy, statuses: !legacy }])
        queries.push(query)
        return Promise.resolve(query.text.includes('LIMIT 50') ? rows : [summary])
      },
      async $transaction(promises, options) {
        assert.equal(options.isolationLevel, 'RepeatableRead')
        if (fail) throw new Error('Private connection details')
        return Promise.all(promises)
      },
    } },
  })
  return { queries, get: query => route.GET(new Request(`https://example.test/api/messages/logs${query || ''}`)) }
}

test('sent logs require authorization before querying the database', async () => {
  const h = harness({ authorized: false })
  assert.equal((await h.get()).status, 403)
  assert.equal(h.queries.length, 0)
})

test('invalid pagination and calendar dates are rejected without queries', async () => {
  const h = harness()
  for (const query of ['?page=-1', '?page=1.5', '?page=100001', '?from=2026-02-30', '?to=invalid', '?from=2026-11-05&to=2026-11-04']) {
    assert.equal((await h.get(query)).status, 400, query)
  }
  assert.equal(h.queries.length, 0)
})

test('date filters include the whole IST day and pagination is parameterized', async () => {
  const h = harness()
  const response = await h.get('?from=2026-11-04&to=2026-11-04&page=2')
  assert.equal(response.status, 200)
  const dates = h.queries[0].values.filter(value => value instanceof Date).map(value => value.toISOString())
  assert.deepEqual(dates, ['2026-11-03T18:30:00.000Z', '2026-11-04T18:30:00.000Z'])
  assert.equal(h.queries[0].values.at(-1), 50)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual((await response.json()).summary, { total: 3, phones: 2, submitted: 2, delivered: 1, failed: 1 })
})

test('search uses bound parameters and both queries share the same filters', async () => {
  const h = harness()
  const search = "' OR 1=1 --"
  await h.get(`?search=${encodeURIComponent(search)}`)
  assert.equal(h.queries.length, 2)
  for (const query of h.queries) {
    assert.equal(query.text.includes(search), false)
    assert.ok(query.values.includes(`%${search}%`))
    assert.match(query.text, /FROM whatsapp_inbox_replies/)
    assert.match(query.text, /NOT EXISTS \(SELECT 1 FROM whatsapp_sent_messages/)
    assert.match(query.text, /WHEN 'read' THEN 0 WHEN 'delivered' THEN 1/)
  }
  assert.match(h.queries[0].text, /COUNT\(\*\) OVER \(PARTITION BY sender_mobile\)/)
  assert.match(h.queries[0].text, /LEFT JOIN customer c ON c.cust_id = i.customer_id/)
})

test('older enquiry logs display the approved message personalized with the customer name', () => {
  const body = messageText.resolveLoggedMessage({ key: 'noinventory-1', templateName: 'enquiry_noinventory', body: 'No-inventory enquiry template', recipientName: 'Asha' })
  assert.equal(body, 'Hi Asha, thank you for your enquiry with Excel Cars.\n\nWe have received your request and our team will get in touch with you shortly.\n\nFor any immediate assistance, you can contact us at 82923002.\n\nWe’ll be happy to assist you.')
})

test('saved message snapshots and text replies stay unchanged; unavailable text is not invented', () => {
  const row = { key: 'sent-1', templateName: 'enquiry_noinventory', body: 'Exact original sent text', recipientName: 'Asha' }
  assert.equal(messageText.resolveLoggedMessage(row), row.body)
  assert.equal(messageText.resolveLoggedMessage({ ...row, key: 'reply-1', body: 'Hello', templateName: null }), 'Hello')
  assert.equal(messageText.resolveLoggedMessage({ ...row, key: 'reply-1', body: 'Customer: please call me', templateName: null }), 'Customer: please call me')
  assert.equal(messageText.resolveLoggedMessage({ ...row, key: 'noinventory-1', recipientName: null, body: 'No-inventory enquiry template' }), null)
  assert.equal(messageText.resolveLoggedMessage({ ...row, templateName: 'enquiry_temp', body: 'Customer: Asha' }), null)
  assert.match(messageText.renderNoInventoryMessage('Asha $&'), /^Hi Asha \$&,/)
})

test('log API returns the customer name and personalized message instead of template metadata', async () => {
  const response = await harness({ legacy: true, rows: [{ key: 'noinventory-1', templateName: 'enquiry_noinventory', body: 'No-inventory enquiry template', recipientName: 'Asha' }] }).get()
  const { rows } = await response.json()
  assert.equal(rows[0].recipientName, 'Asha')
  assert.match(rows[0].body, /^Hi Asha, thank you for your enquiry with Excel Cars\./)
  assert.equal(rows[0].body.includes('{{1}}'), false)
})

test('database errors return a safe, retryable message', async () => {
  const response = await harness({ fail: true }).get()
  assert.equal(response.status, 500)
  assert.equal((await response.json()).error.includes('Private'), false)
})

test('older databases use available legacy logs without querying missing WhatsApp tables', async () => {
  const h = harness({ legacy: true })
  const response = await h.get()
  assert.equal(response.status, 200)
  assert.match((await response.json()).historyNotice, /Showing available saved logs/)
  for (const query of h.queries) {
    assert.doesNotMatch(query.text, /FROM whatsapp_sent_messages|FROM whatsapp_inbox_replies|FROM whatsapp_message_statuses/)
    assert.match(query.text, /FROM whatsapp_delivery_log/)
  }
})

test('logs require their independent view-only log grant while inbox is disabled', () => {
  const functions = catalog.getAllowedFunctionNamesForRoute('/messages/logs')
  assert.equal(functions.includes('WhatsApp_Inbox'), false)
  assert.ok(functions.includes('WhatsApp_Message_Logs'))
  assert.equal(catalog.getAllowedFunctionNamesForRoute('/messages').includes('WhatsApp_Message_Logs'), false)
})
