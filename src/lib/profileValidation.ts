export const PROFILE_FIELD_LIMITS = {
  firstName: 50,
  lastName: 50,
  gender: 1,
  mobile: 10,
  phone: 10,
  address: 200,
  city: 50,
  state: 50,
  pincode: 6,
  password: 20,
} as const

export const ACCOUNT_FIELD_LIMITS = {
  email: 100,
  username: 50,
} as const

export const PASSWORD_POLICY_MESSAGE =
  'Password must be 8 to 20 characters and include uppercase, lowercase, a number, and a special character.'

export function passwordPolicyError(password: string): string | null {
  if (password.length < 8 || password.length > PROFILE_FIELD_LIMITS.password) return PASSWORD_POLICY_MESSAGE
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return PASSWORD_POLICY_MESSAGE
  }
  return null
}

export function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isWithinLimit(value: string, limit: number): boolean {
  return value.length <= limit
}
