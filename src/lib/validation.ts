export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return true // empty is handled by required check
  const trimmed = email.trim()
  if (trimmed === '') return true
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(trimmed)
}

export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return true // empty is handled by required check
  const trimmed = phone.trim()
  if (trimmed === '') return true
  const regex = /^\d{10}$/
  return regex.test(trimmed)
}

export function isValidYear(year: number | string | null | undefined): boolean {
  if (year === null || year === undefined || year === '') return true
  const val = Number(year)
  if (Number.isNaN(val)) return false
  const currentYear = new Date().getFullYear()
  return val >= 1900 && val <= currentYear + 1
}

export function isValidInventoryOwnerMobile(phone: string | null | undefined): boolean {
  if (!phone) return true
  const trimmed = phone.trim()
  return trimmed === '' || /^\d{1,11}$/.test(trimmed)
}

export function normalizeRegistrationNo(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, '').toUpperCase()
}

export interface InventoryValidationInput {
  fkVariantId: number | null
  registrationNo: string
  colour: string
  year: number | null
  fuelType: string
  isCarRegistered: boolean | null
  tax: string
  kmsDriven: number | null
  insuranceType: string
  price: number | null
  status: string
  ownedType: string
  ownedBy: string
  mobileNoOwnedBy: string
  emailIdOwnedBy: string
  noOfOwners: number | null
  customerName: string
}

export function validateInventoryInput(input: InventoryValidationInput): string | null {
  if (!input.fkVariantId) return 'Variant is required.'
  if (!input.registrationNo.trim()) return 'Registration number is required.'
  if (!input.colour.trim()) return 'Colour is required.'
  if (!input.fuelType.trim()) return 'Fuel type is required.'
  if (!input.status.trim()) return 'Status is required.'
  if (!input.ownedType.trim()) return 'Owner type is required.'
  if (!['Excel Cars', 'Dealer', 'Individual'].includes(input.ownedType.trim())) return 'Select a valid owner type.'
  if (!input.ownedBy.trim()) return 'Owner name is required.'
  if (input.isCarRegistered === true && !input.tax.trim()) return 'Tax type is required for registered vehicles.'
  if (input.isCarRegistered === true && input.kmsDriven === null) return 'Kilometres driven is required for registered vehicles.'
  if (input.isCarRegistered === true && !input.insuranceType.trim()) return 'Insurance type is required for registered vehicles.'
  if (input.year === null || input.year === undefined) return 'Year is required.'
  if (!isValidYear(input.year)) return 'Enter a valid year.'
  if (input.kmsDriven !== null && (!Number.isFinite(input.kmsDriven) || input.kmsDriven < 0)) {
    return 'Kilometres driven must be zero or greater.'
  }
  if (input.price === null || !Number.isFinite(input.price) || input.price <= 0) {
    return 'Price must be greater than zero.'
  }
  if (input.noOfOwners === null || !Number.isInteger(input.noOfOwners) || input.noOfOwners < 1) {
    return 'Number of owners must be at least one.'
  }
  if (!isValidInventoryOwnerMobile(input.mobileNoOwnedBy)) return 'Owner mobile must contain only numbers and be at most 11 digits.'
  if (!isValidEmail(input.emailIdOwnedBy)) return 'Enter a valid owner email address.'
  if (input.status.trim().toLowerCase() === 'sold' && !input.customerName.trim()) {
    return 'Customer name is required for Sold inventory.'
  }
  return null
}
