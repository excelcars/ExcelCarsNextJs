import { NextRequest, NextResponse } from 'next/server'
import { listInsuranceForExport } from '@/features/insurance/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  if (!(await canCurrentUserAccessRoute('/insurance'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const fromDate = req.nextUrl.searchParams.get('fromDate')?.trim() ?? ''
  const toDate = req.nextUrl.searchParams.get('toDate')?.trim() ?? ''
  const rows = await listInsuranceForExport({ search, fromDate, toDate })

  return NextResponse.json(rows.map((r) => ({
    ...r,
    insurancePremium: r.insurancePremium ? r.insurancePremium.toString() : null,
    oDPremium: r.oDPremium ? r.oDPremium.toString() : null,
    payoutPercentageOdPremium: r.payoutPercentageOdPremium ? r.payoutPercentageOdPremium.toString() : null,
    payoutAmount: r.payoutAmount ? r.payoutAmount.toString() : null,
    totalAmountReceived: r.totalAmountReceived ? r.totalAmountReceived.toString() : null,
  })))
}
