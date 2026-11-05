import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { Prisma } from '@prisma/client'

function load(path, imports) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  runInNewContext(source, { module, exports: module.exports, URL, Date, process: { env: { WHATSAPP_PHONE_NUMBER_ID: 'business1' } }, require(name) { if (!(name in imports)) throw new Error(`Unexpected import ${name}`); return imports[name] } })
  return module.exports
}

const outbound = load('src/lib/whatsapp/outboundHistory.ts', { '@prisma/client': { Prisma } })

function harness({ authorized = true, entries = [], missing = false, noInbound = false, deliveryEvents = [] } = {}) {
  const queries = []
  const readUpdates = []
  const anchor = { id: 7, phoneNumberId: 'business1', senderMobile: '16315551181', sentAt: new Date() }
  const imports = {
    '@/lib/whatsapp/sendingPolicy.mjs': { WHATSAPP_SENDING_ENABLED: true },
    'next/server': { NextResponse: Response }, '@prisma/client': { Prisma },
    '@/lib/access/accessControl': { getAuthorizedActorForFunctions: async () => authorized ? { userId: 1 } : null },
    '@/lib/access/accessCatalog': { WHATSAPP_INBOX_FUNCTION: 'WhatsApp_Inbox' },
    '@/lib/whatsapp/reply': { canReplyToWhatsApp: () => true, REPLY_WINDOW_MS: 86400000 },
    '@/lib/whatsapp/outboundHistory': outbound,
    '@/lib/db/prisma': { prisma: {
      $queryRaw: async query => { queries.push(query); return query.text.includes('WHERE key =') ? [anchor] : entries },
      whatsAppMessageStatus: { findMany: async () => deliveryEvents },
      whatsAppReceivedMessage: {
        findUnique: async () => missing ? null : anchor,
        findFirst: async () => noInbound ? null : anchor,
        updateMany: async data => { readUpdates.push(data); return { count: 2 } },
      },
    } },
  }
  return { imports, queries, readUpdates,
    chats: load('app/api/messages/conversations/route.ts', imports),
    conversation: load('app/api/messages/[id]/conversation/route.ts', imports),
  }
}
const context = { params: Promise.resolve({ id: '7' }) }

test('conversation list, history and read marking require inbox authorization', async () => {
  const h = harness({ authorized: false })
  const request = new Request('https://example.test/api/messages/conversations')
  assert.equal((await h.chats.GET(request)).status, 403)
  assert.equal((await h.conversation.GET(request, context)).status, 403)
  assert.equal((await h.conversation.PATCH(request, context)).status, 403)
  assert.equal(h.queries.length, 0)
  assert.equal(h.readUpdates.length, 0)
})

test('chat search is parameterized and grouping includes both customer and business number', async () => {
  const h = harness()
  const search = "' OR 1=1 --"
  const response = await h.chats.GET(new Request(`https://example.test?search=${encodeURIComponent(search)}&unread=1&page=2`))
  assert.equal(response.status, 200)
  assert.equal(h.queries.length, 2)
  const query = h.queries[0]
  assert.equal(query.text.includes(search), false)
  assert.ok(query.values.includes(`%${search}%`))
  assert.match(query.text, /GROUP BY phone_number_id, sender_mobile/)
  assert.match(query.text, /CROSS JOIN LATERAL/)
  assert.equal(query.values.at(-1), 50)
})

test('invalid pages, IDs and history cursors are rejected before querying', async () => {
  const h = harness()
  assert.equal((await h.chats.GET(new Request('https://example.test?page=1.5'))).status, 400)
  assert.equal((await h.conversation.GET(new Request('https://example.test?before=invalid'), context)).status, 400)
  assert.equal((await h.conversation.PATCH(new Request('https://example.test'), { params: Promise.resolve({ id: '-1' }) })).status, 400)
  assert.equal(h.queries.length, 0)
  assert.equal(h.readUpdates.length, 0)
})

