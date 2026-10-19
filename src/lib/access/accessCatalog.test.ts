import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LEGACY_TODAY_INQUIRY_FOLLOWUP_FUNCTION,
  TODAY_ACTIVITY_FUNCTION,
  getAllowedFunctionNamesForRoute,
} from './accessCatalog.ts'

test('today report accepts both current and legacy permission grants', () => {
  assert.deepEqual(getAllowedFunctionNamesForRoute('/reports/today'), [
    TODAY_ACTIVITY_FUNCTION,
    LEGACY_TODAY_INQUIRY_FOLLOWUP_FUNCTION,
  ])
})
