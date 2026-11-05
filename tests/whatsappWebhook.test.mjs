import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { createHmac } from 'node:crypto'
import * as crypto from 'node:crypto'

function load(path, imports, extra = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  runInNewContext(source, { module, exports: module.exports, Buffer, URL, Response, console: { error() {} },
    require(name) { if (!(name in imports)) throw new Error(`Unexpected import ${name}`); return imports[name] }, ...extra })
  return module.exports
}
const parser = load('src/lib/whatsapp/webhook.ts', { 'node:crypto': crypto })
const env = { WHATSAPP_APP_SECRET: 'app-secret', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify' }
const event = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
  metadata: { phone_number_id: '123' }, messages: [{ id: 'wamid.1', from: '919876543210', timestamp: '1793664000', type: 'text', text: { body: 'Hello' } }],
} }] }] }
function harness({ configured = true, fails = false } = {}) {
  const saved = new Map()
  const savedStatuses = new Map()
  const logs = []
  let calls = 0
  const handlers = load('app/api/webhooks/whatsapp/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/whatsapp/webhook': parser,
    '@/lib/db/prisma': { prisma: { whatsAppReceivedMessage: { async createMany({ data, skipDuplicates }) {
      calls++
      assert.equal(skipDuplicates, true)
      if (fails) throw new Error('DB unavailable')
      const before = saved.size
      for (const message of data) if (!saved.has(message.providerMessageId)) saved.set(message.providerMessageId, message)
      return { count: saved.size - before }
    } }, whatsAppMessageStatus: { async createMany({ data, skipDuplicates }) {
      assert.equal(skipDuplicates, true)
      if (fails) throw new Error('DB unavailable')
      for (const item of data) savedStatuses.set(`${item.providerMessageId}:${item.status}:${item.occurredAt.toISOString()}`, item)
    } } } },
  }, { process: { env: configured ? env : {} }, console: { error() {}, info: (...args) => logs.push(args) } })
  function request(body = JSON.stringify(event), signature) {
    return new Request('https://example.test/api/webhooks/whatsapp', { method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-Hub-Signature-256': signature ?? `sha256=${createHmac('sha256', env.WHATSAPP_APP_SECRET).update(body).digest('hex')}`,
    }, body })
  }
  return { ...handlers, saved, savedStatuses, logs, request, calls: () => calls }
}

test('GET handshake requires configured matching token and returns raw challenge', async () => {
  const h = harness()
  const response = await h.GET(new Request('https://example.test?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=12345'))
  assert.equal(response.status, 200)
  assert.equal(await response.text(), '12345')
  assert.equal((await h.GET(new Request('https://example.test?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=1'))).status, 403)
  assert.equal((await harness({ configured: false }).GET(new Request('https://example.test'))).status, 503)
})

test('POST saves valid events and duplicate retries are idempotent', async () => {
  const h = harness()
  const first = await h.POST(h.request())
  assert.equal(first.status, 200)
  assert.equal((await first.json()).savedMessages, 1)
  const retry = await h.POST(h.request())
  assert.equal(retry.status, 200)
  const summary = await retry.json()
  assert.equal(summary.savedMessages, 0)
  assert.equal(summary.duplicateMessages, 1)
  assert.equal(h.saved.size, 1)
  assert.equal(h.saved.get('wamid.1').body, 'Hello')
})

test('POST rejects unsigned/tampered, invalid, oversized and unconfigured requests without writes', async () => {
  const h = harness()
  assert.equal((await h.POST(h.request('{}', 'sha256=bad'))).status, 401)
  assert.equal((await h.POST(h.request('{'))).status, 400)
  assert.equal((await h.POST(h.request('x'.repeat(1024 * 1024 + 1)))).status, 413)
  assert.equal((await h.POST(new Request('https://example.test', { method: 'POST', body: '{}' }))).status, 415)
  const closed = harness({ configured: false })
  assert.equal((await closed.POST(closed.request())).status, 503)
  assert.equal(h.calls(), 0)
  assert.equal(closed.calls(), 0)
})

test('POST returns retryable failure when persistence fails', async () => {
  const h = harness({ fails: true })
  assert.equal((await h.POST(h.request())).status, 500)
})

test('POST acknowledges status-only notifications without saving inbox rows', async () => {
  const h = harness()
  const status = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, statuses: [{ status: 'delivered' }] } }] }] }
  const response = await h.POST(h.request(JSON.stringify(status)))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).statusUpdates, 1)
  assert.equal(h.calls(), 0)
})

