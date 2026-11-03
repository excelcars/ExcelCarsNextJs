import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(readFileSync(new URL('../src/lib/whatsapp/templateSender.mjs', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, allowJs: true } }).outputText
function harness({ reserveFails = false, finalizeFails = false, rejected = false } = {}) {
  const module = { exports: {} }
  const calls = { created: [], updates: [], network: [] }
  runInNewContext(source, { module, exports: module.exports, AbortController, setTimeout, clearTimeout, console: { error() {} },
    process: { env: { WHATSAPP_ACCESS_TOKEN: 'test-token', WHATSAPP_PHONE_NUMBER_ID: 'business1' } },
    fetch: async (url, options) => { calls.network.push({ url, options }); return Response.json(rejected ? { error: { message: 'Invalid template' } } : { messages: [{ id: 'wamid.sent' }] }, { status: rejected ? 400 : 200 }) },
  })
  const prisma = { whatsAppSentMessage: {
    create: async ({ data }) => { calls.created.push(data); if (reserveFails) throw new Error('missing table'); return { id: 1 } },
    update: async input => { calls.updates.push(input); if (finalizeFails) throw new Error('unavailable') },
  } }
  return { send: input => module.exports.sendLoggedWhatsAppTemplate(prisma, input), calls }
}
const input = { to: '919000000001', customerName: 'Test Customer', templateName: 'enquiry_temp', body: 'Customer: Test Customer\nVehicle: BMW', buttonUrlSuffix: 'vehicle/demo?t=test', components: [{ type: 'body', parameters: [{ type: 'text', text: 'Test Customer' }, { type: 'text', text: 'BMW' }] }] }

test('template send preserves request parameters and sending business in the journal', async () => {
  const h = harness()
  const result = await h.send(input)
  assert.equal(result.success, true)
  assert.equal(h.calls.created[0].phoneNumberId, 'business1')
  assert.equal(h.calls.created[0].recipientMobile, input.to)
  assert.equal(h.calls.created[0].buttonUrlSuffix, input.buttonUrlSuffix)
  assert.equal(JSON.stringify(h.calls.created[0].parameters), JSON.stringify(input.components))
  const sent = JSON.parse(h.calls.network[0].options.body)
  assert.equal(sent.template.name, input.templateName)
  assert.deepEqual(sent.template.components, input.components)
  assert.equal(h.calls.updates[0].data.providerMessageId, 'wamid.sent')
  assert.equal(h.calls.updates[0].data.status, 'Submitted')
  assert.equal(JSON.stringify(h.calls.created).includes('test-token'), false)
})

test('failure to reserve history prevents an untracked Meta send', async () => {
  const h = harness({ reserveFails: true })
  assert.equal((await h.send(input)).success, false)
  assert.equal(h.calls.network.length, 0)
})

test('accepted Meta sends remain accepted if journal finalization fails', async () => {
  const h = harness({ finalizeFails: true })
  const result = await h.send(input)
  assert.equal(result.success, true)
  assert.equal(result.providerMessageId, 'wamid.sent')
  assert.equal(h.calls.network.length, 1)
})

test('provider rejections are stored as failed, without marking them delivered', async () => {
  const h = harness({ rejected: true })
  assert.equal((await h.send(input)).success, false)
  assert.equal(h.calls.updates[0].data.status, 'Failed')
  assert.equal(h.calls.updates[0].data.errorMessage, 'Invalid template')
})
