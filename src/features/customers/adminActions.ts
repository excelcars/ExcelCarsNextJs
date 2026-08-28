'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { CUSTOMER_WRITE_FUNCTION } from '@/lib/access/accessCatalog'
import { normalizeCustomerName, validateCustomerInput } from './validation'

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

export interface ActionResult {
  success: boolean
  error?: string
  errorField?: keyof CustomerFormInput
}

async function currentUserId(): Promise<number | null> {
  const actor = await getAuthorizedActorForFunctions([CUSTOMER_WRITE_FUNCTION])
  return actor?.userId ?? null
}

function toDate(v: string): Date | null {
  return v ? new Date(`${v}T00:00:00.000Z`) : null
}

function buildData(input: CustomerFormInput) {
  return {
    type: input.type || null,
    custName: input.custName,
    custAddress: input.custAddress || null,
    custMobile: input.custMobile || null,
    mobile_2: input.mobile_2 || null,
    custEmail: input.custEmail || null,
    custDob: toDate(input.custDob),
    custAnniversaryDt: toDate(input.custAnniversaryDt),
    comments: input.comments || null,
    companyName: input.companyName || null,
  }
}

async function findDuplicateCustomer(input: CustomerFormInput, excludeId?: number) {
  const candidates = await prisma.customer.findMany({
    where: {
      ...(input.custMobile
        ? { custMobile: { equals: input.custMobile, mode: 'insensitive' } }
        : { custEmail: { equals: input.custEmail, mode: 'insensitive' } }),
      ...(excludeId ? { NOT: { custId: excludeId } } : {}),
    },
    select: { custName: true },
  })
  const normalizedName = normalizeCustomerName(input.custName).toLowerCase()
  return candidates.some(candidate => normalizeCustomerName(candidate.custName).toLowerCase() === normalizedName)
}

export async function createCustomer(input: CustomerFormInput): Promise<ActionResult> {
  const validation = validateCustomerInput(input)
  if (!validation.value) return { success: false, error: validation.error, errorField: validation.errorField }
  input = validation.value

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    if (await findDuplicateCustomer(input)) return { success: false, error: 'A customer with this name and primary contact already exists.' }

    await prisma.customer.create({
      data: {
        ...buildData(input),
        createdDt: new Date(),
        updatedDt: new Date(),
        createdByUser: { connect: { userId } },
        updatedByUser: { connect: { userId } },
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/config/customers')
  return { success: true }
}

export async function updateCustomer(id: number, input: CustomerFormInput): Promise<ActionResult> {
  const validation = validateCustomerInput(input, { allowLegacyType: true })
  if (!validation.value) return { success: false, error: validation.error, errorField: validation.errorField }
  input = validation.value

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    if (await findDuplicateCustomer(input, id)) return { success: false, error: 'A customer with this name and primary contact already exists.' }

    await prisma.customer.update({
      where: { custId: id },
      data: {
        ...buildData(input),
        updatedDt: new Date(),
        updatedByUser: { connect: { userId } },
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/config/customers')
  return { success: true }
}

export async function deleteCustomer(id: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  try {
    await prisma.customer.delete({ where: { custId: id } })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/config/customers')
  return { success: true }
}

function describeError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2003') {
      return 'This customer has related records (inquiries, loans, etc.) and cannot be deleted.'
    }
  }
  return 'Something went wrong saving this record.'
}
