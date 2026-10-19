import test from 'node:test'
import assert from 'node:assert/strict'
const {
  buildTrackedVehicleUrl,
  buildVehicleSlug,
  classifyVehicleEmailVisit,
  generateVehicleEmailToken,
  hashVehicleEmailToken,
  maskRegistrationNumber,
} = await import(new URL('./vehicleEmailLinks.ts', import.meta.url).href)

test('generateVehicleEmailToken returns secure raw token and different hash', () => {
  const { rawToken, tokenHash } = generateVehicleEmailToken()
  assert.equal(rawToken.length, 64)
  assert.equal(tokenHash.length, 64)
  assert.notEqual(rawToken, tokenHash)
  assert.equal(tokenHash, hashVehicleEmailToken(rawToken))
})

test('buildVehicleSlug creates a readable vehicle slug', () => {
  const slug = buildVehicleSlug({
    make: 'Audi',
    model: 'Q7',
    variant: '3.0 TDI Quattro',
    year: 2013,
  })
  assert.equal(slug, 'audi-q7-3-0-tdi-quattro-2013')
})

test('buildTrackedVehicleUrl includes token query parameter', () => {
  process.env.PUBLIC_APP_URL = 'https://www.excelcars.com'
  const url = buildTrackedVehicleUrl('audi-q7-2013', 'securetoken123')
  assert.equal(url, 'https://www.excelcars.com/vehicle/audi-q7-2013?t=securetoken123')
})

test('maskRegistrationNumber hides the tail of a registration number', () => {
  assert.equal(maskRegistrationNumber('MH13 BK 7788'), 'MH13BK****')
  assert.equal(maskRegistrationNumber('MH03'), 'MH****')
})

test('classifyVehicleEmailVisit recognizes common scanners and humans', () => {
  assert.equal(classifyVehicleEmailVisit('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'human')
  assert.equal(classifyVehicleEmailVisit('Mozilla/5.0 (compatible; GoogleImageProxy)'), 'bot')
  assert.equal(classifyVehicleEmailVisit(''), 'unknown')
})
