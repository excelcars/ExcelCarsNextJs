import { NextRequest, NextResponse } from 'next/server'
import { getVariantsByModel } from '@/features/inventory/queries'
import { auth } from '../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const modelId = Number(req.nextUrl.searchParams.get('modelId'))
  if (!Number.isInteger(modelId) || modelId <= 0) return NextResponse.json([])
  const includeIncomplete = req.nextUrl.searchParams.get('includeIncomplete') === '1'
  if (includeIncomplete && !(await canCurrentUserAccessRoute('/config/catalog'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const variants = await getVariantsByModel(modelId, includeIncomplete)
  return NextResponse.json(variants)
}
