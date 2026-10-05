import assert from 'node:assert/strict'
import test from 'node:test'
import { exceptionDateRange, formatExceptionDateTime } from './date.ts'

test('exception date range covers the complete Asia/Kolkata calendar day', () => {
  const range = exceptionDateRange('2026-10-01', '2026-10-01')
  assert.equal(range.from?.toISOString(), '2026-09-30T18:30:00.000Z')
  assert.equal(range.to?.toISOString(), '2026-10-01T18:29:59.999Z')
})

test('exception timestamps render in Asia/Kolkata', () => {
  assert.match(formatExceptionDateTime('2026-09-30T18:30:00.000Z'), /1 Oct 2026/)
})
