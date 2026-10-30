import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { INQUIRY_QUICK_FILTERS, listInquiriesForExport, type InquiryQuickFilter } from '@/features/inquiry/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { getInquiryOwnershipScopeForRoute } from '@/lib/access/inquiryOwnership'

const csvValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
const clean = (value: string | null | undefined) => !value || ['null', 'na', 'n/a'].includes(value.trim().toLowerCase()) ? '' : value
const indiaDateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })

function exportDate(value: Date | null) {
  if (!value || Number.isNaN(value.getTime())) return ''
  return indiaDateFormatter.format(value).replaceAll('/', '-')
}

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
  const locationId = req.nextUrl.searchParams.get('locationId')?.trim() ?? ''
  const location = req.nextUrl.searchParams.get('location')?.trim() ?? ''
  const region = req.nextUrl.searchParams.get('region')?.trim() ?? ''
  const regionPeriod = req.nextUrl.searchParams.get('regionPeriod')?.trim() ?? ''
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

  const rows = await listInquiriesForExport({ search, status, classification, source, locationId, location, region, regionPeriod, subStatus, followUpDate, inquiryDate, visitedDate, budgetMin, budgetMax, makeId, modelId, variantId, quickFilter, restrictToUserId: ownershipScope.restrictToUserId })
  const headers = ['Date of Inquiry', 'Inquiry No', 'WebSite', 'Source Detail', 'Location', 'Customer', 'MobileNo', 'Email', 'Model', 'Variant', 'Sub Variant', 'Year', 'Budget of Customer', 'Visited Date of Customer', 'Classification', 'Status', 'Sub Status', 'Follow Up Date', 'Remark']
  const lines = [headers.map(csvValue).join(',')]

  for (const row of rows) {
    for (const car of row.inquiryCarDetails.length > 0 ? row.inquiryCarDetails : [null]) {
      lines.push([
        exportDate(row.dateOfInquiry), row.inquiryNo, row.website, row.sourceDetail, row.location,
        row.customer?.custName ?? row.customerNameLegacy, row.mobileno, row.email,
        car ? (clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy)) : '',
        car ? (clean(car.carVariantMaster?.variant) || clean(car.variantLegacy)) : '',
        car ? clean(car.subVariant) : '', car?.year ?? '', row.budgetOfCustomer?.toString(),
        exportDate(row.visitedDateOfCustomer), row.classification, row.status, row.subStatus,
        exportDate(row.followUpDate), row.remark,
      ].map(csvValue).join(','))
    }
  }

  return new NextResponse(`\uFEFF${lines.join('\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="inquiries.csv"',
      'Cache-Control': 'private, no-store',
    },
  })
}
