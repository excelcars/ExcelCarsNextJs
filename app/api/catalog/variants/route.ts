import { NextRequest, NextResponse } from 'next/server'
import { getVariantsByModel } from '@/features/inventory/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const modelId = Number(req.nextUrl.searchParams.get('modelId'))
  if (!modelId) return NextResponse.json([])
  const variants = await getVariantsByModel(modelId)
  return NextResponse.json(variants)
}
