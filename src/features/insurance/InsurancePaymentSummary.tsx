'use client'

import { Badge } from '@/components/ui'

type PaymentSummaryProps = {
  payoutAmount: string | number | null
  totalAmountReceived: string | number | null
}

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`

export function getInsurancePaymentState(payoutAmount: string | number | null, totalAmountReceived: string | number | null) {
  const payout = Math.max(0, Number(payoutAmount ?? 0))
  const received = Math.max(0, Number(totalAmountReceived ?? 0))
  const balance = Math.max(0, payout - received)
  const percentage = payout > 0 ? Math.min(100, Math.round((received / payout) * 100)) : 0
  const label = payout <= 0 ? 'Awaiting payout' : balance <= 0 ? 'Paid' : received > 0 ? 'Partial' : 'Pending'
  const tone = label === 'Paid' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : label === 'Partial' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-amber-700 bg-amber-50 border-amber-200'
  return { payout, received, balance, percentage, label, tone }
}

export function InsurancePaymentSummary({ payoutAmount, totalAmountReceived }: PaymentSummaryProps) {
  const payment = getInsurancePaymentState(payoutAmount, totalAmountReceived)
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Payment summary">
      <SummaryCard label="Payout amount" value={money(payment.payout)} className="border-gray-200 bg-gray-50 text-gray-900" />
      <SummaryCard label="Amount paid" value={money(payment.received)} className="border-emerald-100 bg-emerald-50 text-emerald-800" badge={payment.label === 'Partial' ? 'Partially Paid' : payment.label === 'Paid' ? 'Paid' : undefined} />
      <SummaryCard label="Pending balance" value={money(payment.balance)} className="border-orange-100 bg-orange-50 text-orange-800" />
    </section>
  )
}

export function InsurancePaymentWorkflow({ payoutPaymentStatus, policyStatus }: { payoutPaymentStatus: string | null; policyStatus: string | null }) {
  const isActionNeeded = payoutPaymentStatus !== 'Paid' || (policyStatus !== 'Received' && policyStatus !== 'Renewed')
  return <section className="rounded-lg border border-gray-200 bg-gray-50 p-3" aria-label="Insurance workflow status">
    <div className="mb-2 flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Workflow status</div><span className={`text-xs font-medium ${isActionNeeded ? 'text-orange-600' : 'text-emerald-700'}`}>{isActionNeeded ? 'Action needed' : 'Completed'}</span></div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <WorkflowItem label="Payout status" status={payoutPaymentStatus || 'Pending'} action={payoutPaymentStatus === 'Paid' ? 'Payout complete' : 'Record payment'} />
      <WorkflowItem label="Policy status" status={policyStatus || 'Pending'} action={policyStatus === 'Received' || policyStatus === 'Renewed' ? 'Policy complete' : 'Mark received / renewed'} />
    </div>
  </section>
}

function SummaryCard({ label, value, className, badge }: { label: string; value: string; className: string; badge?: string }) {
  return <div className={`rounded-lg border px-3 py-2.5 ${className}`}><div className="text-[10px] font-semibold uppercase tracking-wide opacity-75">{label}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold"><span>{value}</span>{badge && <Badge label={badge} />}</div></div>
}

function WorkflowItem({ label, status, action }: { label: string; status: string; action: string }) {
  return <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2"><div className="text-xs text-gray-500">{label}</div><div className="mt-1 flex flex-wrap items-center gap-2"><Badge label={status} /><span className="text-xs text-orange-700">{action}</span></div></div>
}
