import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { getChecklistDetail } from '@/features/checklist/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/checklist'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const documentId = Number(req.nextUrl.searchParams.get('documentId'))
  if (!documentId) return NextResponse.json({ error: 'Checklist not found.' }, { status: 404 })

  const detail = await getChecklistDetail(documentId)
  if (!detail) return NextResponse.json({ error: 'Checklist not found.' }, { status: 404 })

  return NextResponse.json(detail)
}
