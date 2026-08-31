import { isValidEmail, isValidPhone, isValidYear } from '@/lib/validation'

type ValidationResult = {
  fieldErrors: Record<string, boolean>
  error: string | null
}

type InquiryCarLike = {
  carYear: number | null
}

type InquiryFormLike = {
  customerId: number | null
  customerNameLegacy: string
  mobileno: string
  email: string
  website: string
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
  status: string
  subStatus: string
  classification: string
  comments: string
  nextFollowUpDate: string
}

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
  if (!input.website?.trim()) {
    fieldErrors.website = true
  }
  if (input.budgetOfCustomer !== null && input.budgetOfCustomer <= 0) {
    fieldErrors.budgetOfCustomer = true
  }
  if (input.inquiryCars.length === 0) {
    fieldErrors.inquiryCars = true
  }

  const invalidCarIndex = input.inquiryCars.findIndex(car => car.carYear !== null && !isValidYear(car.carYear))
  if (invalidCarIndex >= 0) {
    fieldErrors[`carYear-${invalidCarIndex}`] = true
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
  const status = input.status.trim()
  const nextFollowUpDate = input.nextFollowUpDate.trim()

  if (!status) {
    fieldErrors.status = true
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
