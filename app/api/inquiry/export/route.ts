import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { INQUIRY_QUICK_FILTERS, listInquiriesForExport, type InquiryQuickFilter } from '@/features/inquiry/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { getInquiryOwnershipScopeForRoute } from '@/lib/access/inquiryOwnership'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/inquiry'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const status = req.nextUrl.searchParams.get('status')?.trim() ?? 'All'
  const classification = req.nextUrl.searchParams.get('classification')?.trim() ?? 'All'
  const source = req.nextUrl.searchParams.get('source')?.trim() ?? 'All'
  const subStatus = req.nextUrl.searchParams.get('subStatus')?.trim() ?? 'All'
  const followUpDate = req.nextUrl.searchParams.get('followUpDate')?.trim() ?? ''
  const inquiryDate = req.nextUrl.searchParams.get('inquiryDate')?.trim() ?? ''
  const visitedDate = req.nextUrl.searchParams.get('visitedDate')?.trim() ?? ''
  const budgetMin = req.nextUrl.searchParams.get('budgetMin')?.trim() ?? ''
  const budgetMax = req.nextUrl.searchParams.get('budgetMax')?.trim() ?? ''
  const makeId = req.nextUrl.searchParams.get('makeId')?.trim() ?? ''
  const modelId = req.nextUrl.searchParams.get('modelId')?.trim() ?? ''
  const variantId = req.nextUrl.searchParams.get('variantId')?.trim() ?? ''
  const requestedQuickFilter = req.nextUrl.searchParams.get('quickFilter')?.trim()
  const quickFilter: InquiryQuickFilter = INQUIRY_QUICK_FILTERS.includes(requestedQuickFilter as InquiryQuickFilter) ? requestedQuickFilter as InquiryQuickFilter : 'active'
  const ownershipScope = await getInquiryOwnershipScopeForRoute('/inquiry')

  const rows = await listInquiriesForExport({ search, status, classification, source, subStatus, followUpDate, inquiryDate, visitedDate, budgetMin, budgetMax, makeId, modelId, variantId, quickFilter, restrictToUserId: ownershipScope.restrictToUserId })

  return NextResponse.json(rows.map(row => ({
    ...row,
    budgetOfCustomer: row.budgetOfCustomer ? row.budgetOfCustomer.toString() : null,
  })))
}
