import { NextRequest, NextResponse } from 'next/server'
import { getPaymentHistory } from '@/features/rto/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rtoAgentMainId = Number(req.nextUrl.searchParams.get('rtoAgentMainId'))
  if (!rtoAgentMainId) return NextResponse.json({ payments: [], followups: [] })
  const history = await getPaymentHistory(rtoAgentMainId)
  return NextResponse.json(history)
}
