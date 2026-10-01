import { NextRequest, NextResponse } from 'next/server'
import { getVehicleDetails } from '@/features/reports/tracking/queries'
import { auth } from '../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/reports/tracking'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const inventoryId = Number(req.nextUrl.searchParams.get('inventoryId'))
  if (!Number.isInteger(inventoryId) || inventoryId <= 0) return NextResponse.json({ error: 'A valid inventory ID is required.' }, { status: 400 })
  const details = await getVehicleDetails(inventoryId)
  if (!details) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })
  return NextResponse.json(details)
}
