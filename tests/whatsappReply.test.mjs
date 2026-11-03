import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function load(path, imports = {}, globals = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  runInNewContext(source, { module, exports: module.exports, Date, URL, Response, AbortController, setTimeout, clearTimeout,
    require(name) { if (!(name in imports)) throw new Error(`Unexpected import ${name}`); return imports[name] }, ...globals })
  return module.exports
}
const policy = load('src/lib/whatsapp/reply.ts')
const requestId = '12345678-1234-4123-8123-123456789012'
const env = { WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_ACCESS_TOKEN: 'test-token' }
const context = { params: Promise.resolve({ id: '7' }) }
const request = (data = { body: 'Hello', requestId }) => new Request('https://example.test/api/messages/7/replies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })

test('reply window accepts recent inbound messages and rejects boundary, stale, future or invalid dates', () => {
  const now = Date.now()
  assert.equal(policy.canReplyToWhatsApp(new Date(now - 1000), now), true)
  for (const value of [now - policy.REPLY_WINDOW_MS, now - policy.REPLY_WINDOW_MS - 1, now + 1, NaN]) assert.equal(policy.canReplyToWhatsApp(new Date(value), now), false)
})

test('provider sends to the original international recipient and quotes the selected inbound message', async () => {
  let call
  const service = load('src/lib/whatsapp/reply.ts', {}, { process: { env }, fetch: async (url, options) => { call = { url, options }; return Response.json({ messages: [{ id: 'wamid.outgoing' }] }) } })
  const result = await service.sendWhatsAppTextReply({ phoneNumberId: '123', to: '16315551181', body: 'Hello', contextMessageId: 'wamid.incoming' })
  assert.equal(result.status, 'accepted')
  assert.equal(result.providerMessageId, 'wamid.outgoing')
  const sent = JSON.parse(call.options.body)
  assert.equal(sent.to, '16315551181')
  assert.equal(sent.context.message_id, 'wamid.incoming')
  assert.equal(sent.type, 'text')
  assert.equal(sent.text.body, 'Hello')
  assert.equal(call.options.headers.Authorization, 'Bearer test-token')
})

test('provider distinguishes rejections from uncertain responses without automatically retrying', async () => {
  for (const scenario of ['reject', 'server', 'network', 'missing id']) {
    let calls = 0
    const service = load('src/lib/whatsapp/reply.ts', {}, { process: { env }, fetch: async () => {
      calls++
      if (scenario === 'network') throw new Error('timeout')
      return Response.json(scenario === 'reject' ? { error: { code: 131047 } } : {}, { status: scenario === 'reject' ? 400 : scenario === 'server' ? 500 : 200 })
    } })
    const result = await service.sendWhatsAppTextReply({ phoneNumberId: '123', to: '16315551181', body: 'Hi', contextMessageId: 'wamid.incoming' })
    assert.equal(result.status, scenario === 'reject' ? 'failed' : 'unknown')
    assert.equal(calls, 1)
  }
})

function harness({ authorized = true, stale = false, mismatch = false, existing = null, collision = false } = {}) {
  const calls = { send: [], create: [], lookup: 0 }
  let row = existing
  const message = { id: 7, phoneNumberId: mismatch ? '999' : '123', senderMobile: '16315551181', providerMessageId: 'wamid.incoming', sentAt: new Date(Date.now() - 5000) }
  const handlers = load('app/api/messages/[id]/replies/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/access/accessControl': { getAuthorizedActorForFunctions: async () => authorized ? { userId: 10 } : null },
    '@/lib/access/accessCatalog': { WHATSAPP_INBOX_FUNCTION: 'WhatsApp_Inbox' },
    '@/lib/whatsapp/reply': { ...policy, sendWhatsAppTextReply: async data => { calls.send.push(data); return { status: 'accepted', providerMessageId: 'wamid.outgoing' } } },
    '@/lib/db/prisma': { prisma: {
      whatsAppReceivedMessage: {
        findUnique: async () => { calls.lookup++; return message },
        findFirst: async () => ({ ...message, sentAt: stale ? new Date(Date.now() - policy.REPLY_WINDOW_MS - 1) : message.sentAt }),
      },
      whatsAppInboxReply: {
        findUnique: async () => row,
        create: async ({ data }) => { calls.create.push(data); if (collision) throw { code: 'P2002' }; row = data; return row },
        update: async ({ data }) => { row = { ...row, ...data }; return row },
        findMany: async () => [],
      },
    } },
  }, { process: { env } })
  return { ...handlers, calls }
}

test('unauthorized reply/history requests and invalid input do not query messages or send', async () => {
  const h = harness({ authorized: false })
  assert.equal((await h.POST(request(), context)).status, 403)
  assert.equal((await h.GET(request(), context)).status, 403)
  assert.equal(h.calls.lookup, 0)
  const invalid = harness()
  for (const input of [{ body: '', requestId }, { body: 'a'.repeat(4097), requestId }, { body: 'Hello', requestId: 'bad' }]) assert.equal((await invalid.POST(request(input), context)).status, 400)
  assert.equal(invalid.calls.lookup, 0)
})

test('server enforces reply window and configured business number before sending', async () => {
  for (const [options, status] of [[{ stale: true }, 409], [{ mismatch: true }, 503]]) {
    const h = harness(options)
    assert.equal((await h.POST(request(), context)).status, status)
    assert.equal(h.calls.send.length, 0)
    assert.equal(h.calls.create.length, 0)
  }
})

test('reply recipient comes from database and sequential retries send only once', async () => {
  const h = harness()
  const forgedRecipient = { body: 'Hello', requestId, to: 'attacker-controlled', phoneNumberId: 'other' }
  const response = await h.POST(request(forgedRecipient), context)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).reply.status, 'accepted')
  assert.equal((await h.POST(request(), context)).status, 200)
  assert.equal(h.calls.send.length, 1)
  assert.equal(h.calls.send[0].to, '16315551181')
  assert.equal(h.calls.send[0].phoneNumberId, '123')
  assert.equal(h.calls.create[0].createdBy, 10)
})

test('concurrent duplicate reservations and reused request IDs with different bodies cannot send', async () => {
  const concurrent = harness({ collision: true })
  assert.equal((await concurrent.POST(request(), context)).status, 409)
  assert.equal(concurrent.calls.send.length, 0)
  const reused = harness({ existing: { id: requestId, receivedMessageId: 7, createdBy: 10, body: 'Different', status: 'accepted' } })
  assert.equal((await reused.POST(request(), context)).status, 409)
  assert.equal(reused.calls.send.length, 0)
})
