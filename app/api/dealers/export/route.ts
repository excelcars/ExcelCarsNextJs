import { NextRequest, NextResponse } from 'next/server'
import { listDealersForExport } from '@/features/dealers/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  if (!(await canCurrentUserAccessRoute('/config/dealers'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const dealers = await listDealersForExport({
    search: req.nextUrl.searchParams.get('search') ?? '',
    field: req.nextUrl.searchParams.get('field') ?? 'all',
    sort: req.nextUrl.searchParams.get('sort') ?? 'nameAsc',
  })
  return NextResponse.json(dealers)
}
