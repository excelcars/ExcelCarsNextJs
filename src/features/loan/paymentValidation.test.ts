import test from 'node:test'
import assert from 'node:assert/strict'

const { validateLoanPaymentInput } = await import(new URL('./paymentValidation.ts', import.meta.url).href)
const today = new Date('2026-09-10T12:00:00Z')

test('pending and partial payments require a future-or-today follow-up and remark', () => {
  assert.equal(validateLoanPaymentInput({ amountPaid: 100, paymentStatus: 'Pending', nextFollowUpDate: '', remark: '' }, today).error, 'A next follow-up date is required for a pending or partial payment.')
  assert.equal(validateLoanPaymentInput({ amountPaid: 100, paymentStatus: 'Partial', nextFollowUpDate: '2026-09-10', remark: '' }, today).error, 'A follow-up remark is required for a pending or partial payment.')
  assert.equal(validateLoanPaymentInput({ amountPaid: 100, paymentStatus: 'Pending', nextFollowUpDate: '2026-09-10', remark: 'Call again' }, today).error, null)
})

test('paid payments may omit a follow-up and remark, but invalid amounts/statuses fail', () => {
  assert.equal(validateLoanPaymentInput({ amountPaid: 100, paymentStatus: 'Paid', nextFollowUpDate: '', remark: '' }, today).error, null)
  assert.equal(validateLoanPaymentInput({ amountPaid: 0, paymentStatus: 'Paid', nextFollowUpDate: '', remark: '' }, today).error, 'Amount paid must be greater than zero.')
  assert.equal(validateLoanPaymentInput({ amountPaid: 100, paymentStatus: 'Received', nextFollowUpDate: '', remark: '' }, today).error, 'Select a valid payment status.')
})
