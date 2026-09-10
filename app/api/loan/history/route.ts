import { NextRequest, NextResponse } from 'next/server'
import { getPaymentHistory } from '@/features/loan/queries'
import { auth } from '../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/loan'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const loanManagementId = Number(req.nextUrl.searchParams.get('loanManagementId'))
  if (!Number.isInteger(loanManagementId) || loanManagementId <= 0) {
    return NextResponse.json({ error: 'A valid loanManagementId is required.' }, { status: 400 })
  }
  const history = await getPaymentHistory(loanManagementId)
  return NextResponse.json(history)
}
