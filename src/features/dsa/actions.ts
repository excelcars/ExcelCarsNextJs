'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'

export interface DsaFormInput {
  partnerId: number | null
  dsaAgentName: string
  dsaAgentMobileNo: string
  dsaAgentEmail: string
  dsaBankName: string
  dsaEntryDate: string
  inventoryId: number | null
  customerId: number | null
  customerNameLegacy: string
  carModelLegacy: string
  carRegistrationNo: string
  fkVariantId: number | null
  loanAmount: number | null
  percentageOfPayout: number | null
  payoutAmount: number | null
  paymentStatus: string
  amountPaid: number | null
  remark: string
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

function buildData(input: DsaFormInput) {
  return {
    dsaAgentName: input.dsaAgentName || null,
    dsaAgentMobileNo: input.dsaAgentMobileNo || null,
    dsaAgentEmail: input.dsaAgentEmail || null,
    dsaBankName: input.dsaBankName || null,
    dsaEntryDate: input.dsaEntryDate ? new Date(input.dsaEntryDate) : null,
    customerNameLegacy: input.customerNameLegacy || null,
    carModelLegacy: input.carModelLegacy || null,
    carRegistrationNo: input.carRegistrationNo || null,
    loanAmount: input.loanAmount,
    percentageOfPayout: input.percentageOfPayout,
    payoutAmount: input.payoutAmount,
    paymentStatus: input.paymentStatus || null,
    amountPaid: input.amountPaid,
    remark: input.remark || null,
  }
}

export async function createDsa(input: DsaFormInput): Promise<ActionResult> {
  if (!input.inventoryId) {
    return { success: false, error: 'Select a vehicle.' }
  }
  if (!input.partnerId) {
    return { success: false, error: 'Select a DSA agent.' }
  }

  const userId = await currentUserId()

  try {
    const dup = await prisma.dsaManagement.findFirst({ where: { inventoryId: input.inventoryId } })
    if (dup) return { success: false, error: 'A DSA record already exists for this vehicle.' }

    await prisma.dsaManagement.create({
      data: {
        ...buildData(input),
        partnerMaster: { connect: { partnerId: input.partnerId } },
        inventoryManagement: { connect: { inventoryId: input.inventoryId } },
        ...(input.customerId ? { customer: { connect: { custId: input.customerId } } } : {}),
        ...(input.fkVariantId ? { carVariantMaster: { connect: { pkVariantId: input.fkVariantId } } } : {}),
        createdDate: new Date(),
        updatedDate: new Date(),
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/dsa')
  return { success: true }
}

export async function updateDsa(id: number, input: DsaFormInput): Promise<ActionResult> {
  if (!input.inventoryId) {
    return { success: false, error: 'Select a vehicle.' }
  }
  if (!input.partnerId) {
    return { success: false, error: 'Select a DSA agent.' }
  }

  const userId = await currentUserId()

  try {
    await prisma.dsaManagement.update({
      where: { dsaMainId: id },
      data: {
        ...buildData(input),
        fkPartnerId: input.partnerId,
        inventoryId: input.inventoryId,
        customerId: input.customerId,
        fkVariantId: input.fkVariantId,
        updatedDate: new Date(),
        ...(userId ? { updatedBy: userId } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/dsa')
  return { success: true }
}

export async function deleteDsa(id: number): Promise<ActionResult> {
  try {
    await prisma.dsaManagement.delete({ where: { dsaMainId: id } })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/dsa')
  return { success: true }
}

function describeError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2003') {
      return 'This record references data that no longer exists.'
    }
  }
  return 'Something went wrong saving this record.'
}
