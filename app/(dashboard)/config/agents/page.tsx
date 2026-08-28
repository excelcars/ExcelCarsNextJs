import { listAgentsPaged } from '@/features/agents/adminQueries'
import { AgentsClient } from '@/features/agents/AgentsClient'

export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ search?: string; type?: string; page?: string }> }) {
  const sp = await searchParams
  const search = sp.search ?? ''
  const type = sp.type ?? 'All'
  const page = Number(sp.page) || 1
  const { rows, total, pageCount } = await listAgentsPaged({ search, type, page })

  return <AgentsClient initialData={rows} total={total} page={page} pageCount={pageCount} search={search} type={type} />
}
