import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { getChecklistDetail } from '@/features/checklist/queries'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const documentId = Number(req.nextUrl.searchParams.get('documentId'))
  if (!documentId) return NextResponse.json({ error: 'Checklist not found.' }, { status: 404 })

  const detail = await getChecklistDetail(documentId)
  if (!detail) return NextResponse.json({ error: 'Checklist not found.' }, { status: 404 })

  return NextResponse.json(detail)
}
