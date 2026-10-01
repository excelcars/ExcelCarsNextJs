import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { listOutstandingRegistrationSuggestions } from '@/features/reports/outstanding/queries'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/reports/outstanding'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  return NextResponse.json(await listOutstandingRegistrationSuggestions(q))
}
