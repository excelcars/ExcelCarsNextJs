'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'

export interface RtoFormInput {
  partnerId: number | null
  agentNameLegacy: string
  agentMobileNoLegacy: string
  agentEmailIdLegacy: string
  customerId: number | null
  customerNameLegacy: string
  customerMobLegacy: string
  customerEmailLegacy: string
  inventoryId: number | null
  variantId: number | null
  registrationNo: string
  carType: string
  carMakeLegacy: string
  carModelLegacy: string
  carVariantLegacy: string
  carYear: number | null
  dateOfEntry: string
  transferCharges: number | null
  paymentStatus: string
  paymentDate: string
  rcStatus: string
  transferStatus: string
  followupDate: string
  remark: string
}

export interface LogRtoPaymentInput {
  amountPaid: number | null
  paymentStatus: string
  rcStatus: string
  transferStatus: string
  nextFollowUpDate: string
  remark: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

async function currentUserId(): Promise<number | null> {
  return getAuthorizedUserIdForRoute('/rto')
}

function toDate(v: string): Date | null {
  return v ? new Date(v) : null
}

async function getLatestRtoPaymentDate(rtoAgentMainId: number): Promise<Date | null> {
  const latestPayment = await prisma.rtoPaymentDetails.findFirst({
    where: { fkRtoAgentMainId: rtoAgentMainId },
    orderBy: [
      { paymentDate: 'desc' },
      { createdDt: 'desc' },
      { rtoPaymentId: 'desc' },
    ],
    select: { paymentDate: true, createdDt: true },
  })

  return latestPayment?.paymentDate ?? latestPayment?.createdDt ?? null
}

function buildData(input: RtoFormInput) {
  return {
    dateOfEntry: toDate(input.dateOfEntry),
    agentNameLegacy: input.agentNameLegacy || null,
    agentMobileNoLegacy: input.agentMobileNoLegacy || null,
    agentEmailIdLegacy: input.agentEmailIdLegacy || null,
    customerNameLegacy: input.customerNameLegacy || null,
    customerMobLegacy: input.customerMobLegacy || null,
    customerEmailLegacy: input.customerEmailLegacy || null,
    carRegistrationNo: input.registrationNo || null,
    carType: input.carType || null,
    carMakeLegacy: input.carMakeLegacy || null,
    carModelLegacy: input.carModelLegacy || null,
    carVariantLegacy: input.carVariantLegacy || null,
    carYear: input.carYear,
    transferCharges: input.transferCharges,
    paymentStatus: input.paymentStatus || null,
    paymentDate: toDate(input.paymentDate),
    rcStatus: input.rcStatus || null,
    transferStatus: input.transferStatus || null,
    followupDate: toDate(input.followupDate),
    remark: input.remark || null,
  }
}

export async function createRto(input: RtoFormInput): Promise<ActionResult> {
  if (!input.customerId && !input.customerNameLegacy.trim()) {
    return { success: false, error: 'Link a customer or enter a name.' }
  }
  if (!input.partnerId) {
    return { success: false, error: 'Select an RTO agent.' }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    if (input.registrationNo.trim()) {
      const dup = await prisma.rtoAgent.findFirst({ where: { carRegistrationNo: input.registrationNo.trim() } })
      if (dup) return { success: false, error: 'An RTO record already exists for this registration number.' }
    }

    await prisma.rtoAgent.create({
      data: {
        ...buildData(input),
        partnerMaster: { connect: { partnerId: input.partnerId } },
        ...(input.customerId ? { customer: { connect: { custId: input.customerId } } } : {}),
        ...(input.inventoryId ? { inventoryManagement: { connect: { inventoryId: input.inventoryId } } } : {}),
        ...(input.variantId ? { carVariantMaster: { connect: { pkVariantId: input.variantId } } } : {}),
        amtPaid: 0,
        createdDt: new Date(),
        updatedDt: new Date(),
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/rto')
  return { success: true }
}

export async function updateRto(id: number, input: RtoFormInput): Promise<ActionResult> {
  if (!input.customerId && !input.customerNameLegacy.trim()) {
    return { success: false, error: 'Link a customer or enter a name.' }
  }
  if (!input.partnerId) {
    return { success: false, error: 'Select an RTO agent.' }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    if (input.registrationNo.trim()) {
      const dup = await prisma.rtoAgent.findFirst({
        where: { carRegistrationNo: input.registrationNo.trim(), NOT: { rtoAgentMainId: id } },
      })
      if (dup) return { success: false, error: 'An RTO record already exists for this registration number.' }
    }

    const latestPaymentDate = await getLatestRtoPaymentDate(id)

    await prisma.rtoAgent.update({
      where: { rtoAgentMainId: id },
      data: {
        ...buildData(input),
        paymentDate: latestPaymentDate ?? toDate(input.paymentDate),
        fkPartnerId: input.partnerId,
        customerId: input.customerId,
        inventoryId: input.inventoryId,
        fkVariantId: input.variantId,
        updatedDt: new Date(),
        ...(userId ? { updatedBy: userId } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/rto')
  return { success: true }
}

export async function deleteRto(id: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  try {
    await prisma.rtoPaymentDetails.deleteMany({ where: { fkRtoAgentMainId: id } })
    await prisma.rtoFollowupDetails.deleteMany({ where: { fkRtoAgentMainId: id } })
    await prisma.rtoAgent.delete({ where: { rtoAgentMainId: id } })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/rto')
  return { success: true }
}

export async function logRtoPayment(rtoAgentMainId: number, input: LogRtoPaymentInput): Promise<ActionResult> {
  if (!input.paymentStatus || !input.rcStatus || !input.transferStatus) {
    return { success: false, error: 'Payment, RC, and transfer status are all required.' }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  const now = new Date()

  try {
    const main = await prisma.rtoAgent.findUnique({ where: { rtoAgentMainId } })
    if (!main) return { success: false, error: 'RTO record not found.' }

    await prisma.rtoPaymentDetails.create({
      data: {
        fkRtoAgentMainId: rtoAgentMainId,
        transferCharges: main.transferCharges,
        amountPaid: input.amountPaid,
        paymentStatus: input.paymentStatus,
        paymentDate: now,
        rcStatus: input.rcStatus,
        transferStatus: input.transferStatus,
        createdDt: now,
        updatedDt: now,
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      },
    })

    if (input.nextFollowUpDate) {
      await prisma.rtoFollowupDetails.create({
        data: {
          fkRtoAgentMainId: rtoAgentMainId,
          followupDate: new Date(input.nextFollowUpDate),
          remark: input.remark || null,
          createdDt: now,
          updatedDt: now,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
      })
    }

    const sum = await prisma.rtoPaymentDetails.aggregate({
      where: { fkRtoAgentMainId: rtoAgentMainId },
      _sum: { amountPaid: true },
    })

    const latestPaymentDate = await getLatestRtoPaymentDate(rtoAgentMainId)

    // logs all three statuses on the main record — the legacy "Pay" flow only
    // updated payment/RC status and left transfer_status stale, which we treat
    // as an oversight rather than intended behavior
    await prisma.rtoAgent.update({
      where: { rtoAgentMainId },
      data: {
        amtPaid: sum._sum.amountPaid ?? 0,
        paymentStatus: input.paymentStatus,
        paymentDate: latestPaymentDate,
        rcStatus: input.rcStatus,
        transferStatus: input.transferStatus,
        followupDate: input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : null,
        remark: input.remark || null,
        updatedDt: now,
        ...(userId ? { updatedBy: userId } : {}),
      },
    })
  } catch {
    return { success: false, error: 'Something went wrong logging this payment.' }
  }

  revalidatePath('/rto')
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
