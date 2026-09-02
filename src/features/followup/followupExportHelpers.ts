export function csvValue(value: string | number | boolean | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

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
