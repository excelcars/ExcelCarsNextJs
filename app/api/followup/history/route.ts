import { NextRequest, NextResponse } from 'next/server'
import { getRecentFollowups } from '@/features/followup/queries'
import { auth } from '../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { getInquiryOwnershipScopeForRoute } from '@/lib/access/inquiryOwnership'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/followup'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const inquiryId = Number(req.nextUrl.searchParams.get('inquiryId'))
  const rawLimit = req.nextUrl.searchParams.get('limit')
  const limit = rawLimit === 'all'
    ? undefined
    : Number(rawLimit)
  if (!inquiryId) return NextResponse.json([])
  const ownershipScope = await getInquiryOwnershipScopeForRoute('/followup')
  const history = await getRecentFollowups(
    inquiryId,
    Number.isFinite(limit) && limit && limit > 0 ? limit : rawLimit === 'all' ? undefined : 5,
    ownershipScope.restrictToUserId,
    ownershipScope.ownershipMode,
  )
  return NextResponse.json(history)
}
