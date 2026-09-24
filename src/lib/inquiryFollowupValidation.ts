import { isValidEmail, isValidPhone, isValidYear } from './validation.ts'

type ValidationResult = {
  fieldErrors: Record<string, boolean>
  error: string | null
}

type InquiryCarLike = {
  carYear: number | null
  noOfOwners?: number | null
}

type InquiryFormLike = {
  customerId: number | null
  customerNameLegacy: string
  mobileno: string
  email: string
  website: string
  sourceCode: string
  sourceDetail: string
  budgetOfCustomer: number | null
  dateOfInquiry: string
  visitedDateOfCustomer: string
  classification: string
  status: string
  subStatus: string
  followUpDate: string
  remark: string
  inquiryCars: InquiryCarLike[]
}

type FollowupLogLike = {
  contactOutcome: string
  status: string
  subStatus: string
  useOtherSubStatus?: boolean
  otherSubStatus?: string
  classification: string
  comments: string
  nextFollowUpDate: string
}

export const FOLLOWUP_CONTACT_OUTCOMES = [
  'spoke_to_customer',
  'no_answer',
  'asked_to_call_back',
  'number_not_working',
] as const

export const FOLLOWUP_ALLOWED_STATUSES = ['Open', 'FollowUp', 'Closed'] as const

export const FOLLOWUP_ALLOWED_CLASSIFICATIONS = ['Hot', 'Warm', 'Cold'] as const

export const FOLLOWUP_LEGACY_SUB_STATUS_OPTIONS = [
  'Ringing',
  'Not Intrested',
  'Busy',
  'Desired Car Not In Stock',
  'Not connected',
  'Already Bought Car',
  'Visited',
  'Gave Details',
  'Sold Car',
  'Asked to call back',
  'Negotiation',
  'Visit scheduled',
  'Deal done',
  'Lost',
  'Unreachable',
] as const

function buildValidationResult(fieldErrors: Record<string, boolean>, error: string | null): ValidationResult {
  return { fieldErrors, error }
}

export function isFollowupStatus(value: string | null | undefined) {
  const normalized = (value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '')
  return normalized === 'followup' || normalized === 'follow'
}

export function isVisitedSubStatus(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase() === 'visited'
}

export function resolveFollowupSubStatusInput(input: Pick<FollowupLogLike, 'subStatus' | 'useOtherSubStatus' | 'otherSubStatus'>) {
  return (input.useOtherSubStatus ? input.otherSubStatus : input.subStatus)?.trim() ?? ''
}

export function validateInquiryFormInput(input: InquiryFormLike): ValidationResult {
  const fieldErrors: Record<string, boolean> = {}

  if (!input.customerId && !input.customerNameLegacy?.trim()) {
    fieldErrors.customer = true
  }
  if (!input.mobileno?.trim() || !isValidPhone(input.mobileno)) {
    fieldErrors.mobileno = true
  }
  if (input.email && !isValidEmail(input.email)) {
    fieldErrors.email = true
  }
  if (!input.sourceCode?.trim()) {
    fieldErrors.website = true
  }
  if (input.budgetOfCustomer !== null && input.budgetOfCustomer <= 0) {
    fieldErrors.budgetOfCustomer = true
  }
  if (input.inquiryCars.length === 0) {
    fieldErrors.inquiryCars = true
  }

  const invalidCarIndex = input.inquiryCars.findIndex(car => car.carYear === null || !isValidYear(car.carYear))
  if (invalidCarIndex >= 0) {
    fieldErrors[`carYear-${invalidCarIndex}`] = true
  }
  const invalidOwnerIndex = input.inquiryCars.findIndex(car => car.noOfOwners != null && (!Number.isInteger(car.noOfOwners) || car.noOfOwners < 0))
  if (invalidOwnerIndex >= 0) {
    fieldErrors[`noOfOwners-${invalidOwnerIndex}`] = true
  }

  const status = input.status.trim()
  const subStatus = input.subStatus.trim().toLowerCase()
  const inquiryDate = input.dateOfInquiry.trim()
  const followUpDate = input.followUpDate.trim()
  const visitedDate = input.visitedDateOfCustomer.trim()

  if (isFollowupStatus(status) && !followUpDate) {
    fieldErrors.followUpDate = true
  }
  if (isVisitedSubStatus(subStatus) && !visitedDate) {
    fieldErrors.visitedDateOfCustomer = true
  }
  if (inquiryDate && followUpDate && followUpDate < inquiryDate) {
    fieldErrors.followUpDate = true
    fieldErrors.dateOfInquiry = true
  }
  if (inquiryDate && visitedDate && visitedDate < inquiryDate) {
    fieldErrors.visitedDateOfCustomer = true
    fieldErrors.dateOfInquiry = true
  }

  if (Object.keys(fieldErrors).length === 0) {
    return buildValidationResult(fieldErrors, null)
  }

  if (fieldErrors.inquiryCars) {
    return buildValidationResult(fieldErrors, 'Add at least one car of interest before saving the inquiry.')
  }
  if (fieldErrors.followUpDate && isFollowupStatus(status) && !followUpDate) {
    return buildValidationResult(fieldErrors, 'Follow-up date is required when Follow is selected.')
  }
  if (fieldErrors.visitedDateOfCustomer && isVisitedSubStatus(subStatus) && !visitedDate) {
    return buildValidationResult(fieldErrors, 'Visited date is required when sub-status is Visited.')
  }
  if (fieldErrors.followUpDate && fieldErrors.dateOfInquiry && inquiryDate && followUpDate && followUpDate < inquiryDate) {
    return buildValidationResult(fieldErrors, 'Follow-up date cannot be before inquiry date.')
  }
  if (fieldErrors.visitedDateOfCustomer && fieldErrors.dateOfInquiry && inquiryDate && visitedDate && visitedDate < inquiryDate) {
    return buildValidationResult(fieldErrors, 'Visited date cannot be before inquiry date.')
  }

  return buildValidationResult(fieldErrors, 'Please fix the highlighted inquiry fields before saving.')
}

