import { redirect } from 'next/navigation'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { PORTAL_ASSIGNMENT_MANAGEMENT_FUNCTION } from '@/lib/access/accessCatalog'
import { getPortalAssignmentSettings } from '@/features/portal-assignments/queries'
import { PortalAssignmentsClient } from '@/features/portal-assignments/PortalAssignmentsClient'

export default async function PortalAssignmentsPage() {
  const actor = await getAuthorizedActorForFunctions([PORTAL_ASSIGNMENT_MANAGEMENT_FUNCTION])
  if (!actor) redirect('/dashboard')
  const { sources, users } = await getPortalAssignmentSettings()
  return <PortalAssignmentsClient initialSources={sources} users={users} />
}
