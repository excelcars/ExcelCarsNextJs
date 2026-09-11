export interface CustomerFormInput {
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

export interface CustomerRow {
  custId: number
  type: string | null
  custName: string
  custAddress: string | null
  custMobile: string | null
  mobile_2: string | null
  custEmail: string | null
  custDob: Date | string | null
  custAnniversaryDt: Date | string | null
  comments: string | null
  companyName: string | null
}

export type CustomerFieldErrors = Partial<Record<keyof CustomerFormInput, string>>

export function emptyCustomerForm(): CustomerFormInput {
  return { type: 'Customer', custName: '', custAddress: '', custMobile: '', mobile_2: '', custEmail: '', custDob: '', custAnniversaryDt: '', comments: '', companyName: '' }
}

export function formatCustomerDate(value: Date | string | null) {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
}

export function parseCustomerDisplayDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const [, day, month, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day) ? date : null
}

export function formatCustomerDisplayDate(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}
