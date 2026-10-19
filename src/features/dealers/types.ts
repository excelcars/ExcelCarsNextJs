import type { DealerFormInput } from './actions'

export interface DealerRow {
  dealerId: number
  dealerName: string | null
  dealerMobileNo: string | null
  dealerMobileNo_2: string | null
  dealerEmail: string | null
  dealerAddress: string | null
  dealerCompanyName: string | null
  dealerWebsite: string | null
}

export type DealerFieldErrors = Partial<Record<keyof DealerFormInput, string>>
