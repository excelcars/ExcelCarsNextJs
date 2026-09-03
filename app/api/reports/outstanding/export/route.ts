import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { OUTSTANDING_TYPES, listOutstandingForExport } from '@/features/reports/outstanding/queries'

function toStringParam(value: string | null) {
  return value?.trim() ?? ''
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = req.nextUrl.searchParams
  const rows = await listOutstandingForExport({
    customerName: toStringParam(searchParams.get('customerName')),
    customerMobile: toStringParam(searchParams.get('customerMobile')),
    registrationNo: toStringParam(searchParams.get('registrationNo')),
    type: OUTSTANDING_TYPES.includes((toStringParam(searchParams.get('type')) || 'All') as (typeof OUTSTANDING_TYPES)[number])
      ? (toStringParam(searchParams.get('type')) || 'All') as (typeof OUTSTANDING_TYPES)[number]
      : 'All',
  })

  return NextResponse.json(rows)
}
