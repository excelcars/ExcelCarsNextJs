import test from 'node:test'
import assert from 'node:assert/strict'

const { validateChecklistInput } = await import(new URL('./validation.ts', import.meta.url).href)

const validInput = {
  registrationNo: 'MH 01 AB 1234',
  make: 'Make',
  model: 'Model',
  variant: 'Variant',
  colour: 'Blue',
  year: 2024,
  fuelType: 'Petrol',
  customerId: 1,
  customerNameLegacy: 'Customer',
  customerMobileLegacy: '9876543210',
  customerEmailLegacy: 'customer@example.com',
  docs: [{ documentName: 'RC', applicable: 'Yes', received: 'No', originalCopy: 'Original' }],
}

test('accepts the legacy checklist contract', () => {
  assert.equal(validateChecklistInput(validInput), null)
})

test('allows historical Next.js applicability values during transition', () => {
  assert.equal(validateChecklistInput({ ...validInput, docs: [{ ...validInput.docs[0], applicable: 'Applicable' }] }), null)
})

test('rejects incomplete snapshots and invalid detail states', () => {
  assert.equal(validateChecklistInput({ ...validInput, make: '' }), 'Vehicle make is required.')
  assert.match(
    validateChecklistInput({ ...validInput, docs: [{ ...validInput.docs[0], received: 'Maybe' }] }) ?? '',
    /valid received value/,
  )
})
