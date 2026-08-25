'use server'

import { prisma } from '@/lib/db/prisma'

export interface QuickPartnerInput {
  partnerType: string
  name: string
  mobile: string
  email: string
}

export interface QuickPartnerResult {
  success: boolean
  error?: string
  partnerId?: number
}

export async function quickCreatePartner(input: QuickPartnerInput): Promise<QuickPartnerResult> {
  if (!input.name.trim()) {
    return { success: false, error: 'Name is required.' }
  }
  if (!input.mobile.trim() && !input.email.trim()) {
    return { success: false, error: 'Enter mobile or email.' }
  }

  try {
    const partner = await prisma.partnerMaster.create({
      data: {
        partnerType: input.partnerType,
        name: input.name.trim(),
        mobile: input.mobile || null,
        email: input.email || null,
      },
    })
    return { success: true, partnerId: partner.partnerId }
  } catch {
    return { success: false, error: 'Could not create partner.' }
  }
}
