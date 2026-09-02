export interface AppAccessDefinition {
  group: 'Configuration' | 'Operations' | 'Reports'
  label: string
  functionName: string
  route: string
  description?: string
  grantsRouteAccess?: boolean
}

export const USER_ACCESS_FUNCTION = 'User_Access_Management'
export const ROLE_ACCESS_FUNCTION = 'Role_Access_Management'
export const CUSTOMER_WRITE_FUNCTION = 'Customer_Management_Write'
export const FEEDBACK_FUNCTION = 'Customer_Feedback_Management'
export const LEGACY_FEEDBACK_FUNCTION = 'Feedback_Management'
export const INVENTORY_FUNCTION = 'Inventory_Management'

export const APP_ACCESS_CATALOG: AppAccessDefinition[] = [
  { group: 'Configuration', label: 'Role Access', functionName: ROLE_ACCESS_FUNCTION, route: '/config/role-access', description: 'Manage which roles can access each module.' },
  { group: 'Configuration', label: 'User Access', functionName: USER_ACCESS_FUNCTION, route: '/config/user-access', description: 'Manage user accounts and assign roles.' },
  { group: 'Configuration', label: 'Dealers', functionName: 'Dealer_Management', route: '/config/dealers', description: 'Manage dealer master records.' },
  { group: 'Configuration', label: 'Customers', functionName: 'Customer_Management', route: '/config/customers', description: 'View and search customer records.' },
  { group: 'Configuration', label: 'Customer Management Write', functionName: CUSTOMER_WRITE_FUNCTION, route: '/config/customers', description: 'Add, edit, delete, and quick-create customer records. Requires Customers view access.', grantsRouteAccess: false },
  { group: 'Configuration', label: 'Agents', functionName: 'Agent_Management', route: '/config/agents', description: 'Manage reusable Insurance and RTO agent master records.' },
  { group: 'Configuration', label: 'Vehicle Masters', functionName: 'Vehicle_Master_Management', route: '/config/catalog', description: 'Manage Make, Model, and Variant master records.' },
  { group: 'Configuration', label: 'Feedback', functionName: FEEDBACK_FUNCTION, route: '/config/feedback', description: 'Manage customer feedback responses.' },
  { group: 'Configuration', label: 'Email Templates', functionName: 'Message_Template_Management', route: '/config/sms-email', description: 'Manage email templates.' },

  { group: 'Operations', label: 'Inventory', functionName: INVENTORY_FUNCTION, route: '/inventory', description: 'Manage inventory records.' },
  { group: 'Operations', label: 'Checklist / Docs', functionName: 'Checklist_Management', route: '/checklist', description: 'Manage vehicle checklist and document records.' },
  { group: 'Operations', label: 'Inquiries', functionName: 'Inquiry_Management', route: '/inquiry', description: 'Manage customer inquiries.' },
  { group: 'Operations', label: 'Loan Management', functionName: 'Loan_Management', route: '/loan', description: 'Manage loan referrals and payments.' },
  { group: 'Operations', label: 'Insurance', functionName: 'Insurance_Management', route: '/insurance', description: 'Manage insurance referrals and payouts.' },
  { group: 'Operations', label: 'RTO Management', functionName: 'RTO_Management', route: '/rto', description: 'Manage RTO transfer and payment records.' },
  { group: 'Operations', label: 'Follow-up', functionName: 'Followup_Management', route: '/followup', description: 'Manage follow-up queue activity.' },
  { group: 'Operations', label: 'DSA Management', functionName: 'DSA_Management', route: '/dsa', description: 'Manage DSA payout records.' },

  { group: 'Reports', label: 'Stock Report', functionName: 'Stock_Report', route: '/reports/stock', description: 'View stock report.' },
  { group: 'Reports', label: 'Outstanding Payments', functionName: 'Outstanding_Payments_Report', route: '/reports/outstanding', description: 'View outstanding payments report.' },
  { group: 'Reports', label: 'Stock Tracking', functionName: 'Stock_Tracking_Report', route: '/reports/tracking', description: 'View stock tracking report.' },
  { group: 'Reports', label: "Today's Activity", functionName: 'Today_Activity_Report', route: '/reports/today', description: 'View today activity report.' },
  { group: 'Reports', label: 'Exception Log', functionName: 'Exception_Log_Report', route: '/reports/exception', description: 'View exception report.' },
]

export const APP_ACCESS_FUNCTION_NAMES = new Set(APP_ACCESS_CATALOG.map(item => item.functionName))

export function getAccessDefinition(functionName: string) {
  return APP_ACCESS_CATALOG.find(item => item.functionName === functionName) ?? null
}

export function getAccessDefinitionByRoute(route: string) {
  return APP_ACCESS_CATALOG.find(item => item.route === route && item.grantsRouteAccess !== false) ?? null
}

export function getAllowedFunctionNamesForRoute(route: string) {
  if (route === '/config/feedback') return [FEEDBACK_FUNCTION, LEGACY_FEEDBACK_FUNCTION]
  if (route === '/config/role-access') return [ROLE_ACCESS_FUNCTION, USER_ACCESS_FUNCTION]
  if (route === '/config/role-access/history') return [ROLE_ACCESS_FUNCTION, USER_ACCESS_FUNCTION]
  const match = getAccessDefinitionByRoute(route)
  return match ? [match.functionName] : []
}
