import test from 'node:test'
import assert from 'node:assert/strict'

const { normalizeRegistrationNo } = await import(new URL('../../lib/validation.ts', import.meta.url).href)

test('loan registration normalization removes whitespace and normalizes case', () => {
  assert.equal(normalizeRegistrationNo(' mh 01 ab 1234 '), 'MH01AB1234')
  assert.equal(normalizeRegistrationNo('MH-01 AB-1234'), 'MH-01AB-1234')
  assert.equal(normalizeRegistrationNo('   '), '')
})
