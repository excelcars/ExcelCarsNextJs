/** Keep the original Website vehicle request visible before a catalog mapping is chosen. */
export function websiteVehicleRequest(row: { website: string | null; sourceDetail: string | null; remark: string | null }) {
  if (!['Excel Cars Mumbai', 'Excel Cars Dealer'].includes(row.website ?? '') || !row.sourceDetail?.startsWith('Partner lead ID:')) return ''
  return row.remark?.match(/^Vehicle: (.+)$/m)?.[1].trim() ?? ''
}
