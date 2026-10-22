import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanCatalogName, catalogDisplayName, catalogSelectOptions, catalogTextOptions } from './catalogNames.ts'

test('catalog names reject exact placeholders, without rejecting real names', () => {
  for (const value of [null, undefined, '', '  ', ' NULL ', 'Na', 'n/A', '-', '—']) assert.equal(cleanCatalogName(value), '')
  for (const value of ['Nissan', 'NA Edition', 'N Line']) assert.equal(cleanCatalogName(` ${value} `), value)
})

test('incomplete records have identifiable labels, not synthetic stored names', () => {
  assert.equal(catalogDisplayName(null, 'model', 42), 'Unnamed model (#42)')
  assert.equal(catalogDisplayName(' BMW ', 'make', 7), 'BMW')
})

test('new choices exclude incomplete records; existing selection retains its original ID', () => {
  const rows = [{ id: 1, name: null }, { id: 2, name: 'NA' }, { id: 3, name: ' BMW ' }]
  const snapshot = structuredClone(rows)
  assert.deepEqual(catalogSelectOptions(rows, r => r.id, r => r.name), [{ value: '3', label: 'BMW' }])
  assert.deepEqual(catalogSelectOptions(rows, r => r.id, r => r.name, 2, 'make'), [
    { value: '2', label: 'Unnamed make (#2)' }, { value: '3', label: 'BMW' },
  ])
  assert.deepEqual(rows, snapshot)
})

test('text suggestions trim and deduplicate case-insensitively', () => {
  assert.deepEqual(catalogTextOptions([' BMW ', 'bmw', null, 'na', 'Nissan', 'Nissan ']), ['BMW', 'Nissan'])
})
