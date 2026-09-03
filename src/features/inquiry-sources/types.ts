export interface InquirySourceFormInput {
  code: string
  displayName: string
  category: string
  requiresDetail: boolean
  isActive: boolean
  reportingSort: number
}

export interface InquirySourceMasterRow extends InquirySourceFormInput {
  sourceId: number
  inquiryCount: number
}

export interface InquirySourceActionResult {
  success: boolean
  error?: string
}
