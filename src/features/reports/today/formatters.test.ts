import assert from 'node:assert/strict'
import test from 'node:test'
import { formatIndiaDate } from './date.ts'

test('today report dates use the India calendar in dd/MM/yyyy format', () => {
  assert.equal(formatIndiaDate(new Date('2026-09-30T19:00:00.000Z')), '01/10/2026')
  assert.equal(formatIndiaDate(null), '')
})
