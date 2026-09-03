export interface CarMakeMaster { pkMakeId: number; make: string | null }
export interface CarModelMaster { pkModelId: number; model: string | null }
export interface CarVariantMaster { pkVariantId: number; variant: string | null }
export interface Dealer { dealerId: number; dealerName: string | null; dealerMobileNo: string | null; dealerEmail: string | null }
export interface CustomerOption { custId: number; custName: string; custAddress?: string | null; custMobile: string | null; custEmail: string | null }
export interface EmailProgressItem { inventoryId: number; label: string; status: 'pending' | 'sending' | 'sent' | 'failed'; error?: string }

export interface InventoryRow {
  inventoryId: number
  inventoryNumber: string | null
  sku: string | null
  registrationNo: string | null
  makeLegacy: string | null
  modelLegacy: string | null
  variantLegacy: string | null
  year: number | null
  month: string | null
  colour: string | null
  fuelType: string | null
  noOfOwners: number | null
  tax: string | null
  isCarRegistered: boolean | null
  kmsDriven: string | null
  insuranceType: string | null
  price: string | null
  status: string | null
  ownedType: string | null
  ownedBy: string | null
  mobileNoOwnedBy: string | null
  emailIdOwnedBy: string | null
  customerId: number | null
  customerName: string | null
  internalComments: string | null
  otherRemarks: string | null
  fkVariantId: number | null
  customer: CustomerOption | null
  _count: { inventoryPhotos: number }
  vehicleEmailLinks?: Array<{
    vehicleEmailLinkId: number
    recipientEmail: string
    recipientName: string | null
    emailSentAt: string | Date | null
    firstRequestedAt: string | Date | null
    firstHumanViewAt: string | Date | null
    lastRequestedAt: string | Date | null
    requestCount: number
    humanViewCount: number
    isActive: boolean
    interactionSummary?: {
      callClickCount: number
      whatsappClickCount: number
      emailClickCount: number
      firstInteractionAt: string | Date | null
      lastInteractionAt: string | Date | null
    }
  }>
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { pkMakeId: number; make: string | null } | null
    carModelMaster: { pkModelId: number; model: string | null } | null
  } | null
}

export interface InventoryPhoto {
  documentId: number
  path: string | null
  inventoryNumberLegacy: string | null
  isUploadedHere: boolean
  fileName: string
}

export interface UploadQueueItem {
  id: string
  file: File
  previewUrl: string
  status: 'queued' | 'uploading' | 'uploaded' | 'failed'
  error?: string
}

export interface InquiryOption {
  inquiryId: number
  inquiryNo: string | null
  customerId: number | null
  customerNameLegacy: string | null
  mobileno: string | null
  email: string | null
  classification: string | null
  status: string | null
  subStatus: string | null
  customer: CustomerOption | null
  inquiryCarDetails: Array<{
    fkVariantId: number | null
    year: number | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { make: string | null } | null
      carModelMaster: { model: string | null } | null
    } | null
  }>
}

export interface EmailRecipient {
  key: string
  recipientType: 'dealer' | 'customer'
  recipientId: number
  name: string
  email: string | null
  meta: string
}

export interface InventoryFilters {
  search: string
  status: string
  make: string
  model: string
  fuelType: string
  inventoryNumber: string
  sku: string
  registrationNo: string
  variant: string
  colour: string
  year: string
  month: string
  noOfOwners: string
  tax: string
  isCarRegistered: string
  kmsMin: string
  kmsMax: string
  insuranceType: string
  priceMin: string
  priceMax: string
  ownedType: string
  ownedBy: string
  mobileNoOwnedBy: string
  emailIdOwnedBy: string
  customerName: string
  linkedCustomer: string
  internalComments: string
  otherRemarks: string
}
