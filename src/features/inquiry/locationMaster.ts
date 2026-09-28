export const INQUIRY_LOCATION_REGIONS = ['Mumbai', 'Outside Mumbai', 'Outside Maharashtra'] as const

export type InquiryLocationRegion = (typeof INQUIRY_LOCATION_REGIONS)[number]

export type InquiryLocationOption = {
  locationId: number
  displayName: string
  region: string
  isActive: boolean
  reportingSort: number
}

export const INQUIRY_LOCATION_MASTER_SEED: Array<Omit<InquiryLocationOption, 'locationId'>> = [
  { displayName: 'Mumbai', region: 'Mumbai', isActive: true, reportingSort: 1 },
  { displayName: 'Navi Mumbai', region: 'Outside Mumbai', isActive: true, reportingSort: 2 },
  { displayName: 'Thane', region: 'Outside Mumbai', isActive: true, reportingSort: 3 },
  { displayName: 'Pune', region: 'Outside Mumbai', isActive: true, reportingSort: 4 },
  { displayName: 'Other Maharashtra', region: 'Outside Mumbai', isActive: true, reportingSort: 5 },
  { displayName: 'Outside Maharashtra', region: 'Outside Maharashtra', isActive: true, reportingSort: 6 },
]
