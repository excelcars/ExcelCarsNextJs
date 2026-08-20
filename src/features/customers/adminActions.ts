'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'

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
}

async function currentUserId(): Promise<number | null> {
  const session = await auth()
  const id = session?.user?.id
  return id ? Number(id) : null
}

function toDate(v: string): Date | null {
  return v ? new Date(v) : null
}

function buildData(input: CustomerFormInput) {
  return {
    type: input.type || null,
    custName: input.custName.trim(),
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

export async function createCustomer(input: CustomerFormInput): Promise<ActionResult> {
  if (!input.custName.trim()) {
    return { success: false, error: 'Name is required.' }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authenticated.' }

  try {
    if (input.custMobile.trim()) {
      const dup = await prisma.customer.findFirst({
        where: { custName: input.custName.trim(), custMobile: input.custMobile.trim() },
      })
      if (dup) return { success: false, error: 'A customer with this name and mobile already exists.' }
    }

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
  if (!input.custName.trim()) {
    return { success: false, error: 'Name is required.' }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authenticated.' }

  try {
    if (input.custMobile.trim()) {
      const dup = await prisma.customer.findFirst({
        where: { custName: input.custName.trim(), custMobile: input.custMobile.trim(), NOT: { custId: id } },
      })
      if (dup) return { success: false, error: 'A customer with this name and mobile already exists.' }
    }

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
