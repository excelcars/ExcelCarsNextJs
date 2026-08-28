import { NextRequest, NextResponse } from 'next/server'
import { getRecentFollowups } from '@/features/followup/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const inquiryId = Number(req.nextUrl.searchParams.get('inquiryId'))
  const rawLimit = req.nextUrl.searchParams.get('limit')
  const limit = rawLimit === 'all'
    ? undefined
    : Number(rawLimit)
  if (!inquiryId) return NextResponse.json([])
  const history = await getRecentFollowups(
    inquiryId,
    Number.isFinite(limit) && limit && limit > 0 ? limit : rawLimit === 'all' ? undefined : 5,
  )
  return NextResponse.json(history)
}
