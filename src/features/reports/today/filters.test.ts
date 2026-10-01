import assert from 'node:assert/strict'
import test from 'node:test'
import { parseTodayUserId } from './filters.ts'

test('today report accepts only positive integer user IDs', () => {
  assert.equal(parseTodayUserId('42'), 42)
  assert.equal(parseTodayUserId(' 42 '), 42)
  assert.equal(parseTodayUserId(undefined), null)
  assert.equal(parseTodayUserId('0'), null)
  assert.equal(parseTodayUserId('-1'), null)
  assert.equal(parseTodayUserId('2.5'), null)
  assert.equal(parseTodayUserId('abc'), null)
})