test('history combines directions and returns chronological pages with a stable next cursor', async () => {
  const entries = Array.from({ length: 51 }, (_, index) => ({ key: `in-${100 - index}`, messageId: 7, body: `Message ${index}`, sentAt: new Date(1793664000000 - index * 1000), direction: index % 2 ? 'incoming' : 'outgoing', status: 'received' }))
  const h = harness({ entries })
  const response = await h.conversation.GET(new Request('https://example.test'), context)
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.equal(result.entries.length, 50)
  assert.equal(result.entries[0].key, 'in-51')
  assert.equal(result.entries.at(-1).key, 'in-100')
  assert.equal(result.nextCursor.beforeKey, 'in-51')
  assert.equal(result.canReply, true)
  assert.match(h.queries[0].text, /UNION ALL/)
  assert.ok(h.queries[0].values.includes('business1'))
  assert.ok(h.queries[0].values.includes('16315551181'))
})

test('older history uses a timestamp/key cursor and parameterized contact filters', async () => {
  const h = harness()
  const response = await h.conversation.GET(new Request('https://example.test?before=2026-11-03T00%3A00%3A00Z&beforeKey=in-7'), context)
  assert.equal(response.status, 200)
  assert.match(h.queries[0].text, /\("sentAt", key\) </)
  assert.ok(h.queries[0].values.includes('in-7'))
})

test('opening a chat marks only that contact and business through the loaded ID', async () => {
  const h = harness()
  const response = await h.conversation.PATCH(new Request('https://example.test'), context)
  assert.equal(response.status, 200)
  const where = h.readUpdates[0].where
  assert.equal(where.phoneNumberId, 'business1')
  assert.equal(where.senderMobile, '16315551181')
  assert.equal(where.id.lte, 7)
  assert.equal(where.readAt, null)
  assert.equal((await response.json()).markedRead, 2)
})

test('missing conversation anchors return 404 without history queries or read mutations', async () => {
  const h = harness({ missing: true })
  assert.equal((await h.conversation.GET(new Request('https://example.test'), context)).status, 404)
  assert.equal((await h.conversation.PATCH(new Request('https://example.test'), context)).status, 404)
  assert.equal(h.queries.length, 0)
  assert.equal(h.readUpdates.length, 0)
})

test('template-only contacts load without an incoming anchor and cannot open a text reply window', async () => {
  const entry = { key: 'sent-1', messageId: null, body: 'Vehicle: BMW', sentAt: new Date(), direction: 'outgoing', status: 'submitted', templateName: 'enquiry_temp', providerMessageId: 'wamid.sent' }
  const h = harness({ noInbound: true, entries: [entry] })
  const response = await h.conversation.GET(new Request('https://example.test'), { params: Promise.resolve({ id: 'sent-1' }) })
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.equal(result.latestMessageId, null)
  assert.equal(result.canReply, false)
  assert.equal(result.entries[0].templateName, 'enquiry_temp')
  assert.equal(h.readUpdates.length, 0)
  assert.ok(h.queries[0].values.includes('sent-1'))
})

test('template callbacks update bubble status while preserving saved template details', async () => {
  const h = harness({ entries: [{ key: 'vehicle-12', body: 'Vehicle: BMW', templateName: 'enquiry_temp', buttonUrlSuffix: 'vehicle/demo?t=test', sentAt: new Date(), direction: 'outgoing', status: 'submitted', providerMessageId: 'wamid.sent' }],
    deliveryEvents: [{ providerMessageId: 'wamid.sent', status: 'failed', errorMessage: '131049: Not delivered' }] })
  const result = await (await h.conversation.GET(new Request('https://example.test'), context)).json()
  assert.equal(result.entries[0].status, 'failed')
  assert.equal(result.entries[0].errorMessage, '131049: Not delivered')
  assert.equal(result.entries[0].buttonUrlSuffix, 'vehicle/demo?t=test')
})

test('outbound history excludes duplicate legacy copies using Meta message IDs', () => {
  const query = outbound.outboundHistorySql()
  assert.match(query.text, /FROM whatsapp_sent_messages/)
  assert.match(query.text, /FROM whatsapp_delivery_log/)
  assert.match(query.text, /FROM inquiry_no_inventory_notification_log/)
  assert.match(query.text, /FROM insurance_reminder_attempt/)
  assert.equal((query.text.match(/NOT EXISTS/g) || []).length, 3)
  assert.ok(query.values.includes('business1'))
})
