import { NextRequest, NextResponse } from 'next/server'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { listFeedbackForExport } from '@/features/feedback/queries'

export async function GET(req: NextRequest) {
  if (!(await canCurrentUserAccessRoute('/config/feedback'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const search = req.nextUrl.searchParams.get('search') ?? ''
    return NextResponse.json(await listFeedbackForExport({ search }))
  } catch {
    return NextResponse.json({ error: 'Could not export feedback.' }, { status: 500 })
  }
}
