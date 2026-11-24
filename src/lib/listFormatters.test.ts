import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDateInput, formatListDate } from './listFormatters.ts'

test('edit date values use HTML calendar format while lists keep readable dates', () => {
  for (const saved of [new Date('2026-10-21T00:00:00.000Z'), '2026-10-21T00:00:00.000Z', '2026-10-21']) {
    assert.equal(formatDateInput(saved), '2026-10-21')
    assert.equal(formatListDate(saved), '21 Oct 2026')
  }
})

test('edit dates preserve the UTC calendar day used by the inquiry list', () => {
  assert.equal(formatDateInput('2026-10-21T23:30:00Z'), '2026-10-21')
  assert.equal(formatDateInput('2026-10-22T01:00:00+05:30'), '2026-10-21')
  assert.equal(formatDateInput('2024-02-29T00:00:00Z'), '2024-02-29')
})

test('missing or invalid saved dates remain empty', () => {
  for (const saved of [null, undefined, '', 'invalid', new Date(NaN)]) {
    assert.equal(formatDateInput(saved), '')
    assert.equal(formatListDate(saved), '')
  }
})
