import { NextRequest, NextResponse } from 'next/server'
import { getRecentFollowups } from '@/features/followup/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const inquiryId = Number(req.nextUrl.searchParams.get('inquiryId'))
  if (!inquiryId) return NextResponse.json([])
  const history = await getRecentFollowups(inquiryId)
  return NextResponse.json(history)
}
