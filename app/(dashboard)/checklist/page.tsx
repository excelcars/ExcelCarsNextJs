import { listChecklists, getVehicles } from '@/features/checklist/queries'
import { ChecklistClient } from '@/features/checklist/ChecklistClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    registration?: string
    page?: string
  }>
}) {
  if (!(await canCurrentUserAccessRoute('/checklist'))) redirect('/dashboard')
  const sp = await searchParams
  const search = sp.search ?? ''
  const registration = sp.registration ?? ''
  const page = Math.max(1, Number(sp.page) || 1)
  const [result, vehicles] = await Promise.all([
    listChecklists({ search, registration, page }),
    getVehicles(),
  ])

  return (
    <ChecklistClient
      initialData={result.rows}
      vehicles={vehicles}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      pageSize={result.pageSize}
      initialSearch={search}
      initialRegistration={registration}
    />
  )
}
