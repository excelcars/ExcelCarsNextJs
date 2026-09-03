export function csvValue(value: string | number | boolean | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export const FOLLOWUP_EXPORT_HEADERS = [
  'Inquiry ID', 'Inquiry_No', 'Date_of_Inquiry', 'WebSite', 'Source Detail',
  'Inquiry Made By', 'Inquiry Made By User ID', 'Linked_Customer_ID', 'Customer',
  'MobileNo', 'Email', 'Make', 'Model', 'Variant', 'Year', 'Budget_of_Customer',
  'Latest_Classification', 'Latest_Status', 'Latest_Sub_Status', 'Latest_Follow_Up_Date',
  'Visited_Date_of_Customer', 'Latest_Remark', 'Previous_Followup_Date',
  'Previous_Followup_Status', 'Previous_Followup_Sub_Status', 'Previous Comments',
  'Previous_Followup_Classification',
] as const

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function buildFollowupExportFileName(rowCount: number, status: string, classification: string) {
  const parts = ['followup']
  if (status && status !== 'All') parts.push(slugify(status))
  if (classification && classification !== 'All') parts.push(slugify(classification))
  if (parts.length === 1) parts.push(`${rowCount}-rows`)
  parts.push(new Date().toISOString().slice(0, 10))
  return `${parts.join('-')}.csv`
}
