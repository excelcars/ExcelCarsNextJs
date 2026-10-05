import assert from 'node:assert/strict'
import test from 'node:test'
import { clampExceptionPage, normalizeExceptionFilters } from './rules.ts'

test('normalizes valid exception filters and page values', () => {
  assert.deepEqual(normalizeExceptionFilters({
    fromDate: '2026-10-01', toDate: '2026-10-02', userId: '42', page: '3',
  }), {
    filters: { fromDate: '2026-10-01', toDate: '2026-10-02', userId: 42, page: 3 },
    error: null,
  })

  assert.deepEqual(normalizeExceptionFilters({ page: '-4' }), {
    filters: { fromDate: '', toDate: '', userId: null, page: 1 },
    error: null,
  })
})

test('rejects invalid exception dates, reversed ranges, and invalid user ids', () => {
  assert.equal(normalizeExceptionFilters({ fromDate: '2026-02-30' }).error, 'Enter valid From and To dates.')
  assert.equal(normalizeExceptionFilters({ fromDate: '2026-10-02', toDate: '2026-10-01' }).error, 'From date cannot be after To date.')
  assert.equal(normalizeExceptionFilters({ userId: '2.5' }).error, 'Select a valid user.')
})

test('clamps exception pages to the available range', () => {
  assert.equal(clampExceptionPage(9, 26), 2)
  assert.equal(clampExceptionPage(0, 0), 1)
})
