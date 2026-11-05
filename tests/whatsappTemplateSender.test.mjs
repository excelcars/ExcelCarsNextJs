import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(readFileSync(new URL('../src/lib/whatsapp/templateSender.mjs', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, allowJs: true } }).outputText
function harness({ reserveFails = false, finalizeFails = false, rejected = false, sendingEnabled = true } = {}) {
  const module = { exports: {} }
  const calls = { created: [], updates: [], network: [] }
  runInNewContext(source, { require: name => { assert.equal(name, './sendingPolicy.mjs'); return { WHATSAPP_SENDING_ENABLED: sendingEnabled, WHATSAPP_PAUSED_MESSAGE: 'WhatsApp sending is temporarily disabled.' } }, module, exports: module.exports, AbortController, setTimeout, clearTimeout, console: { error() {} },
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

test('paused templates never reserve history or call Meta even with credentials', async () => {
  const h = harness({ sendingEnabled: false })
  const result = await h.send(input)
  assert.equal(result.success, false)
  assert.match(result.error, /temporarily disabled/)
  assert.equal(h.calls.network.length, 0)
  assert.equal(h.calls.created.length, 0)
})


test('deployed pause blocks real template sender and insurance retries', async () => {
  const { WHATSAPP_SENDING_ENABLED } = await import('../src/lib/whatsapp/sendingPolicy.mjs')
  assert.equal(WHATSAPP_SENDING_ENABLED, false)
  const { sendLoggedWhatsAppTemplate } = await import('../src/lib/whatsapp/templateSender.mjs')
  assert.equal((await sendLoggedWhatsAppTemplate({}, input)).success, false)
  const { retryInsuranceReminders, queueDailyInsuranceReminders } = await import('../src/worker/insuranceReminders.mjs')
  const previous = process.env.INSURANCE_REMINDER_ENABLED
  process.env.INSURANCE_REMINDER_ENABLED = 'true'
  try {
    await retryInsuranceReminders({ insuranceReminderDelivery: { findMany: async ({ where }) => {
      assert.equal(where.channel, 'Email')
      // Even a WhatsApp delivery returned from storage must remain paused.
      return [{ channel: 'WhatsApp' }]
    } } })
    const expiryDate = new Date(Date.now() + 86400000)
    await queueDailyInsuranceReminders({
      messageTemplate: { findFirst: async () => ({ messageBody: 'Reminder' }) },
      insuranceMain: { findMany: async () => [{ expiryDate, customer: { custName: 'Test', custMobile: '9000000001' } }] },
      insuranceReminderDelivery: { create: () => assert.fail('Must not queue WhatsApp reminders') },
    })
  } finally {
    if (previous === undefined) delete process.env.INSURANCE_REMINDER_ENABLED
    else process.env.INSURANCE_REMINDER_ENABLED = previous
  }
})
