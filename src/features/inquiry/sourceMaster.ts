export type InquirySourceOption = {
  code: string
  displayName: string
  category: string
  requiresDetail: boolean
  isActive: boolean
  reportingSort: number
}

// Codes are stable report keys; display names may be renamed without splitting history.
const inquirySourceMasterValues: Array<[string, string, string, boolean, number]> = [
  ['ASKME', 'AskMe', 'Directory', false, 31],
  ['AUTOPORTAL', 'Autoportal', 'Portal', false, 9],
  ['BIKEWALE', 'BikeWale', 'Portal', false, 11],
  ['BOOST_360', 'Boost 360', 'Marketing', false, 32],
  ['CARDEKHO', 'CarDekho', 'Portal', false, 3],
  ['CARDEKHO_MARKETPLACE', 'CarDekho Marketplace', 'Marketplace', false, 4],
  ['CARTRADE', 'CarTrade', 'Portal', false, 5],
  ['CARWALE', 'CarWale', 'Portal', false, 6],
  ['EMAIL', 'Email', 'Direct', false, 24],
  ['EXCEL_CARS_DEALER', 'Excel Cars Dealer', 'Owned Website', false, 28],
  ['EXCEL_CARS_MUMBAI', 'Excel Cars Mumbai', 'Owned Website', false, 27],
  ['EXPORTERS_INDIA', 'Exporters India', 'Portal', false, 16],
  ['FACEBOOK', 'Facebook', 'Social', false, 17],
  ['GAADI', 'Gaadi', 'Portal', false, 7],
  ['GAADIGURUS', 'GaadiGurus', 'Portal', false, 12],
  ['GOOGLE', 'Google', 'Search', false, 29],
  ['INDIAMART', 'IndiaMART', 'Marketplace', false, 20],
  ['INBOUND_CALL', 'Inbound Call', 'Direct', false, 22],
  ['INSTAGRAM', 'Instagram', 'Social', false, 18],
  ['JUSTDIAL', 'Justdial', 'Directory', false, 1],
  ['LELECARR', 'LeleCarr', 'Portal', false, 13],
  ['MOTOZITE', 'Motozite', 'Portal', false, 14],
  ['OLX', 'OLX', 'Marketplace', false, 2],
  ['OTHER', 'Other', 'Other', true, 34],
  ['QUIKR', 'Quikr', 'Marketplace', false, 8],
  ['REFERENCE', 'Reference', 'Referral', true, 26],
  ['SMS_MARKETING', 'SMS Marketing', 'Marketing', false, 33],
  ['SULEKHA', 'Sulekha', 'Directory', false, 10],
  ['TIMES_OF_INDIA', 'Times of India', 'Directory', false, 30],
  ['TRADEINDIA', 'TradeIndia', 'Marketplace', false, 21],
  ['UNKNOWN', 'Unknown', 'Unknown', false, 35],
  ['WALK_IN', 'Walk-in', 'Direct', false, 23],
  ['WHATSAPP', 'WhatsApp', 'Direct', false, 25],
  ['YOUTUBE', 'YouTube', 'Social', false, 19],
  ['ZIGWHEELS', 'ZigWheels', 'Portal', false, 15],
]

export const INQUIRY_SOURCE_MASTER_SEED: InquirySourceOption[] = inquirySourceMasterValues.map(([code, displayName, category, requiresDetail, reportingSort]) => ({
  code,
  displayName,
  category,
  requiresDetail,
  isActive: true,
  reportingSort,
}))
