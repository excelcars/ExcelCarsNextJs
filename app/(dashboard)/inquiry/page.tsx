import { listInquiries, getMakes } from '@/features/inquiry/queries'
import { InquiryClient } from '@/features/inquiry/InquiryClient'

export default async function InquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; classification?: string; page?: string }>
}) {
  const sp = await searchParams
  const search = sp.search ?? ''
  const status = sp.status ?? 'All'
  const classification = sp.classification ?? 'All'
  const page = Number(sp.page) || 1

  const [{ rows, total, pageCount }, makes] = await Promise.all([
    listInquiries({ search, status, classification, page }),
    getMakes(),
  ])

  const data = rows.map((r) => ({
    ...r,
    budgetOfCustomer: r.budgetOfCustomer ? r.budgetOfCustomer.toString() : null,
  }))

  return (
    <InquiryClient
      initialData={data}
      makes={makes}
      total={total}
      page={page}
      pageCount={pageCount}
      search={search}
      status={status}
      classification={classification}
    />
  )
}
