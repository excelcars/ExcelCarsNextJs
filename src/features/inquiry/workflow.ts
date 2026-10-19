export const INQUIRY_INVENTORY_WORKFLOW_OPTIONS = ['shortlisted', 'visited', 'booked', 'rejected'] as const

export type InquiryInventoryWorkflowType = (typeof INQUIRY_INVENTORY_WORKFLOW_OPTIONS)[number]

export const INQUIRY_INVENTORY_WORKFLOW_LABELS: Record<string, string> = {
  matched: 'Matched',
  emailed: 'Emailed',
  shortlisted: 'Shortlisted',
  visited: 'Visited',
  booked: 'Booked',
  rejected: 'Rejected',
}

export function formatInquiryInventoryWorkflowLabel(linkType: string | null | undefined) {
  if (!linkType) return 'Not set'
  return INQUIRY_INVENTORY_WORKFLOW_LABELS[linkType.toLowerCase()] ?? linkType
}
