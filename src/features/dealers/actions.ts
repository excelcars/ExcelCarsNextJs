'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'

export interface DealerFormInput {
  dealerName: string
  dealerMobileNo: string
  dealerMobileNo_2: string
  dealerEmail: string
  dealerAddress: string
  dealerCompanyName: string
  dealerWebsite: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

async function currentUserId(): Promise<number | null> {
  return getAuthorizedUserIdForRoute('/config/dealers')
}

function buildData(input: DealerFormInput) {
  return {
    dealerName: input.dealerName || null,
    dealerMobileNo: input.dealerMobileNo || null,
    dealerMobileNo_2: input.dealerMobileNo_2 || null,
    dealerEmail: input.dealerEmail || null,
    dealerAddress: input.dealerAddress || null,
    dealerCompanyName: input.dealerCompanyName || null,
    dealerWebsite: input.dealerWebsite || null,
  }
}

function normalizeInput(input: DealerFormInput): DealerFormInput {
  return {
    dealerName: input.dealerName.trim(),
    dealerMobileNo: input.dealerMobileNo.trim(),
    dealerMobileNo_2: input.dealerMobileNo_2.trim(),
    dealerEmail: input.dealerEmail.trim(),
    dealerAddress: input.dealerAddress.trim(),
    dealerCompanyName: input.dealerCompanyName.trim(),
    dealerWebsite: input.dealerWebsite.trim(),
  }
}

function isValidWebsite(value: string) {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

function validateDealerInput(input: DealerFormInput): string | null {
  if (!input.dealerName || !input.dealerMobileNo) return 'Name and mobile are required.'
  if (!/^\d{10,11}$/.test(input.dealerMobileNo)) return 'Mobile must contain 10 to 11 digits.'
  if (input.dealerMobileNo_2 && !/^\d{10,11}$/.test(input.dealerMobileNo_2)) return 'Mobile 2 must contain 10 to 11 digits.'
  if (input.dealerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.dealerEmail)) return 'Enter a valid email address.'
  if (input.dealerWebsite && !isValidWebsite(input.dealerWebsite)) return 'Enter a valid website address.'
  return null
}

export async function createDealer(input: DealerFormInput): Promise<ActionResult> {
  const normalized = normalizeInput(input)
  const validationError = validateDealerInput(normalized)
  if (validationError) return { success: false, error: validationError }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    const dup = await prisma.dealerMaster.findFirst({
      where: { dealerName: normalized.dealerName, dealerMobileNo: normalized.dealerMobileNo },
    })
    if (dup) return { success: false, error: 'A dealer with this name and mobile already exists.' }

    await prisma.dealerMaster.create({
      data: {
        ...buildData(normalized),
        createdDate: new Date(),
        updatedDate: new Date(),
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/config/dealers')
  return { success: true }
}

export async function updateDealer(id: number, input: DealerFormInput): Promise<ActionResult> {
  const normalized = normalizeInput(input)
  const validationError = validateDealerInput(normalized)
  if (validationError) return { success: false, error: validationError }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    const dup = await prisma.dealerMaster.findFirst({
      where: { dealerName: normalized.dealerName, dealerMobileNo: normalized.dealerMobileNo, NOT: { dealerId: id } },
    })
    if (dup) return { success: false, error: 'A dealer with this name and mobile already exists.' }

    await prisma.dealerMaster.update({
      where: { dealerId: id },
      data: {
        ...buildData(normalized),
        updatedDate: new Date(),
        ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/config/dealers')
  return { success: true }
}

export async function deleteDealer(id: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  try {
    await prisma.dealerMaster.delete({ where: { dealerId: id } })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/config/dealers')
  return { success: true }
}

function describeError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return 'A dealer with this name and mobile already exists.'
    }
    if (err.code === 'P2003') {
      return 'This dealer has related records and cannot be deleted.'
    }
  }
  return 'Something went wrong saving this record.'
}
