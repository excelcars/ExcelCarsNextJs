import { redirect } from 'next/navigation'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { getAllowedFunctionNamesForRoute } from '@/lib/access/accessCatalog'
import { MetaMessageLogsClient } from '@/features/messages/MetaMessageLogsClient'

export default async function MetaMessageLogsPage() {
  if (!await getAuthorizedActorForFunctions(getAllowedFunctionNamesForRoute('/messages/logs'))) redirect('/dashboard')
  return <MetaMessageLogsClient />
}
