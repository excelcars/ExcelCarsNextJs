import test from 'node:test'
import assert from 'node:assert/strict'

const { validateInventoryInput } = await import(new URL('./validation.ts', import.meta.url).href)

const validInventory = {
  fkVariantId: 1,
  registrationNo: 'MH01AB1234',
  colour: 'Black',
  year: 2024,
  fuelType: 'Petrol',
  isCarRegistered: true,
  tax: 'Individual',
  kmsDriven: 1000,
  insuranceType: 'Comprehensive',
  price: 500000,
  status: 'In Stock',
  ownedType: 'Excel Cars',
  ownedBy: 'Excel Cars',
  mobileNoOwnedBy: '',
  emailIdOwnedBy: '',
  noOfOwners: 1,
  customerId: null,
  customerName: '',
}

test('unregistered inventory permits empty registration-related fields', () => {
  const result = validateInventoryInput({
    ...validInventory,
    registrationNo: '',
    fuelType: '',
    isCarRegistered: false,
    tax: '',
    kmsDriven: null,
    insuranceType: '',
    noOfOwners: null,
  })

  assert.equal(result, null)
})

test('registered inventory requires all registration-related fields', () => {
  assert.equal(validateInventoryInput({ ...validInventory, registrationNo: '' }), 'Registration number is required for registered vehicles.')
  assert.equal(validateInventoryInput({ ...validInventory, fuelType: '' }), 'Fuel type is required for registered vehicles.')
  assert.equal(validateInventoryInput({ ...validInventory, tax: '' }), 'Tax type is required for registered vehicles.')
  assert.equal(validateInventoryInput({ ...validInventory, kmsDriven: null }), 'Kilometres driven is required for registered vehicles.')
  assert.equal(validateInventoryInput({ ...validInventory, insuranceType: '' }), 'Insurance type is required for registered vehicles.')
  assert.equal(validateInventoryInput({ ...validInventory, noOfOwners: null }), 'Number of owners must be at least one.')
})

test('sold inventory requires a linked customer instead of a compatibility name', () => {
  assert.equal(
    validateInventoryInput({ ...validInventory, status: 'Sold', customerId: null, customerName: 'Old hidden name' }),
    'Select a customer for Sold inventory.',
  )
  assert.equal(validateInventoryInput({ ...validInventory, status: 'Sold', customerId: 42, customerName: '' }), null)
})
