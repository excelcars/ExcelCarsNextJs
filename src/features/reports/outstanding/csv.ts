import type { OutstandingRow } from './rules'

function csvValue(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function buildOutstandingCsv(rows: OutstandingRow[]): string {
  const headers = [
    'Sr. No.', 'Type', 'Customer Name', 'Customer Mobile', 'Customer Email', 'Car Registration No',
    'Payment Status', 'Next Follow-up', 'Remark', 'Total Amount', '% of Payout', 'Payout Amount', 'Amount Paid', 'Bal Amt',
  ]
  const lines = [headers.map(csvValue).join(',')]
  const grandTotal = rows.reduce((sum, row) => sum + Number(row.balance ?? 0), 0)

  rows.forEach((row, index) => {
    lines.push([
      index + 1, row.type, row.customerName, row.customerMobile, row.customerEmail, row.registrationNo,
      row.paymentStatus, row.followupDate, row.remark, row.totalAmount, row.percentageOfPayout, row.payoutAmount, row.amountPaid, row.balance,
    ].map(csvValue).join(','))
  })

  lines.push([...Array(12).fill(''), 'Grand Total', grandTotal].map(csvValue).join(','))
  return lines.join('\n')
}
