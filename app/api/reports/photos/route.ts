import { NextRequest, NextResponse } from 'next/server'
import { getPhotos } from '@/features/reports/stock/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const inventoryId = Number(req.nextUrl.searchParams.get('inventoryId'))
  if (!inventoryId) return NextResponse.json([])
  const photos = await getPhotos(inventoryId)
  return NextResponse.json(photos)
}
