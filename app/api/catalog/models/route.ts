import { NextRequest, NextResponse } from 'next/server'
import { getModelsByMake } from '@/features/inventory/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const makeId = Number(req.nextUrl.searchParams.get('makeId'))
  if (!makeId) return NextResponse.json([])
  const models = await getModelsByMake(makeId)
  return NextResponse.json(models)
}
