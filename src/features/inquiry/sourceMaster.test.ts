import test from 'node:test'
import assert from 'node:assert/strict'

const { INQUIRY_SOURCE_MASTER_SEED } = await import(new URL('./sourceMaster.ts', import.meta.url).href)
const { normalizeInquirySourceInput, validateInquirySourceInput } = await import(new URL('../inquiry-sources/validation.ts', import.meta.url).href)

test('source master codes are unique and distinguish Other from Unknown', () => {
  const codes = INQUIRY_SOURCE_MASTER_SEED.map((source: { code: string }) => source.code)
  assert.equal(new Set(codes).size, codes.length)
  assert.equal(INQUIRY_SOURCE_MASTER_SEED.find((source: { code: string }) => source.code === 'REFERENCE')?.requiresDetail, true)
  assert.equal(INQUIRY_SOURCE_MASTER_SEED.find((source: { code: string }) => source.code === 'OTHER')?.requiresDetail, true)
  assert.equal(INQUIRY_SOURCE_MASTER_SEED.find((source: { code: string }) => source.code === 'UNKNOWN')?.requiresDetail, false)
  const reportingSorts = INQUIRY_SOURCE_MASTER_SEED.map((source: { reportingSort: number }) => source.reportingSort).sort((a: number, b: number) => a - b)
  assert.deepEqual(reportingSorts, Array.from({ length: 35 }, (_, index) => index + 1))
})

test('source master form normalizes codes and rejects invalid reporting orders', () => {
  const normalized = normalizeInquirySourceInput({
    code: '  new portal  ',
    displayName: ' New Portal ',
    category: ' Portal ',
    requiresDetail: false,
    isActive: true,
    reportingSort: 36,
  })

  assert.equal(normalized.code, 'NEW_PORTAL')
  assert.equal(validateInquirySourceInput(normalized), null)
  assert.equal(validateInquirySourceInput({ ...normalized, reportingSort: 0 }), 'Reporting order must be a whole number from 1 to 9999.')
})
