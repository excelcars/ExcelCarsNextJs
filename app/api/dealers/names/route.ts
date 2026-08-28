import { NextRequest, NextResponse } from 'next/server'
import { searchDealerNames } from '@/features/dealers/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  if (!(await canCurrentUserAccessRoute('/config/dealers'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const names = await searchDealerNames(req.nextUrl.searchParams.get('q') ?? '')
  return NextResponse.json(names)
}
