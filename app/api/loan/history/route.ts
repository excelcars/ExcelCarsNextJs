import { NextRequest, NextResponse } from 'next/server'
import { getPaymentHistory } from '@/features/loan/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const loanManagementId = Number(req.nextUrl.searchParams.get('loanManagementId'))
  if (!loanManagementId) return NextResponse.json({ payments: [], followups: [] })
  const history = await getPaymentHistory(loanManagementId)
  return NextResponse.json(history)
}
