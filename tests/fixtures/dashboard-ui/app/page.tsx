// Isolated UI fixture: real dashboard components, synthetic data, no database,
// authentication bypass or application route. Run Next with this directory.
import { DashboardCommandCenterClient, type DashboardCommandCenterProps } from '../../../../src/features/dashboard/DashboardCommandCenterClient'
import { LayoutMeasurements } from './LayoutMeasurements'

const breakdowns = {
  month: [{ name: 'Mumbai', value: 27 }, { name: 'Pune', value: 12 }],
  quarter: [{ name: 'Mumbai', value: 85 }, { name: 'Pune', value: 41 }, { name: 'Thane', value: 19 }],
  year: [{ name: 'Mumbai', value: 210 }, { name: 'Pune', value: 104 }, { name: 'Thane', value: 59 }],
}
const props: DashboardCommandCenterProps = {
  firstName: 'UI Test', todayLabel: 'Dashboard layout check',
  permissions: { canInventory: true, canInquiry: true, canFollowup: true, canInsurance: true, canLoan: true, canRto: true },
  stats: { totalInventory: 20, availableStock: 12, soldThisMonth: 2, totalInquiries: 53501, todayInquiries: 3, hotLeads: 4, pendingFollowups: 1, overdueFollowups: 0, activeLoans: 0, activeInsurance: 0, pendingRTO: 0 },
  todayStats: { deliveriesToday: 0, followupsToday: 1, paymentsReceivedToday: 0 },
  leadSources: ['Quikr', 'Justdial', 'OLX', 'CarTrade', 'Gaadi', 'Other'].map((name, index) => ({ name, sourceCode: name, value: 11887 - index * 1400 })),
  leadRegionBreakdowns: { all: breakdowns, bySource: { Quikr: breakdowns } },
  leadDetails: [{ label: 'All Leads', total: 53501, own: 11, other: 53490, href: '#all', ownHref: '#own' }],
  followups: [{ id: 1, customerName: 'Sample customer', mobile: '0000000000', followupDate: '2026-10-22', classification: 'Warm', status: 'FollowUp' }],
  reminders: [
    { id: '1', name: 'Sample reminder', mobile: null, email: 'sample-long-email-address@example.test', type: 'Anniversary' },
    { id: '2', name: 'Sample birthday', mobile: '0000000000', email: null, type: 'Birth Day' },
  ],
  pendingPolicies: [{ insuranceMainId: 1, customerNameLegacy: 'Sample insurance customer', customerMobileLegacy: '0000000000', carRegistrationNo: 'MH00AB1234', policyStatus: 'Pending', agentNameLegacy: 'Sample agent', agentMobileNoLegacy: '0000000000', customer: null, partnerMaster: null }],
  expiryRenewalPolicies: [{ insuranceMainId: 2, customerNameLegacy: 'Sample renewal customer', customerMobileLegacy: '0000000000', carRegistrationNo: 'MH00CD5678', agentNameLegacy: 'Sample agent', agentMobileNoLegacy: '0000000000', expiryDate: '2026-11-20', renewalDate: '2026-11-19', customer: null, partnerMaster: null }],
  assignedExpiryRenewalPolicies: [],
  rtoPending: [{ rtoAgentMainId: 1, customerNameLegacy: 'Sample RTO customer', customerMobLegacy: '0000000000', carRegistrationNo: 'MH00AB1234', rcStatus: 'Pending', transferStatus: 'Pending', agentNameLegacy: 'Sample agent', agentMobileNoLegacy: '0000000000', customer: null, partnerMaster: null }],
  pendingPayments: ['Insurance', 'Loan'].map((type, index) => ({ id: String(index), type, registrationNo: 'MH00AB1234', href: `/${type.toLowerCase()}`, customerName: 'Sample payment customer', customerMobile: '0000000000', agentName: 'Sample agent', agentMobile: '0000000000', followupDate: '2026-11-10', actual: 100000, received: 25000, balance: 75000 })),
}

export default function Page() {
  return <><DashboardCommandCenterClient {...props} /><LayoutMeasurements /></>
}
