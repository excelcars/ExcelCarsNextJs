import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { findLoanCustomerMatches } from '@/features/loan/customerLookup'

export async function GET(request: NextRequest) {
  if (!(await auth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/loan'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const mobile = request.nextUrl.searchParams.get('mobile') ?? ''
  return NextResponse.json(await findLoanCustomerMatches(mobile))
}
