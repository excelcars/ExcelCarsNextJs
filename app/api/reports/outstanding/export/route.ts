import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { OUTSTANDING_PAYMENT_STATUSES, OUTSTANDING_TYPES, listOutstandingForExport } from '@/features/reports/outstanding/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

function toStringParam(value: string | null) {
  return value?.trim() ?? ''
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/reports/outstanding'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const searchParams = req.nextUrl.searchParams
  const rows = await listOutstandingForExport({
    customerName: toStringParam(searchParams.get('customerName')),
    customerMobile: toStringParam(searchParams.get('customerMobile')),
    registrationNo: toStringParam(searchParams.get('registrationNo')),
    type: OUTSTANDING_TYPES.includes((toStringParam(searchParams.get('type')) || 'All') as (typeof OUTSTANDING_TYPES)[number])
      ? (toStringParam(searchParams.get('type')) || 'All') as (typeof OUTSTANDING_TYPES)[number]
      : 'All',
    paymentStatus: OUTSTANDING_PAYMENT_STATUSES.includes((toStringParam(searchParams.get('paymentStatus')) || 'All') as (typeof OUTSTANDING_PAYMENT_STATUSES)[number])
      ? (toStringParam(searchParams.get('paymentStatus')) || 'All') as (typeof OUTSTANDING_PAYMENT_STATUSES)[number]
      : 'All',
  })

  return NextResponse.json(rows)
}
