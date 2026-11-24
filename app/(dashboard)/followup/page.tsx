import { getMakes, getModelsByMake, getVariantsByModel } from '@/features/inventory/queries'
import { getInquirySources, getInquiryLocations, getInquirySubStatusSuggestions } from '@/features/inquiry/queries'
import { getUsersForFollowupFilter, listFollowupQueue } from '@/features/followup/queries'
import { FollowupClient } from '@/features/followup/FollowupClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { getInquiryOwnershipScopeForRoute } from '@/lib/access/inquiryOwnership'
import { resolveFollowupUserId } from '@/features/followup/userScope'
import { redirect } from 'next/navigation'

export default async function FollowupPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    classification?: string
    status?: string
    contactOutcome?: string
    customerName?: string
    subStatus?: string
    website?: string
    customerMobile?: string
    inquiryId?: string
    excludeUserId?: string
    userId?: string
    makeId?: string
    modelId?: string
    variantId?: string
    sort?: string
    page?: string
    inquiryDateFrom?: string
    inquiryDateTo?: string
    followUpDateFrom?: string
    followUpDateTo?: string
    visitedDateFrom?: string
    visitedDateTo?: string
    budgetFrom?: string
    budgetTo?: string
  }>
}) {
  if (!(await canCurrentUserAccessRoute('/followup'))) redirect('/dashboard')
  const sp = await searchParams
  const search = sp.search ?? ''
  const classification = sp.classification ?? 'All'
  const status = sp.status ?? 'FollowUp'
  const contactOutcome = sp.contactOutcome ?? ''
  const customerName = sp.customerName ?? ''
  const subStatus = sp.subStatus ?? ''
  const website = sp.website ?? ''
  const customerMobile = sp.customerMobile ?? ''
  const inquiryId = sp.inquiryId ?? ''
  const makeId = sp.makeId ?? ''
  const modelId = sp.modelId ?? ''
  const variantId = sp.variantId ?? ''
  const sort = sp.sort === 'activity' || sp.sort === 'inquiry' ? sp.sort : 'due'
  const page = Math.max(1, Number(sp.page) || 1)
  const inquiryDateFrom = sp.inquiryDateFrom ?? ''
  const inquiryDateTo = sp.inquiryDateTo ?? ''
  const followUpDateFrom = sp.followUpDateFrom ?? ''
  const followUpDateTo = sp.followUpDateTo ?? ''
  const visitedDateFrom = sp.visitedDateFrom ?? ''
  const visitedDateTo = sp.visitedDateTo ?? ''
  const budgetFrom = sp.budgetFrom ?? ''
  const budgetTo = sp.budgetTo ?? ''
  const ownershipScope = await getInquiryOwnershipScopeForRoute('/followup')
  const userId = resolveFollowupUserId(sp.userId, ownershipScope, sp.excludeUserId)

  const parsedMakeId = Number(makeId)
  const parsedModelId = Number(modelId)

  const [rows, makes, models, variants, users, sourceOptions, locationOptions, subStatusSuggestions] = await Promise.all([
    listFollowupQueue({
      search,
      classification,
      status,
      contactOutcome,
      customerName,
      subStatus,
      website,
      customerMobile,
      inquiryId,
      userId,
      excludeUserId: sp.excludeUserId,
      makeId,
      modelId,
      variantId,
      sort,
      page,
      inquiryDateFrom,
      inquiryDateTo,
      followUpDateFrom,
      followUpDateTo,
      visitedDateFrom,
      visitedDateTo,
      budgetFrom,
      budgetTo,
      restrictToUserId: ownershipScope.restrictToUserId,
      ownershipMode: ownershipScope.ownershipMode,
    }),
    getMakes(),
    Number.isFinite(parsedMakeId) && parsedMakeId > 0 ? getModelsByMake(parsedMakeId) : Promise.resolve([]),
    Number.isFinite(parsedModelId) && parsedModelId > 0 ? getVariantsByModel(parsedModelId) : Promise.resolve([]),
    getUsersForFollowupFilter(),
    getInquirySources(),
    getInquiryLocations(),
    getInquirySubStatusSuggestions(),
  ])

  const data = rows.rows.map((r) => ({
    ...r,
    budgetOfCustomer: r.budgetOfCustomer ? r.budgetOfCustomer.toString() : null,
  }))

  return (
    <FollowupClient
      initialData={data}
      excludeUserId={sp.excludeUserId ?? ''}
      search={search}
      classification={classification}
      status={status}
      contactOutcome={contactOutcome}
      customerName={customerName}
      subStatus={subStatus}
      website={website}
      sourceOptions={sourceOptions}
      locationOptions={locationOptions}
      subStatusSuggestions={subStatusSuggestions}
      customerMobile={customerMobile}
      users={users}
      userId={userId}
      makes={makes}
      models={models}
      variants={variants}
      makeId={makeId}
      modelId={modelId}
      variantId={variantId}
      sort={sort}
      total={rows.total}
      page={rows.page}
      pageCount={rows.pageCount}
      inquiryDateFrom={inquiryDateFrom}
      inquiryDateTo={inquiryDateTo}
      followUpDateFrom={followUpDateFrom}
      followUpDateTo={followUpDateTo}
      visitedDateFrom={visitedDateFrom}
      visitedDateTo={visitedDateTo}
      budgetFrom={budgetFrom}
      budgetTo={budgetTo}
      restricted={ownershipScope.restricted}
      currentUserId={ownershipScope.userId ? String(ownershipScope.userId) : ''}
    />
  )
}
