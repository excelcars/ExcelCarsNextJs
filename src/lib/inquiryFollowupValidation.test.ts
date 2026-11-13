import test from 'node:test'
import assert from 'node:assert/strict'

const {
  normalizeInquiryCarYear,
  resolveFollowupSubStatusInput,
  validateFollowupLogInput,
  validateInquiryFormInput,
} = await import(new URL('./inquiryFollowupValidation.ts', import.meta.url).href)

const validInquiry = {
  customerId: 1,
  customerNameLegacy: 'Customer',
  mobileno: '9833173457',
  email: '',
  website: 'CarDekho',
  sourceCode: 'CARDEKHO',
  sourceDetail: '',
  budgetOfCustomer: null,
  dateOfInquiry: '2026-09-01',
  visitedDateOfCustomer: '',
  classification: 'Warm',
  status: 'Open',
  subStatus: '',
  followUpDate: '2026-09-02',
  remark: '',
  inquiryCars: [{ carYear: 2020 }],
}

test('inquiry validation requires a car, source, and a valid mobile number', () => {
  const result = validateInquiryFormInput({ ...validInquiry, sourceCode: '', mobileno: '', inquiryCars: [] })
  assert.equal(result.error, 'Add at least one car of interest before saving the inquiry.')
  assert.deepEqual(result.fieldErrors, { mobileno: true, website: true, inquiryCars: true })
})

test('inquiry validation allows an omitted or zero budget and a positive budget', () => {
  for (const budgetOfCustomer of [null, 0, 1200000]) {
    const result = validateInquiryFormInput({ ...validInquiry, budgetOfCustomer })
    assert.equal(result.error, null)
    assert.deepEqual(result.fieldErrors, {})
  }
})

test('inquiry validation explains invalid fields even when they are outside the visible form section', () => {
  const result = validateInquiryFormInput({
    ...validInquiry,
    mobileno: '123',
    email: 'invalid',
    sourceCode: '',
    inquiryCars: [{ carYear: 1800, noOfOwners: -1 }],
  })
  assert.match(result.error!, /10-digit customer mobile number/)
  assert.match(result.error!, /valid customer email address/)
  assert.match(result.error!, /Select a source/)
  assert.match(result.error!, /Car 1: enter a valid vehicle year/)
  assert.match(result.error!, /Car 1: number of owners/)
})

test('inquiry validation rejects negative and non-finite budgets', () => {
  for (const budgetOfCustomer of [-1, NaN, Infinity]) {
    const result = validateInquiryFormInput({ ...validInquiry, budgetOfCustomer })
    assert.equal(result.fieldErrors.budgetOfCustomer, true)
  }
})

test('inquiry validation allows an omitted vehicle year but rejects an invalid supplied year', () => {
  const withoutYear = validateInquiryFormInput({ ...validInquiry, inquiryCars: [{ carYear: null }] })
  assert.equal(withoutYear.error, null)
  assert.deepEqual(withoutYear.fieldErrors, {})

  const invalidYear = validateInquiryFormInput({ ...validInquiry, inquiryCars: [{ carYear: 1800 }] })
  assert.equal(invalidYear.fieldErrors['carYear-0'], true)
})

test('inquiry validation treats a legacy zero year as omitted and stores it as null', () => {
  for (const carYear of [null, 0, undefined]) {
    assert.equal(normalizeInquiryCarYear(carYear), null)
    const result = validateInquiryFormInput({ ...validInquiry, inquiryCars: [{ carYear }] })
    assert.equal(result.error, null)
    assert.deepEqual(result.fieldErrors, {})
  }
  assert.equal(normalizeInquiryCarYear(2020), 2020)
  assert.equal(normalizeInquiryCarYear(1800), 1800)
})

test('inquiry validation requires a scheduled date for follow-up and visited date for Visited', () => {
  const open = validateInquiryFormInput({ ...validInquiry, followUpDate: '' })
  assert.equal(open.error, 'Follow-up date is required when status is Open or Follow Up.')

  const followUp = validateInquiryFormInput({ ...validInquiry, status: 'FollowUp', followUpDate: '' })
  assert.equal(followUp.error, 'Follow-up date is required when status is Open or Follow Up.')

  const closed = validateInquiryFormInput({ ...validInquiry, status: 'Closed', followUpDate: '' })
  assert.equal(closed.error, null)

  const visited = validateInquiryFormInput({ ...validInquiry, subStatus: 'Visited' })
  assert.equal(visited.error, 'Visited date is required when sub-status is Visited.')
})

test('follow-up validation stores the custom OTHER sub-status and rejects invalid saves', () => {
  assert.equal(resolveFollowupSubStatusInput({ subStatus: 'OTHER', useOtherSubStatus: true, otherSubStatus: 'Partner checking stock' }), 'Partner checking stock')

  const result = validateFollowupLogInput({
    contactOutcome: 'spoke_to_customer',
    status: 'FollowUp',
    subStatus: 'OTHER',
    useOtherSubStatus: true,
    otherSubStatus: '',
    classification: 'Warm',
    comments: 'Customer asked for a call tomorrow.',
    nextFollowUpDate: '2026-09-02',
  }, '2026-09-01')
  assert.equal(result.error, 'Enter the custom sub-status when OTHER is selected.')
})

test('follow-up validation permits a closed inquiry without another follow-up date', () => {
  const result = validateFollowupLogInput({
    contactOutcome: 'spoke_to_customer',
    status: 'Closed',
    subStatus: 'Deal done',
    classification: 'Hot',
    comments: 'Booking completed.',
    nextFollowUpDate: '',
  }, '2026-09-01')
  assert.equal(result.error, null)
})

test('follow-up validation permits an omitted contact outcome', () => {
  const result = validateFollowupLogInput({
    contactOutcome: '',
    status: 'Closed',
    subStatus: 'Lost',
    classification: 'Cold',
    comments: 'Customer selected another vehicle.',
    nextFollowUpDate: '',
  }, '2026-09-01')
  assert.equal(result.error, null)
})
