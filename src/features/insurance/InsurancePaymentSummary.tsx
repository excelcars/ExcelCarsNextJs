'use client'

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
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-3" aria-label="Payment summary">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Payout progress</div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${payment.tone}`}>{payment.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><div className="text-[11px] uppercase tracking-wide text-gray-500">Payout</div><div className="mt-0.5 text-sm font-semibold text-gray-900">{money(payment.payout)}</div></div>
        <div><div className="text-[11px] uppercase tracking-wide text-gray-500">Received</div><div className="mt-0.5 text-sm font-semibold text-emerald-700">{money(payment.received)}</div></div>
        <div><div className="text-[11px] uppercase tracking-wide text-gray-500">Balance</div><div className="mt-0.5 text-sm font-semibold text-amber-700">{money(payment.balance)}</div></div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200" aria-label={`${payment.percentage}% received`}>
        <div className={`h-full rounded-full ${payment.label === 'Paid' ? 'bg-emerald-500' : payment.label === 'Partial' ? 'bg-blue-500' : 'bg-amber-400'}`} style={{ width: `${payment.percentage}%` }} />
      </div>
      <div className="mt-1 text-right text-[11px] text-gray-500">{payment.percentage}% received</div>
    </section>
  )
}
