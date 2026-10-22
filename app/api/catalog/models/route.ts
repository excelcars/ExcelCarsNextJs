import { NextRequest, NextResponse } from 'next/server'
import { getModelsByMake } from '@/features/inventory/queries'
import { auth } from '../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const makeId = Number(req.nextUrl.searchParams.get('makeId'))
  if (!Number.isInteger(makeId) || makeId <= 0) return NextResponse.json([])
  const includeIncomplete = req.nextUrl.searchParams.get('includeIncomplete') === '1'
  if (includeIncomplete && !(await canCurrentUserAccessRoute('/config/catalog'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const models = await getModelsByMake(makeId, includeIncomplete)
  return NextResponse.json(models)
}
