import type { InquirySourceFormInput } from './types'

export function normalizeInquirySourceInput(input: InquirySourceFormInput): InquirySourceFormInput {
  return {
    code: input.code.trim().toUpperCase().replace(/\s+/g, '_'),
    displayName: input.displayName.trim(),
    category: input.category.trim(),
    requiresDetail: Boolean(input.requiresDetail),
    isActive: Boolean(input.isActive),
    reportingSort: Number(input.reportingSort),
  }
}

export function validateInquirySourceInput(input: InquirySourceFormInput): string | null {
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(input.code)) return 'Code must use uppercase letters, numbers, and underscores.'
  if (!input.displayName) return 'Source name is required.'
  if (input.displayName.length > 100) return 'Source name must be 100 characters or fewer.'
  if (!input.category) return 'Category is required.'
  if (input.category.length > 100) return 'Category must be 100 characters or fewer.'
  if (!Number.isInteger(input.reportingSort) || input.reportingSort < 1 || input.reportingSort > 9999) {
    return 'Reporting order must be a whole number from 1 to 9999.'
  }
  return null
}
