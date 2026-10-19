import test from 'node:test'
import assert from 'node:assert/strict'

const { validateInsurancePaymentInput } = await import(new URL('./paymentValidation.ts', import.meta.url).href)
const today = new Date('2026-09-10T12:00:00Z')

test('pending insurance payments require a follow-up and remark', () => {
  assert.equal(validateInsurancePaymentInput({ amountReceived: 100, payoutPaymentStatus: 'Pending', policyStatus: 'Pending', nextFollowUpDate: '', remark: '' }, today).error, 'A next follow-up date is required for a pending payout.')
  assert.equal(validateInsurancePaymentInput({ amountReceived: 100, payoutPaymentStatus: 'Pending', policyStatus: 'Pending', nextFollowUpDate: '2026-09-10', remark: '' }, today).error, 'A follow-up remark is required for a pending payout.')
  assert.equal(validateInsurancePaymentInput({ amountReceived: 100, payoutPaymentStatus: 'Pending', policyStatus: 'Pending', nextFollowUpDate: '2026-09-10', remark: 'Call again' }, today).error, null)
})

test('paid insurance payments may omit follow-up and reject invalid values', () => {
  assert.equal(validateInsurancePaymentInput({ amountReceived: 100, payoutPaymentStatus: 'Paid', policyStatus: 'Received', nextFollowUpDate: '', remark: '' }, today).error, null)
  assert.equal(validateInsurancePaymentInput({ amountReceived: 100, payoutPaymentStatus: 'Paid', policyStatus: 'Renewed', nextFollowUpDate: '', remark: '' }, today).error, null)
  assert.equal(validateInsurancePaymentInput({ amountReceived: 0, payoutPaymentStatus: 'Paid', policyStatus: 'Received', nextFollowUpDate: '', remark: '' }, today).error, 'Amount received must be greater than zero.')
  assert.equal(validateInsurancePaymentInput({ amountReceived: 100, payoutPaymentStatus: 'Received', policyStatus: 'Received', nextFollowUpDate: '', remark: '' }, today).error, 'Select a valid payout status.')
})