test('POST reports skipped phone IDs without logging personal data or secrets', async () => {
  const h = harness()
  const otherNumber = structuredClone(event)
  otherNumber.entry[0].changes[0].value.metadata.phone_number_id = '999'
  const response = await h.POST(h.request(JSON.stringify(otherNumber)))
  assert.equal(response.status, 200)
  const summary = await response.json()
  assert.equal(summary.incomingMessages, 1)
  assert.equal(summary.skippedPhoneNumberMessages, 1)
  assert.equal(summary.savedMessages, 0)
  assert.equal(h.calls(), 0)
  const logs = JSON.stringify(h.logs)
  for (const sensitive of ['919876543210', 'Hello', env.WHATSAPP_APP_SECRET, 'wamid.1']) assert.equal(logs.includes(sensitive), false)
})

test('POST persists delivery failures and excludes raw error details from logs', async () => {
  const h = harness()
  const payload = structuredClone(event)
  delete payload.entry[0].changes[0].value.messages
  payload.entry[0].changes[0].value.statuses = [{ id: 'wamid.template', status: 'failed', timestamp: '1793664000',
    errors: [{ code: 131049, title: 'Not delivered', error_data: { details: 'Private provider detail' } }] }]
  for (let i = 0; i < 2; i++) {
    const response = await h.POST(h.request(JSON.stringify(payload)))
    assert.equal(response.status, 200)
    const summary = await response.json()
    assert.deepEqual(summary.failureCodes, [131049])
    assert.equal(summary.savedMessages, 0)
  }
  assert.equal(h.saved.size, 0)
  assert.equal(h.savedStatuses.size, 1)
  assert.match([...h.savedStatuses.values()][0].errorMessage, /131049/)
  assert.equal(JSON.stringify(h.logs).includes('Private provider detail'), false)
})

test('POST skips delivery callbacks for another business number', async () => {
  const h = harness()
  const payload = structuredClone(event)
  payload.entry[0].changes[0].value.metadata.phone_number_id = '999'
  payload.entry[0].changes[0].value.statuses = [{ id: 'wamid.other', status: 'delivered', timestamp: '1793664000' }]
  assert.equal((await h.POST(h.request(JSON.stringify(payload)))).status, 200)
  assert.equal(h.savedStatuses.size, 0)
})

test('delivery history matches provider IDs and never regresses delivered to sent or failed', async () => {
  const handler = load('app/api/messages/delivery/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/access/accessControl': { getAuthorizedActorForFunctions: async () => ({ userId: 1 }) },
    '@/lib/access/accessCatalog': { WHATSAPP_INBOX_FUNCTION: 'WhatsApp_Inbox' },
    '@/lib/db/prisma': { prisma: {
      whatsAppDeliveryLog: { findMany: async () => [{ inquiryId: 7, providerMessageId: 'wamid.template', status: 'Submitted', createdAt: new Date(), errorMessage: null }] },
      inquiryNoInventoryNotificationLog: { findMany: async () => [] },
      whatsAppMessageStatus: { findMany: async () => [
        { providerMessageId: 'wamid.other', status: 'read', occurredAt: new Date() },
        { providerMessageId: 'wamid.template', status: 'failed', errorMessage: 'late failure', occurredAt: new Date() },
        { providerMessageId: 'wamid.template', status: 'delivered', errorMessage: null, occurredAt: new Date() },
      ] },
    } },
  })
  const response = await handler.GET()
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.equal(result.deliveries[0].status, 'delivered')
  assert.equal(result.deliveries[0].errorMessage, null)
})

test('inbox APIs deny unauthorized reads and mutations before database access', async () => {
  const handlers = load('app/api/messages/route.ts', {
    'next/server': { NextResponse: Response }, '@prisma/client': {},
    '@/lib/access/accessControl': { getAuthorizedActorForFunctions: async () => null },
    '@/lib/access/accessCatalog': { WHATSAPP_INBOX_FUNCTION: 'WhatsApp_Inbox' },
    '@/lib/db/prisma': { prisma: {} },
  })
  assert.equal((await handlers.GET(new Request('https://example.test/api/messages'))).status, 403)
  assert.equal((await handlers.PATCH(new Request('https://example.test/api/messages', { method: 'PATCH', body: '{"id":1}' }))).status, 403)
})
