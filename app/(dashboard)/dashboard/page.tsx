import { auth } from '../../../auth'
import {
  getBirthdayAnniversaryReminders,
  getDashboardStats,
  getAssignedExpiryRenewalPolicies,
  getExpiryRenewalPolicies,
  getLeadLocationBreakdowns,
  getLeadRegionBreakdowns,
  getLeadSourceBreakdown,
  getLegacyLeadDetails,
  getPendingFollowups,
  getPendingInsurancePolicies,
  getPendingPayments,
  getRtoTransferPendingRcPending,
  getTodayActivityStats,
} from '@/features/dashboard/queries'
import {
  DashboardCommandCenterClient,
  type DashboardCommandCenterProps,
} from '@/features/dashboard/DashboardCommandCenterClient'
import { getCurrentUserAccessProfile } from '@/lib/access/accessControl'

const DASHBOARD_WORKSPACES = ['leads', 'followups', 'insurance', 'rto', 'payments', 'loans', 'birthdays', 'anniversaries'] as const
type DashboardWorkspace = typeof DASHBOARD_WORKSPACES[number]

function isDashboardWorkspace(value: string | undefined): value is DashboardWorkspace {
  return !!value && DASHBOARD_WORKSPACES.includes(value as DashboardWorkspace)
}

function hasAny(granted: Set<string>, names: string[]) {
  return names.some(name => granted.has(name))
}

function serializeDashboardData(data: DashboardCommandCenterProps): DashboardCommandCenterProps {
  return JSON.parse(JSON.stringify(data)) as DashboardCommandCenterProps
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ workspace?: string }>
}) {
  const sp = await searchParams
  const initialWorkspace = isDashboardWorkspace(sp?.workspace) ? sp.workspace : 'leads'
  const [session, profile] = await Promise.all([auth(), getCurrentUserAccessProfile()])
  const granted = new Set(profile?.grantedFunctionNames ?? [])
  const permissions = {
    canInventory: granted.has('Inventory_Management'),
    canInquiry: granted.has('Inquiry_Management'),
    canFollowup: hasAny(granted, ['Followup_Management', 'FollowUp_Management']),
    canInsurance: granted.has('Insurance_Management'),
    canLoan: granted.has('Loan_Management'),
    canRto: hasAny(granted, ['RTO_Management', 'RTO_Agent_Management']),
  }

  const [
    stats,
    todayStats,
    leadSources,
    leadLocationBreakdowns,
    leadRegionBreakdowns,
    followups,
    leadDetails,
    reminders,
    pendingPolicies,
    expiryRenewalPolicies,
    assignedExpiryRenewalPolicies,
    rtoPending,
    pendingPayments,
  ] = await Promise.all([
    getDashboardStats({
      includeInventory: permissions.canInventory,
      includeInquiry: permissions.canInquiry,
      includeFollowup: permissions.canFollowup,
      includeLoan: permissions.canLoan,
      includeInsurance: permissions.canInsurance,
      includeRto: permissions.canRto,
    }),
    getTodayActivityStats({
      includeInventory: permissions.canInventory,
      includeFollowup: permissions.canFollowup,
      includeLoan: permissions.canLoan,
      includeInsurance: permissions.canInsurance,
      includeRto: permissions.canRto,
    }),
    permissions.canInquiry ? getLeadSourceBreakdown() : Promise.resolve([]),
    permissions.canInquiry ? getLeadLocationBreakdowns() : Promise.resolve({ month: [], quarter: [], year: [] }),
    permissions.canInquiry ? getLeadRegionBreakdowns() : Promise.resolve({ month: [], quarter: [], year: [] }),
    permissions.canFollowup ? getPendingFollowups(null) : Promise.resolve([]),
    profile && permissions.canFollowup ? getLegacyLeadDetails({ userId: profile.userId, roleId: profile.roleId }) : Promise.resolve([]),
    getBirthdayAnniversaryReminders(),
    permissions.canInsurance ? getPendingInsurancePolicies() : Promise.resolve([]),
    permissions.canInsurance ? getExpiryRenewalPolicies() : Promise.resolve([]),
    profile ? getAssignedExpiryRenewalPolicies(profile.userId) : Promise.resolve([]),
    permissions.canRto ? getRtoTransferPendingRcPending() : Promise.resolve([]),
    getPendingPayments({ includeRto: permissions.canRto, includeLoan: permissions.canLoan, includeInsurance: permissions.canInsurance }),
  ])

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const firstName = (profile?.displayName || profile?.userName || session?.user?.name || 'there').split(' ')[0]

  return (
    <DashboardCommandCenterClient
      {...serializeDashboardData({
        firstName,
        todayLabel,
        initialWorkspace,
        permissions,
        stats,
        todayStats,
        leadSources,
        leadLocationBreakdowns,
        leadRegionBreakdowns,
        followups,
        leadDetails,
        reminders,
        pendingPolicies,
        expiryRenewalPolicies,
        assignedExpiryRenewalPolicies,
        rtoPending,
        pendingPayments,
      })}
    />
  )
}
