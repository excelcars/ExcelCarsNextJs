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
  let calls = 0
  const handlers = load('app/api/webhooks/whatsapp/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/whatsapp/webhook': parser,
    '@/lib/db/prisma': { prisma: { whatsAppReceivedMessage: { async createMany({ data, skipDuplicates }) {
      calls++
      assert.equal(skipDuplicates, true)
      if (fails) throw new Error('DB unavailable')
      for (const message of data) if (!saved.has(message.providerMessageId)) saved.set(message.providerMessageId, message)
    } } } },
  }, { process: { env: configured ? env : {} } })
  function request(body = JSON.stringify(event), signature) {
    return new Request('https://example.test/api/webhooks/whatsapp', { method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-Hub-Signature-256': signature ?? `sha256=${createHmac('sha256', env.WHATSAPP_APP_SECRET).update(body).digest('hex')}`,
    }, body })
  }
  return { ...handlers, saved, request, calls: () => calls }
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
  assert.equal((await h.POST(h.request())).status, 200)
  assert.equal((await h.POST(h.request())).status, 200)
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
  assert.equal((await h.POST(h.request(JSON.stringify(status)))).status, 200)
  assert.equal(h.calls(), 0)
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
