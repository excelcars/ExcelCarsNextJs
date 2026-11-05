import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { parseWhatsAppMessages, secureEqual, verifyWhatsAppSignature } from './webhook.ts'

function payload(messages: unknown[], phone = '123') {
  return { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: phone }, contacts: [{ wa_id: '919876543210', profile: { name: 'Customer' } }], messages,
  } }] }] }
}
const base = { id: 'wamid.1', from: '919876543210', timestamp: '1793664000' }

test('verifies exact raw bytes, rejects changed bodies, invalid signatures and missing secrets', () => {
  const raw = Buffer.from('{"text":"hello"}')
  const signature = `sha256=${createHmac('sha256', 'secret').update(raw).digest('hex')}`
  assert.equal(verifyWhatsAppSignature(raw, signature, 'secret'), true)
  assert.equal(verifyWhatsAppSignature(Buffer.from('{}'), signature, 'secret'), false)
  for (const invalid of [null, '', 'sha256=aa', signature + '00']) assert.equal(verifyWhatsAppSignature(raw, invalid, 'secret'), false)
  assert.equal(verifyWhatsAppSignature(raw, signature, ''), false)
  assert.equal(secureEqual('x', 'longer'), false)
})

test('normalizes batched text, interactive replies and media with sender metadata', () => {
  const result = parseWhatsAppMessages(payload([
    { ...base, type: 'text', text: { body: 'Hello <script>' } },
    { ...base, id: 'wamid.2', type: 'interactive', interactive: { button_reply: { id: 'yes', title: 'Interested' } } },
    { ...base, id: 'wamid.3', type: 'image', image: { id: 'media1', caption: 'My car' } },
  ]), '123')
  assert.equal(result.length, 3)
  assert.equal(result[0].body, 'Hello <script>')
  assert.equal(result[0].senderName, 'Customer')
  assert.equal(result[0].sentAt.toISOString(), new Date(1793664000000).toISOString())
  assert.equal(result[1].body, 'Interested')
  assert.equal(result[2].mediaId, 'media1')
  assert.equal(result[2].body, 'My car')
})

test('ignores other business numbers and status-only events', () => {
  assert.deepEqual(parseWhatsAppMessages(payload([{ ...base, type: 'text' }], 'other'), '123'), [])
  assert.deepEqual(parseWhatsAppMessages(payload([]), '123'), [])
})

test('rejects malformed messages and wrong event objects', () => {
  assert.throws(() => parseWhatsAppMessages({}, '123'))
  for (const change of [{ id: '' }, { from: 'bad' }, { timestamp: 'bad' }, { timestamp: '1e100' }]) {
    assert.throws(() => parseWhatsAppMessages(payload([{ ...base, type: 'text', ...change }]), '123'))
  }
})

test('preserves unknown type placeholders and limits message length', () => {
  assert.equal(parseWhatsAppMessages(payload([{ ...base, type: 'unknown' }]), '123')[0].body, '[unknown]')
  assert.equal(parseWhatsAppMessages(payload([{ ...base, type: 'text', text: { body: 'a'.repeat(10000) } }]), '123')[0].body.length, 4096)
})
