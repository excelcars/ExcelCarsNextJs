import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { getChecklistDetail, listChecklistsForExport } from '@/features/checklist/queries'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const rows = await listChecklistsForExport({ search })
  const details = await Promise.all(rows.map(row => getChecklistDetail(row.documentId)))

  return NextResponse.json(details.filter(Boolean))
}
