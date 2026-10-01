import assert from 'node:assert/strict'
import test from 'node:test'
import { indiaDateKey, indiaDateRange, validateIndiaDateRange } from './date.ts'

test('India date key uses Asia/Kolkata rather than UTC', () => {
  assert.equal(indiaDateKey(new Date('2026-09-30T19:00:00.000Z')), '2026-10-01')
})

test('India date range covers the complete local calendar day', () => {
  const range = indiaDateRange('2026-10-01', '2026-10-01')
  assert.equal(range.from.toISOString(), '2026-09-30T18:30:00.000Z')
  assert.equal(range.to.toISOString(), '2026-10-01T18:29:59.999Z')
})

test('India date range rejects malformed and reversed dates', () => {
  assert.equal(validateIndiaDateRange('2026-02-29', '2026-03-01'), 'Enter valid From and To dates.')
  assert.equal(validateIndiaDateRange('2026-10-02', '2026-10-01'), 'From date cannot be after To date.')
})
