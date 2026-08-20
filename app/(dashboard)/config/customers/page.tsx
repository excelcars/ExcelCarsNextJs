import { listCustomersPaged } from '@/features/customers/adminQueries'
import { CustomersClient } from '@/features/customers/CustomersClient'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; page?: string }>
}) {
  const sp = await searchParams
  const search = sp.search ?? ''
  const type = sp.type ?? 'All'
  const page = Number(sp.page) || 1

  const { rows, total, pageCount } = await listCustomersPaged({ search, type, page })

  return (
    <CustomersClient
      initialData={rows}
      total={total}
      page={page}
      pageCount={pageCount}
      search={search}
      type={type}
    />
  )
}
