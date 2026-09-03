import { redirect } from 'next/navigation'
import { INQUIRY_SOURCE_MASTER_FUNCTION } from '@/lib/access/accessCatalog'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { InquirySourceMasterClient } from '@/features/inquiry-sources/InquirySourceMasterClient'
import { listInquirySources } from '@/features/inquiry-sources/queries'

export default async function InquirySourceMasterPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const actor = await getAuthorizedActorForFunctions([INQUIRY_SOURCE_MASTER_FUNCTION])
  if (!actor) redirect('/dashboard')

  const params = await searchParams
  const data = await listInquirySources(params.search ?? '', Number(params.page) || 1)
  return <InquirySourceMasterClient initialData={data.rows} total={data.total} page={data.page} pageCount={data.pageCount} search={params.search ?? ''} />
}
