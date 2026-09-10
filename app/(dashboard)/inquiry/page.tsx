import { INQUIRY_QUICK_FILTERS, listInquiries, getInquirySources, getInquirySubStatusSuggestions, getMakes, getInquiryAssistants, type InquiryQuickFilter } from '@/features/inquiry/queries'
import { InquiryClient } from '@/features/inquiry/InquiryClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { getInquiryOwnershipScopeForRoute } from '@/lib/access/inquiryOwnership'
import { redirect } from 'next/navigation'

export default async function InquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; classification?: string; source?: string; subStatus?: string; followUpDate?: string; inquiryDate?: string; visitedDate?: string; budgetMin?: string; budgetMax?: string; makeId?: string; modelId?: string; variantId?: string; quickFilter?: string; view?: string; edit?: string; page?: string }>
}) {
  if (!(await canCurrentUserAccessRoute('/inquiry'))) redirect('/dashboard')
  const sp = await searchParams
  const search = sp.search ?? ''
  const status = sp.status ?? 'All'
  const classification = sp.classification ?? 'All'
  const source = sp.source ?? 'All'
  const subStatus = sp.subStatus ?? 'All'
  const followUpDate = sp.followUpDate ?? ''
  const inquiryDate = sp.inquiryDate ?? ''
  const visitedDate = sp.visitedDate ?? ''
  const budgetMin = sp.budgetMin ?? ''
  const budgetMax = sp.budgetMax ?? ''
  const makeId = sp.makeId ?? ''
  const modelId = sp.modelId ?? ''
  const variantId = sp.variantId ?? ''
  const quickFilter: InquiryQuickFilter = INQUIRY_QUICK_FILTERS.includes(sp.quickFilter as InquiryQuickFilter) ? sp.quickFilter as InquiryQuickFilter : 'active'
  const autoOpenViewId = Number(sp.view) || null
  const autoOpenEditId = Number(sp.edit) || null
  const page = Number(sp.page) || 1
  const ownershipScope = await getInquiryOwnershipScopeForRoute('/inquiry')

  const [{ rows, total, pageCount }, makes, sourceOptions, subStatusSuggestions, inquiryAssistants] = await Promise.all([
    listInquiries({ search, status, classification, source, subStatus, followUpDate, inquiryDate, visitedDate, budgetMin, budgetMax, makeId, modelId, variantId, quickFilter, page, restrictToUserId: ownershipScope.restrictToUserId }),
    getMakes(),
    getInquirySources(),
    getInquirySubStatusSuggestions(),
    getInquiryAssistants(),
  ])

  const data = rows.map((r) => ({
    ...r,
    budgetOfCustomer: r.budgetOfCustomer ? r.budgetOfCustomer.toString() : null,
  }))

  return (
    <InquiryClient
      initialData={data}
      makes={makes}
      sourceOptions={sourceOptions}
      subStatusSuggestions={subStatusSuggestions}
      inquiryAssistants={inquiryAssistants}
      total={total}
      page={page}
      pageCount={pageCount}
      search={search}
      status={status}
      classification={classification}
      source={source}
      subStatus={subStatus}
      followUpDate={followUpDate}
      inquiryDate={inquiryDate}
      visitedDate={visitedDate}
      budgetMin={budgetMin}
      budgetMax={budgetMax}
      makeId={makeId}
      modelId={modelId}
      variantId={variantId}
      quickFilter={quickFilter}
      autoOpenViewId={autoOpenViewId}
      autoOpenEditId={autoOpenEditId}
    />
  )
}
