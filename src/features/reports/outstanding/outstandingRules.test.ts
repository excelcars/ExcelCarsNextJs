import test from 'node:test'
import assert from 'node:assert/strict'

const { buildOutstandingCsv } = await import(new URL('./csv.ts', import.meta.url).href)
const {
  calculateOutstandingBalance,
  getOutstandingDrillThroughHref,
  normalizeOutstandingFilters,
} = await import(new URL('./rules.ts', import.meta.url).href)

test('normalizes supported outstanding filters and safe pagination defaults', () => {
  assert.deepEqual(normalizeOutstandingFilters({
    customerName: '  Asha  ', customerMobile: ' 98765 ', registrationNo: ' MH 01 ', type: 'Loan', paymentStatus: 'Partial', page: 2.8, pageSize: 50,
  }), {
    customerName: 'Asha', customerMobile: '98765', registrationNo: 'MH 01', type: 'Loan', paymentStatus: 'Partial', page: 2, pageSize: 50,
  })
  assert.deepEqual(normalizeOutstandingFilters({ type: 'DSA' as never, page: 0, pageSize: 20 }), {
    customerName: '', customerMobile: '', registrationNo: '', type: 'All', paymentStatus: 'All', page: 1, pageSize: 25,
  })
})

test('calculates RTO, Insurance, and Loan balances from payout less received', () => {
  assert.equal(calculateOutstandingBalance(15_000, 5_000), 10_000)
  assert.equal(calculateOutstandingBalance(7_500, 7_500), 0)
  assert.equal(calculateOutstandingBalance(2_000, 2_500), -500)
  assert.equal(calculateOutstandingBalance(null, null), 0)
})

test('keeps zero and negative balances and builds compatible module drill-through links', () => {
  assert.equal(getOutstandingDrillThroughHref('RTO', 'MH 01 AB 1234'), '/rto?registrationNo=MH%2001%20AB%201234')
  assert.equal(getOutstandingDrillThroughHref('Insurance', 'MH01AB1234'), '/insurance?search=MH01AB1234')
  assert.equal(getOutstandingDrillThroughHref('Loan', 'MH01AB1234'), '/loan?search=MH01AB1234')
})

test('exports every report column with escaped values and the complete grand total', () => {
  const csv = buildOutstandingCsv([
    {
      key: 'rto-1', type: 'RTO', registrationNo: 'MH01AB1234', customerName: 'Asha "Ace"', customerMobile: '98765', customerEmail: null,
      paymentStatus: 'Partial', followupDate: '2026-10-05T00:00:00.000Z', remark: 'Call "agent"', totalAmount: 15_000, percentageOfPayout: null, payoutAmount: 15_000, amountPaid: 5_000, balance: 10_000,
    },
    {
      key: 'loan-1', type: 'Loan', registrationNo: 'MH02XY4321', customerName: 'Ravi', customerMobile: null, customerEmail: 'ravi@example.com',
      paymentStatus: 'Paid', followupDate: null, remark: null, totalAmount: 10_000, percentageOfPayout: 10, payoutAmount: 1_000, amountPaid: 1_000, balance: 0,
    },
  ])

  assert.match(csv, /^"Sr\. No\.".*"Bal Amt"/)
  assert.match(csv, /"Asha ""Ace"""/)
  assert.match(csv, /"Call ""agent"""/)
  assert.match(csv, /"Grand Total","10000"$/)
})
