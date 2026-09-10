import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { listLoansForExport } from '@/features/loan/queries'

const csv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
const date = (value: Date | null) => value ? value.toISOString().slice(0, 10) : ''

export async function GET(req: NextRequest) {
  if (!(await auth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/loan'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const p = req.nextUrl.searchParams
  const rows = await listLoansForExport({ search: p.get('search') ?? undefined, registrationNo: p.get('registrationNo') ?? undefined, customerName: p.get('customerName') ?? undefined, customerMobile: p.get('customerMobile') ?? undefined, bankName: p.get('bankName') ?? undefined, bankPersonName: p.get('bankPersonName') ?? undefined, paymentStatus: p.get('paymentStatus') ?? undefined, fromDate: p.get('fromDate') ?? undefined, toDate: p.get('toDate') ?? undefined })
  const header = ['Loan ID','Registration No','Customer Name','Customer Mobile','Bank Name','Bank Person Name','Loan Amount','Payout Percentage','Payout Amount','Total Amount Received','Payment Status','Payment Date','Follow-up Date','Remarks']
  const lines = [header.map(csv).join(',')]
  rows.forEach(row => lines.push([row.loanManagementId,row.registrationNo,row.customer?.custName ?? row.customerNameLegacy,row.customer?.custMobile ?? row.customerMobileLegacy,row.bankName,row.bankPersonName,row.loanAmount,row.percentagePayoutAmount,row.payoutAmount,row.totalAmountReceived,row.paymentStatus,date(row.paymentDate),date(row.followupDate),row.remarks].map(csv).join(',')))
  return new NextResponse(lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="loan.csv"' } })
}
