import test from 'node:test'
import assert from 'node:assert/strict'

const { buildVehicleTextFilter } = await import(new URL('./vehicleFilters.ts', import.meta.url).href)

test('vehicle text filter returns null when no text criteria are supplied', () => {
  assert.equal(buildVehicleTextFilter({ legacyMake: ' ', legacyModel: '', legacyVariant: '' }), null)
})

test('vehicle text filter searches historic and normalized values on the same car row', () => {
  assert.deepEqual(buildVehicleTextFilter({ legacyMake: ' Honda ', legacyModel: 'City', legacyVariant: 'VX' }), {
    inquiryCarDetails: {
      some: {
        AND: [
          {
            OR: [
              { makeLegacy: { contains: 'Honda', mode: 'insensitive' } },
              { carVariantMaster: { carMakeMaster: { make: { contains: 'Honda', mode: 'insensitive' } } } },
            ],
          },
          {
            OR: [
              { modelLegacy: { contains: 'City', mode: 'insensitive' } },
              { carVariantMaster: { carModelMaster: { model: { contains: 'City', mode: 'insensitive' } } } },
            ],
          },
          {
            OR: [
              { variantLegacy: { contains: 'VX', mode: 'insensitive' } },
              { subVariant: { contains: 'VX', mode: 'insensitive' } },
              { carVariantMaster: { variant: { contains: 'VX', mode: 'insensitive' } } },
            ],
          },
        ],
      },
    },
  })
})
