export type LoanPaymentInput = { amountPaid: number | null; paymentStatus: string; nextFollowUpDate: string; remark: string }

export const LOAN_PAYMENT_STATUSES = new Set(['Pending', 'Paid'])

export function validateLoanPaymentInput(input: LoanPaymentInput, now = new Date()): { error: string | null; nextFollowUpDate: Date | null } {
  if (typeof input.amountPaid !== 'number' || !Number.isFinite(input.amountPaid) || input.amountPaid <= 0) return { error: 'Amount paid must be greater than zero.', nextFollowUpDate: null }
  if (!LOAN_PAYMENT_STATUSES.has(input.paymentStatus)) return { error: 'Select a valid payment status.', nextFollowUpDate: null }
  const nextFollowUpDate = input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : null
  if (input.nextFollowUpDate && (!nextFollowUpDate || Number.isNaN(nextFollowUpDate.getTime()))) return { error: 'Enter a valid next follow-up date.', nextFollowUpDate: null }
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  if (nextFollowUpDate && nextFollowUpDate < today) return { error: 'The next follow-up date cannot be in the past.', nextFollowUpDate: null }
  if (input.paymentStatus === 'Pending') {
    if (!nextFollowUpDate) return { error: 'A next follow-up date is required for a pending payment.', nextFollowUpDate: null }
    if (!input.remark.trim()) return { error: 'A follow-up remark is required for a pending payment.', nextFollowUpDate: null }
  }
  return { error: null, nextFollowUpDate }
}