export function validateFollowupLogInput(input: FollowupLogLike, today = new Date().toISOString().slice(0, 10)): ValidationResult {
  const fieldErrors: Record<string, boolean> = {}
  const contactOutcome = input.contactOutcome.trim()
  const status = input.status.trim()
  const classification = input.classification.trim()
  const subStatus = resolveFollowupSubStatusInput(input)
  const nextFollowUpDate = input.nextFollowUpDate.trim()

  if (!contactOutcome || !FOLLOWUP_CONTACT_OUTCOMES.includes(contactOutcome as (typeof FOLLOWUP_CONTACT_OUTCOMES)[number])) {
    fieldErrors.contactOutcome = true
  }
  if (!status || !FOLLOWUP_ALLOWED_STATUSES.includes(status as (typeof FOLLOWUP_ALLOWED_STATUSES)[number])) {
    fieldErrors.status = true
  }
  if (!classification || !FOLLOWUP_ALLOWED_CLASSIFICATIONS.includes(classification as (typeof FOLLOWUP_ALLOWED_CLASSIFICATIONS)[number])) {
    fieldErrors.classification = true
  }
  if (input.useOtherSubStatus && !subStatus) {
    fieldErrors.otherSubStatus = true
  }
  if (!input.comments?.trim()) {
    fieldErrors.comments = true
  }
  if (isFollowupStatus(status) && !nextFollowUpDate) {
    fieldErrors.nextFollowUpDate = true
  }
  if (isFollowupStatus(status) && nextFollowUpDate && nextFollowUpDate < today) {
    fieldErrors.nextFollowUpDate = true
  }

  if (Object.keys(fieldErrors).length === 0) {
    return buildValidationResult(fieldErrors, null)
  }

  if (fieldErrors.status) {
    return buildValidationResult(fieldErrors, 'Status is required.')
  }
  if (fieldErrors.classification) {
    return buildValidationResult(fieldErrors, 'Classification is required.')
  }
  if (fieldErrors.contactOutcome) {
    return buildValidationResult(fieldErrors, 'Select whether the customer was reached before saving follow-up.')
  }
  if (fieldErrors.otherSubStatus) {
    return buildValidationResult(fieldErrors, 'Enter the custom sub-status when OTHER is selected.')
  }
  if (fieldErrors.comments) {
    return buildValidationResult(fieldErrors, 'Remark is required before saving follow-up.')
  }
  if (fieldErrors.nextFollowUpDate && isFollowupStatus(status) && !nextFollowUpDate) {
    return buildValidationResult(fieldErrors, 'Next follow-up date is required unless the inquiry is being closed.')
  }
  if (fieldErrors.nextFollowUpDate && isFollowupStatus(status) && nextFollowUpDate < today) {
    return buildValidationResult(fieldErrors, 'Next follow-up date cannot be before today.')
  }

  return buildValidationResult(fieldErrors, 'Please fix the highlighted follow-up fields before saving.')
}
