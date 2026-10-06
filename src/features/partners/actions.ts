'use server'

import { prisma } from '@/lib/db/prisma'
import { getAllowedFunctionNamesForRoute } from '@/lib/access/accessCatalog'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'

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

const QUICK_PARTNER_ALLOWED_ROUTES = [
  '/loan',
  '/insurance',
  '/rto',
] as const

export async function quickCreatePartner(input: QuickPartnerInput): Promise<QuickPartnerResult> {
  if (!input.name.trim()) {
    return { success: false, error: 'Name is required.' }
  }
  if (!input.mobile.trim() && !input.email.trim()) {
    return { success: false, error: 'Enter mobile or email.' }
  }

  const allowedFunctionNames = [...new Set(
    QUICK_PARTNER_ALLOWED_ROUTES.flatMap(route => getAllowedFunctionNamesForRoute(route)),
  )]
  const actor = await getAuthorizedActorForFunctions(allowedFunctionNames)
  const userId = actor?.userId ?? null
  if (!userId) return { success: false, error: 'Not authorized.' }

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
