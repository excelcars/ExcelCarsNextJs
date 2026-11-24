/** Website leads retain free-text vehicle requests in remarks, without catalog mapping. */
export function websiteVehicleRequest(row: { website: string | null; sourceDetail: string | null; remark: string | null }) {
  if (!['Excel Cars Mumbai', 'Excel Cars Dealer'].includes(row.website ?? '') || !row.sourceDetail?.startsWith('Partner lead ID:')) return ''
  return row.remark?.match(/^Vehicle: (.+)$/m)?.[1].trim() ?? ''
}
