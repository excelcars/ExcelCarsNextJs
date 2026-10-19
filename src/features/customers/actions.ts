'use server'

import { prisma } from '@/lib/db/prisma'
import { CUSTOMER_WRITE_FUNCTION, INVENTORY_FUNCTION } from '@/lib/access/accessCatalog'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { normalizeCustomerName, validateCustomerInput } from './validation'

export interface QuickCustomerInput {
  custName: string
  custMobile: string
  custEmail: string
}

export interface QuickCustomerResult {
  success: boolean
  error?: string
  custId?: number
}

export async function quickCreateCustomer(input: QuickCustomerInput): Promise<QuickCustomerResult> {
  const validation = validateCustomerInput({
    type: 'Customer', custName: input.custName, custAddress: '', custMobile: input.custMobile,
    mobile_2: '', custEmail: input.custEmail, custDob: '', custAnniversaryDt: '', comments: '', companyName: '',
  })
  if (!validation.value) return { success: false, error: validation.error }
  const value = validation.value

  const actor = await getAuthorizedActorForFunctions([CUSTOMER_WRITE_FUNCTION, INVENTORY_FUNCTION])
  const userId = actor?.userId ?? null
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    const candidates = await prisma.customer.findMany({
      where: value.custMobile
        ? { custMobile: { equals: value.custMobile, mode: 'insensitive' } }
        : { custEmail: { equals: value.custEmail, mode: 'insensitive' } },
      select: { custName: true },
    })
    const normalizedName = normalizeCustomerName(value.custName).toLowerCase()
    if (candidates.some(customer => normalizeCustomerName(customer.custName).toLowerCase() === normalizedName)) {
      return { success: false, error: 'A customer with this name and primary contact already exists.' }
    }
    const customer = await prisma.customer.create({
      data: {
        custName: value.custName,
        custMobile: value.custMobile || null,
        custEmail: value.custEmail || null,
        type: value.type,
        createdDt: new Date(),
        updatedDt: new Date(),
        createdByUser: { connect: { userId } },
        updatedByUser: { connect: { userId } },
      },
    })
    return { success: true, custId: customer.custId }
  } catch {
    return { success: false, error: 'Could not create customer.' }
  }
}
