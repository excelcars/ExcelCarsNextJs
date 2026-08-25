'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'

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
  if (!input.custName.trim()) {
    return { success: false, error: 'Customer name is required.' }
  }
  if (!input.custMobile.trim() && !input.custEmail.trim()) {
    return { success: false, error: 'Enter mobile or email.' }
  }

  const session = await auth()
  const userId = session?.user?.id ? Number(session.user.id) : null
  if (!userId) {
    return { success: false, error: 'Not authenticated.' }
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        custName: input.custName.trim(),
        custMobile: input.custMobile || null,
        custEmail: input.custEmail || null,
        type: 'Individual',
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
