import { listInquiries, getInquirySourceSuggestions, getMakes } from '@/features/inquiry/queries'
import { InquiryClient } from '@/features/inquiry/InquiryClient'

export default async function InquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; classification?: string; source?: string; subStatus?: string; followUpDate?: string; visitedDate?: string; makeId?: string; modelId?: string; variantId?: string; view?: string; edit?: string; page?: string }>
}) {
  const sp = await searchParams
  const search = sp.search ?? ''
  const status = sp.status ?? 'All'
  const classification = sp.classification ?? 'All'
  const source = sp.source ?? 'All'
  const subStatus = sp.subStatus ?? 'All'
  const followUpDate = sp.followUpDate ?? ''
  const visitedDate = sp.visitedDate ?? ''
  const makeId = sp.makeId ?? ''
  const modelId = sp.modelId ?? ''
  const variantId = sp.variantId ?? ''
  const autoOpenViewId = Number(sp.view) || null
  const autoOpenEditId = Number(sp.edit) || null
  const page = Number(sp.page) || 1

  const [{ rows, total, pageCount }, makes, sourceSuggestions] = await Promise.all([
    listInquiries({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId, page }),
    getMakes(),
    getInquirySourceSuggestions(),
  ])

  const data = rows.map((r) => ({
    ...r,
    budgetOfCustomer: r.budgetOfCustomer ? r.budgetOfCustomer.toString() : null,
  }))

  return (
    <InquiryClient
      initialData={data}
      makes={makes}
      sourceSuggestions={sourceSuggestions}
      total={total}
      page={page}
      pageCount={pageCount}
      search={search}
      status={status}
      classification={classification}
      source={source}
      subStatus={subStatus}
      followUpDate={followUpDate}
      visitedDate={visitedDate}
      makeId={makeId}
      modelId={modelId}
      variantId={variantId}
      autoOpenViewId={autoOpenViewId}
      autoOpenEditId={autoOpenEditId}
    />
  )
}
