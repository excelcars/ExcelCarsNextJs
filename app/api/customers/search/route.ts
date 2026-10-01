import { NextRequest, NextResponse } from 'next/server'
import { searchCustomers } from '@/features/customers/queries'
import { auth } from '../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (
    !(await canCurrentUserAccessRoute('/config/customers'))
    && !(await canCurrentUserAccessRoute('/config/feedback'))
    && !(await canCurrentUserAccessRoute('/inventory'))
    && !(await canCurrentUserAccessRoute('/reports/outstanding'))
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const customers = await searchCustomers(q)
  return NextResponse.json(customers)
}
