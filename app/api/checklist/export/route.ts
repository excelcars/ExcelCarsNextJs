import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { getChecklistDetail, listChecklistsForExport } from '@/features/checklist/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/checklist'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const registration = req.nextUrl.searchParams.get('registration')?.trim() ?? ''
  const rows = await listChecklistsForExport({ search, registration })
  const details = await Promise.all(rows.map(row => getChecklistDetail(row.documentId)))

  return NextResponse.json(details.filter(Boolean))
}
