import { NextRequest, NextResponse } from 'next/server'
import { searchPartners } from '@/features/partners/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const partnerType = req.nextUrl.searchParams.get('partnerType') ?? ''
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!partnerType) return NextResponse.json([])
  const partners = await searchPartners(partnerType, q)
  return NextResponse.json(partners)
}
