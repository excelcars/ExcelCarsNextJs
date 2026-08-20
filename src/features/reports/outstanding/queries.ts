import { prisma } from '@/lib/db/prisma'

export interface OutstandingRow {
  key: string
  type: 'RTO' | 'Insurance' | 'Loan'
  registrationNo: string | null
  customerName: string | null
  payoutAmount: number
  amountReceived: number
  balance: number
}

export async function listOutstanding() {
  const [rto, insurance, loan] = await Promise.all([
    prisma.rtoAgent.findMany({
      include: { customer: true },
      where: { OR: [{ transferCharges: { not: null } }, { amtPaid: { not: null } }] },
    }),
    prisma.insuranceMain.findMany({
      include: { customer: true },
      where: { OR: [{ payoutAmount: { not: null } }, { totalAmountReceived: { not: null } }] },
    }),
    prisma.loanManagement.findMany({
      include: { customer: true },
      where: { OR: [{ payoutAmount: { not: null } }, { totalAmountReceived: { not: null } }] },
    }),
  ])

  const rows: OutstandingRow[] = []

  for (const r of rto) {
    const payout = Number(r.transferCharges ?? 0)
    const received = Number(r.amtPaid ?? 0)
    const balance = payout - received
    if (balance === 0) continue
    rows.push({
      key: `rto-${r.rtoAgentMainId}`, type: 'RTO',
      registrationNo: r.carRegistrationNo,
      customerName: r.customer?.custName ?? r.customerNameLegacy,
      payoutAmount: payout, amountReceived: received, balance,
    })
  }

  for (const r of insurance) {
    const payout = Number(r.payoutAmount ?? 0)
    const received = Number(r.totalAmountReceived ?? 0)
    const balance = payout - received
    if (balance === 0) continue
    rows.push({
      key: `insurance-${r.insuranceMainId}`, type: 'Insurance',
      registrationNo: r.carRegistrationNo,
      customerName: r.customer?.custName ?? r.customerNameLegacy,
      payoutAmount: payout, amountReceived: received, balance,
    })
  }

  for (const r of loan) {
    const payout = Number(r.payoutAmount ?? 0)
    const received = Number(r.totalAmountReceived ?? 0)
    const balance = payout - received
    if (balance === 0) continue
    rows.push({
      key: `loan-${r.loanManagementId}`, type: 'Loan',
      registrationNo: r.registrationNo,
      customerName: r.customer?.custName ?? r.customerNameLegacy,
      payoutAmount: payout, amountReceived: received, balance,
    })
  }

  rows.sort((a, b) => b.balance - a.balance)
  return rows
}
