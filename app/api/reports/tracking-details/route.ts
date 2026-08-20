import { NextRequest, NextResponse } from 'next/server'
import { getVehicleDetails } from '@/features/reports/tracking/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const registrationNo = req.nextUrl.searchParams.get('registrationNo')
  if (!registrationNo) return NextResponse.json({ checklist: null, insurance: null, rto: null, loan: null })
  const details = await getVehicleDetails(registrationNo)
  return NextResponse.json(details)
}
