import { NextRequest, NextResponse } from 'next/server'
import { getPaymentHistory } from '@/features/insurance/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const insuranceMainId = Number(req.nextUrl.searchParams.get('insuranceMainId'))
  if (!insuranceMainId) return NextResponse.json({ payments: [], followups: [] })
  const history = await getPaymentHistory(insuranceMainId)
  return NextResponse.json(history)
}
