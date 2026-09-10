export type InsurancePaymentInput = {
  amountReceived: number | null
  payoutPaymentStatus: string
  policyStatus: string
  nextFollowUpDate: string
  remark: string
}

export const INSURANCE_PAYOUT_STATUSES = new Set(['Pending', 'Paid'])
export const INSURANCE_POLICY_STATUSES = new Set(['Pending', 'Received'])

export function validateInsurancePaymentInput(input: InsurancePaymentInput, now = new Date()): { error: string | null; nextFollowUpDate: Date | null } {
  if (typeof input.amountReceived !== 'number' || !Number.isFinite(input.amountReceived) || input.amountReceived <= 0) {
    return { error: 'Amount received must be greater than zero.', nextFollowUpDate: null }
  }
  if (!INSURANCE_PAYOUT_STATUSES.has(input.payoutPaymentStatus)) return { error: 'Select a valid payout status.', nextFollowUpDate: null }
  if (!INSURANCE_POLICY_STATUSES.has(input.policyStatus)) return { error: 'Select a valid policy status.', nextFollowUpDate: null }

  const nextFollowUpDate = input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : null
  if (input.nextFollowUpDate && (!nextFollowUpDate || Number.isNaN(nextFollowUpDate.getTime()))) {
    return { error: 'Enter a valid next follow-up date.', nextFollowUpDate: null }
  }
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  if (nextFollowUpDate && nextFollowUpDate < today) return { error: 'The next follow-up date cannot be in the past.', nextFollowUpDate: null }
  if (input.payoutPaymentStatus === 'Pending') {
    if (!nextFollowUpDate) return { error: 'A next follow-up date is required for a pending payout.', nextFollowUpDate: null }
    if (!input.remark.trim()) return { error: 'A follow-up remark is required for a pending payout.', nextFollowUpDate: null }
  }
  return { error: null, nextFollowUpDate }
}
