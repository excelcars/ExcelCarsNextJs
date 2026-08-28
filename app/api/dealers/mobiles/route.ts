import { NextRequest, NextResponse } from 'next/server'
import { searchDealerMobiles } from '@/features/dealers/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  if (!(await canCurrentUserAccessRoute('/config/dealers'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const mobiles = await searchDealerMobiles(req.nextUrl.searchParams.get('q') ?? '')
  return NextResponse.json(mobiles)
}
