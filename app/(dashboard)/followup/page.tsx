import { getMakes, getModelsByMake, getVariantsByModel } from '@/features/inventory/queries'
import { getUsersForFollowupFilter, listFollowupQueue } from '@/features/followup/queries'
import { FollowupClient } from '@/features/followup/FollowupClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { getInquiryOwnershipScopeForRoute } from '@/lib/access/inquiryOwnership'
import { redirect } from 'next/navigation'

export default async function FollowupPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    classification?: string
    status?: string
    subStatus?: string
    website?: string
    customerMobile?: string
    userId?: string
    makeId?: string
    modelId?: string
    variantId?: string
    page?: string
    inquiryDateFrom?: string
    inquiryDateTo?: string
    followUpDateFrom?: string
    followUpDateTo?: string
    visitedDateFrom?: string
    visitedDateTo?: string
  }>
}) {
  if (!(await canCurrentUserAccessRoute('/followup'))) redirect('/dashboard')
  const sp = await searchParams
  const search = sp.search ?? ''
  const classification = sp.classification ?? 'All'
  const status = sp.status ?? 'FollowUp'
  const subStatus = sp.subStatus ?? ''
  const website = sp.website ?? ''
  const customerMobile = sp.customerMobile ?? ''
  const userId = sp.userId ?? ''
  const makeId = sp.makeId ?? ''
  const modelId = sp.modelId ?? ''
  const variantId = sp.variantId ?? ''
  const page = Math.max(1, Number(sp.page) || 1)
  const inquiryDateFrom = sp.inquiryDateFrom ?? ''
  const inquiryDateTo = sp.inquiryDateTo ?? ''
  const followUpDateFrom = sp.followUpDateFrom ?? ''
  const followUpDateTo = sp.followUpDateTo ?? ''
  const visitedDateFrom = sp.visitedDateFrom ?? ''
  const visitedDateTo = sp.visitedDateTo ?? ''
  const ownershipScope = await getInquiryOwnershipScopeForRoute('/followup')

  const parsedMakeId = Number(makeId)
  const parsedModelId = Number(modelId)

  const [rows, makes, models, variants, users] = await Promise.all([
    listFollowupQueue({
      search,
      classification,
      status,
      subStatus,
      website,
      customerMobile,
      userId,
      makeId,
      modelId,
      variantId,
      page,
      inquiryDateFrom,
      inquiryDateTo,
      followUpDateFrom,
      followUpDateTo,
      visitedDateFrom,
      visitedDateTo,
      restrictToUserId: ownershipScope.restrictToUserId,
    }),
    getMakes(),
    Number.isFinite(parsedMakeId) && parsedMakeId > 0 ? getModelsByMake(parsedMakeId) : Promise.resolve([]),
    Number.isFinite(parsedModelId) && parsedModelId > 0 ? getVariantsByModel(parsedModelId) : Promise.resolve([]),
    getUsersForFollowupFilter(),
  ])

  const data = rows.rows.map((r) => ({
    ...r,
    budgetOfCustomer: r.budgetOfCustomer ? r.budgetOfCustomer.toString() : null,
  }))

  return (
    <FollowupClient
      initialData={data}
      search={search}
      classification={classification}
      status={status}
      subStatus={subStatus}
      website={website}
      customerMobile={customerMobile}
      users={users}
      userId={userId}
      makes={makes}
      models={models}
      variants={variants}
      makeId={makeId}
      modelId={modelId}
      variantId={variantId}
      total={rows.total}
      page={rows.page}
      pageCount={rows.pageCount}
      inquiryDateFrom={inquiryDateFrom}
      inquiryDateTo={inquiryDateTo}
      followUpDateFrom={followUpDateFrom}
      followUpDateTo={followUpDateTo}
      visitedDateFrom={visitedDateFrom}
      visitedDateTo={visitedDateTo}
      restricted={ownershipScope.restricted}
      currentUserId={ownershipScope.userId ? String(ownershipScope.userId) : ''}
    />
  )
}
