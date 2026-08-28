export const CUSTOMER_TYPES = ['Contact', 'Customer'] as const
export const LEGACY_CUSTOMER_TYPES = ['Individual'] as const

export const CUSTOMER_FIELD_LIMITS = {
  type: 50,
  name: 150,
  address: 500,
  companyName: 150,
  comments: 1000,
  email: 254,
} as const

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DISPLAY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export interface CustomerValidationInput {
  type: string
  custName: string
  custAddress: string
  custMobile: string
  mobile_2: string
  custEmail: string
  custDob: string
  custAnniversaryDt: string
  comments: string
  companyName: string
}

export function normalizeCustomerName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeCustomerMobile(value: string) {
  return value.trim().replace(/[\s-]/g, '')
}

export function normalizeCustomerInput(input: CustomerValidationInput): CustomerValidationInput {
  return {
    type: input.type.trim(), custName: normalizeCustomerName(input.custName), custAddress: input.custAddress.trim(),
    custMobile: normalizeCustomerMobile(input.custMobile), mobile_2: normalizeCustomerMobile(input.mobile_2),
    custEmail: input.custEmail.trim().toLowerCase(), custDob: input.custDob.trim(),
    custAnniversaryDt: input.custAnniversaryDt.trim(), comments: input.comments.trim(), companyName: input.companyName.trim(),
  }
}

function parseDateOnly(value: string): Date | null {
  const displayMatch = DISPLAY_DATE_PATTERN.exec(value)
  const isoMatch = ISO_DATE_PATTERN.exec(value)
  const match = displayMatch ?? isoMatch
  if (!match) return null
  const [, first, second, third] = match
  const [day, month, year] = displayMatch ? [first, second, third] : [third, second, first]
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day) ? date : null
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function validateCustomerInput(input: CustomerValidationInput, { allowLegacyType = false }: { allowLegacyType?: boolean } = {}): { value?: CustomerValidationInput; error?: string; errorField?: keyof CustomerValidationInput } {
  const value = normalizeCustomerInput(input)
  // Widen the conditional list so `includes` accepts either the current or legacy type.
  const allowedTypes: readonly string[] = allowLegacyType ? [...CUSTOMER_TYPES, ...LEGACY_CUSTOMER_TYPES] : CUSTOMER_TYPES
  const fail = (error: string, errorField: keyof CustomerValidationInput) => ({ error, errorField })
  if (!allowedTypes.includes(value.type)) return fail('Select a valid customer type.', 'type')
  if (!value.custName) return fail('Name is required.', 'custName')
  if (value.custName.length > CUSTOMER_FIELD_LIMITS.name) return fail(`Name cannot exceed ${CUSTOMER_FIELD_LIMITS.name} characters.`, 'custName')
  if (value.type.length > CUSTOMER_FIELD_LIMITS.type) return fail(`Type cannot exceed ${CUSTOMER_FIELD_LIMITS.type} characters.`, 'type')
  if (value.custAddress.length > CUSTOMER_FIELD_LIMITS.address) return fail(`Address cannot exceed ${CUSTOMER_FIELD_LIMITS.address} characters.`, 'custAddress')
  if (value.companyName.length > CUSTOMER_FIELD_LIMITS.companyName) return fail(`Company name cannot exceed ${CUSTOMER_FIELD_LIMITS.companyName} characters.`, 'companyName')
  if (value.comments.length > CUSTOMER_FIELD_LIMITS.comments) return fail(`Comments cannot exceed ${CUSTOMER_FIELD_LIMITS.comments} characters.`, 'comments')
  if (value.custEmail.length > CUSTOMER_FIELD_LIMITS.email) return fail(`Email cannot exceed ${CUSTOMER_FIELD_LIMITS.email} characters.`, 'custEmail')
  if (!value.custMobile && !value.custEmail) return fail('Enter a primary mobile number or email address.', 'custMobile')
  if (value.custMobile && !/^\d{10}$/.test(value.custMobile)) return fail('Primary mobile must be exactly 10 digits.', 'custMobile')
  if (value.mobile_2 && !/^\d{10}$/.test(value.mobile_2)) return fail('Secondary mobile must be exactly 10 digits.', 'mobile_2')
  if (value.custMobile && value.mobile_2 && value.custMobile === value.mobile_2) return fail('Secondary mobile must be different from primary mobile.', 'mobile_2')
  if (value.custEmail && !EMAIL_PATTERN.test(value.custEmail)) return fail('Enter a valid email address.', 'custEmail')

  const dob = value.custDob ? parseDateOnly(value.custDob) : null
  const anniversary = value.custAnniversaryDt ? parseDateOnly(value.custAnniversaryDt) : null
  if (value.custDob && !dob) return fail('Use DD/MM/YYYY for date of birth.', 'custDob')
  if (value.custAnniversaryDt && !anniversary) return fail('Use DD/MM/YYYY for anniversary date.', 'custAnniversaryDt')
  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  if (dob && dob.getTime() > todayUtc) return fail('Date of birth cannot be in the future.', 'custDob')
  if (anniversary && anniversary.getTime() > todayUtc) return fail('Anniversary date cannot be in the future.', 'custAnniversaryDt')
  const minimumDob = new Date(todayUtc)
  minimumDob.setUTCFullYear(minimumDob.getUTCFullYear() - 18)
  if (dob && dob > minimumDob) return fail('Customer must be at least 18 years old.', 'custDob')
  if (dob && anniversary && anniversary < dob) return fail('Anniversary date cannot be earlier than date of birth.', 'custAnniversaryDt')
  if (dob) value.custDob = toIsoDate(dob)
  if (anniversary) value.custAnniversaryDt = toIsoDate(anniversary)
  return { value }
}
