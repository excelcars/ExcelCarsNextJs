'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'

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
  const session = await auth()
  const id = session?.user?.id
  return id ? Number(id) : null
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

export async function createDealer(input: DealerFormInput): Promise<ActionResult> {
  if (!input.dealerName.trim() || !input.dealerMobileNo.trim()) {
    return { success: false, error: 'Name and mobile are required.' }
  }

  const userId = await currentUserId()

  try {
    const dup = await prisma.dealerMaster.findFirst({
      where: { dealerName: input.dealerName.trim(), dealerMobileNo: input.dealerMobileNo.trim() },
    })
    if (dup) return { success: false, error: 'A dealer with this name and mobile already exists.' }

    await prisma.dealerMaster.create({
      data: {
        ...buildData(input),
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
  if (!input.dealerName.trim() || !input.dealerMobileNo.trim()) {
    return { success: false, error: 'Name and mobile are required.' }
  }

  const userId = await currentUserId()

  try {
    const dup = await prisma.dealerMaster.findFirst({
      where: { dealerName: input.dealerName.trim(), dealerMobileNo: input.dealerMobileNo.trim(), NOT: { dealerId: id } },
    })
    if (dup) return { success: false, error: 'A dealer with this name and mobile already exists.' }

    await prisma.dealerMaster.update({
      where: { dealerId: id },
      data: {
        ...buildData(input),
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
    if (err.code === 'P2003') {
      return 'This dealer has related records and cannot be deleted.'
    }
  }
  return 'Something went wrong saving this record.'
}
