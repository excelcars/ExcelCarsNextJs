import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTodayFollowupWhere, TODAY_FOLLOWUP_ORDER } from './queryContract.ts'

test('today report ordering is newest update first with a stable ID tie-breaker', () => {
  assert.deepEqual(TODAY_FOLLOWUP_ORDER, [
    { updatedDt: 'desc' },
    { pkFollowupId: 'desc' },
  ])
})

test('today report applies the updater filter only when no ownership restriction exists', () => {
  const from = new Date('2026-10-01T00:00:00.000Z')
  const to = new Date('2026-10-01T23:59:59.999Z')

  assert.deepEqual(buildTodayFollowupWhere({ from, to, userId: 42, restrictedInquiryWhere: null }), {
    updatedDt: { gte: from, lte: to },
    updatedBy: 42,
  })
  assert.deepEqual(buildTodayFollowupWhere({ from, to, userId: 42, restrictedInquiryWhere: { createdBy: 7 } }), {
    updatedDt: { gte: from, lte: to },
    inquiry: { createdBy: 7 },
  })
})
