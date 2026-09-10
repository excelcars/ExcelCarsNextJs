import { isValidEmail, isValidPhone, isValidYear } from '../../lib/validation.ts'

export interface ChecklistValidationInput {
  make: string
  model: string
  variant: string
  colour: string
  registrationNo: string
  year: number | null
  fuelType: string
  customerId: number | null
  customerNameLegacy: string
  customerMobileLegacy: string
  customerEmailLegacy: string
  docs: Array<{
    documentName: string
    applicable: string
    received: string
    originalCopy: string
  }>
}

const APPLICABILITY_VALUES = new Set(['Yes', 'No', 'Applicable', 'Not Applicable'])
const YES_NO_VALUES = new Set(['Yes', 'No'])
const ORIGINAL_COPY_VALUES = new Set(['Original', 'Copy'])

export function validateChecklistInput(input: ChecklistValidationInput): string | null {
  if (!input.registrationNo.trim()) return 'Registration number is required.'
  if (!input.make.trim()) return 'Vehicle make is required.'
  if (!input.model.trim()) return 'Vehicle model is required.'
  if (!input.variant.trim()) return 'Vehicle variant is required.'
  if (!input.colour.trim()) return 'Vehicle colour is required.'
  if (input.year === null || input.year === undefined) return 'Vehicle year is required.'
  if (!isValidYear(input.year)) return 'Enter a valid vehicle year.'
  if (!input.fuelType.trim()) return 'Vehicle fuel type is required.'
  if (!input.customerId && !input.customerNameLegacy.trim()) return 'Select a customer or provide a customer name.'
  if (!isValidPhone(input.customerMobileLegacy)) return 'Enter a valid customer mobile number.'
  if (!isValidEmail(input.customerEmailLegacy)) return 'Enter a valid customer email address.'

  const docs = input.docs.filter(doc => doc.documentName.trim())
  if (docs.length === 0) return 'Add at least one document.'

  for (const doc of docs) {
    if (!APPLICABILITY_VALUES.has(doc.applicable)) return `Select a valid applicability value for ${doc.documentName.trim()}.`
    if (!YES_NO_VALUES.has(doc.received)) return `Select a valid received value for ${doc.documentName.trim()}.`
    if (!ORIGINAL_COPY_VALUES.has(doc.originalCopy)) return `Select Original or Copy for ${doc.documentName.trim()}.`
  }

  return null
}
