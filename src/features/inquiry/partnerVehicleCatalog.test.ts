import assert from 'node:assert/strict'
import test from 'node:test'
import { matchPartnerVehicle, partnerVehicleKey, type PartnerCatalogVariant } from './partnerVehicleCatalog.ts'
import { readablePartnerPayload } from './partnerPayload.ts'

function entry(id: number, make: string, model: string, variant: string): PartnerCatalogVariant {
  return { pkVariantId: id, variant, carMakeMaster: { pkMakeId: 1, make }, carModelMaster: { pkModelId: 2, fkMakeId: 1, model } }
}

test('complete MMVs match through case, punctuation, spacing and manufacturer aliases', () => {
  assert.equal(matchPartnerVehicle('BMW X1 sDrive20d Expedition', [entry(10, 'BMW', 'X 1', 'S DRIVE 20 D EXPEDITION')])?.fkVariantId, 10)
  assert.equal(matchPartnerVehicle('Mercedes-Benz E-class 280 CDI', [entry(20, 'Mercedes ', 'E Class', '280 CDI')])?.fkVariantId, 20)
  assert.equal(matchPartnerVehicle('Suzuki Baleno Delta', [entry(30, 'Maruti', 'Baleno', 'Delta')])?.fkVariantId, 30)
})

test('missing trims, substrings and incomplete or inconsistent catalog rows never match', () => {
  assert.equal(matchPartnerVehicle('Maruti Baleno Zeta', [entry(1, 'Maruti', 'Baleno', 'Zeta MT')]), null)
  assert.equal(matchPartnerVehicle('BMW 5 Series 525d Highline', [entry(1, 'BMW', '5 Series', '525d')]), null)
  for (const variant of ['null', 'NA', 'SELECT', '']) assert.equal(matchPartnerVehicle(`BMW X1 ${variant}`, [entry(1, 'BMW', 'X1', variant)]), null)
  const row = entry(1, 'BMW', 'X1', '20d')
  assert.equal(matchPartnerVehicle('BMW X1 20d', [{ ...row, carModelMaster: { pkModelId: 2, fkMakeId: 9, model: 'X1' } }]), null)
})

test('equivalent duplicate spellings use a stable ID; conflicting model IDs need review', () => {
  const row = entry(10, 'BMW', 'X1', 'sDrive 20d')
  assert.equal(matchPartnerVehicle('BMW X1 sDrive20d', [{ ...row, pkVariantId: 20, variant: 'S DRIVE 20 D' }, row])?.fkVariantId, 10)
  assert.equal(matchPartnerVehicle('BMW X1 sDrive20d', [row, { ...row, pkVariantId: 30, carModelMaster: { pkModelId: 3, fkMakeId: 1, model: 'X1' } }]), null)
  assert.equal(partnerVehicleKey(' BMW X1 sDrive-20d '), partnerVehicleKey('bmw x1 SDrive 20d'))
})

test('partner JSON is converted to readable business fields, preserving zero values', () => {
  const result = readablePartnerPayload('CARDEKHO', { mmv: 'BMW X1', mfg_year: 2018, no_of_owners: 0, buyer_name: '<script>text</script>', secret: 'never show', reg_no: { nested: 'ignored' } })
  assert.deepEqual(result, [{ label: 'Customer', value: '<script>text</script>' }, { label: 'Vehicle requested', value: 'BMW X1' }, { label: 'Manufacturing year', value: '2018' }, { label: 'Owners', value: '0' }])
  assert.deepEqual(readablePartnerPayload('CARDEKHO', null), [])
  assert.deepEqual(readablePartnerPayload('OTHER', { secret: 'hidden' }), [])
  assert.equal(readablePartnerPayload('JUSTDIAL', { category: 'Used cars' })[0].value, 'Used cars')
})
