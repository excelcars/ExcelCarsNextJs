import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { listFollowupsForExport } from '@/features/followup/queries'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const classification = req.nextUrl.searchParams.get('classification')?.trim() ?? 'All'
  const inquiryDateFrom = req.nextUrl.searchParams.get('inquiryDateFrom')?.trim() ?? ''
  const inquiryDateTo = req.nextUrl.searchParams.get('inquiryDateTo')?.trim() ?? ''
  const followUpDateFrom = req.nextUrl.searchParams.get('followUpDateFrom')?.trim() ?? ''
  const followUpDateTo = req.nextUrl.searchParams.get('followUpDateTo')?.trim() ?? ''
  const visitedDateFrom = req.nextUrl.searchParams.get('visitedDateFrom')?.trim() ?? ''
  const visitedDateTo = req.nextUrl.searchParams.get('visitedDateTo')?.trim() ?? ''
  const status = req.nextUrl.searchParams.get('status')?.trim() ?? 'FollowUp'
  const subStatus = req.nextUrl.searchParams.get('subStatus')?.trim() ?? ''
  const website = req.nextUrl.searchParams.get('website')?.trim() ?? ''
  const customerMobile = req.nextUrl.searchParams.get('customerMobile')?.trim() ?? ''
  const userId = req.nextUrl.searchParams.get('userId')?.trim() ?? ''
  const makeId = req.nextUrl.searchParams.get('makeId')?.trim() ?? ''
  const modelId = req.nextUrl.searchParams.get('modelId')?.trim() ?? ''
  const variantId = req.nextUrl.searchParams.get('variantId')?.trim() ?? ''

  const rows = await listFollowupsForExport({
    search,
    classification,
    inquiryDateFrom,
    inquiryDateTo,
    followUpDateFrom,
    followUpDateTo,
    visitedDateFrom,
    visitedDateTo,
    status,
    subStatus,
    website,
    customerMobile,
    userId,
    makeId,
    modelId,
    variantId,
  })

  return NextResponse.json(rows.map(row => ({
    ...row,
    budgetOfCustomer: row.budgetOfCustomer ? row.budgetOfCustomer.toString() : null,
  })))
}
