import test from 'node:test'
import assert from 'node:assert/strict'

const {
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
