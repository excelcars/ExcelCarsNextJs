import { NextRequest, NextResponse } from 'next/server'
import { getPhotos } from '@/features/reports/stock/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { getInventoryPhotoPublicUrl } from '@/lib/vehicleEmailLinks'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/reports/stock'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const inventoryId = Number(req.nextUrl.searchParams.get('inventoryId'))
  if (!inventoryId) return NextResponse.json([])
  const photos = await getPhotos(inventoryId)
  return NextResponse.json(photos.map(photo => ({
    documentId: photo.documentId,
    fileName: photo.path?.replace(/\\/g, '/').split('/').pop() || 'Photo',
    previewUrl: getInventoryPhotoPublicUrl(photo.path),
  })))
}
