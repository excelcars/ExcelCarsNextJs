'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'

export interface InsuranceFormInput {
  agentPartnerId: number | null
  agentNameLegacy: string
  agentMobileNoLegacy: string
  agentEmailIdLegacy: string
  customerId: number | null
  customerNameLegacy: string
  customerMobileLegacy: string
  customerEmailLegacy: string
  inventoryId: number | null
  fkVariantId: number | null
  carType: string
  carMakeLegacy: string
  carModelLegacy: string
  carVariantLegacy: string
  carYear: number | null
  carRegistrationNo: string
  entryDate: string
  insurancePremium: number | null
  oDPremium: number | null
  payoutPercentageOdPremium: number | null
  payoutAmount: number | null
  payoutPaymentStatus: string
  policyStatus: string
  renewalDate: string
  expiryDate: string
  followupDate: string
  remark: string
}

export interface LogPaymentInput {
  amountReceived: number | null
  payoutPaymentStatus: string
  policyStatus: string
  nextFollowUpDate: string
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

function toDate(v: string): Date | null {
  return v ? new Date(v) : null
}

function buildData(input: InsuranceFormInput) {
  return {
    entryDate: toDate(input.entryDate),
    renewalDate: toDate(input.renewalDate),
    expiryDate: toDate(input.expiryDate),
    agentNameLegacy: input.agentNameLegacy || null,
    agentMobileNoLegacy: input.agentMobileNoLegacy || null,
    agentEmailIdLegacy: input.agentEmailIdLegacy || null,
    customerNameLegacy: input.customerNameLegacy || null,
    customerMobileLegacy: input.customerMobileLegacy || null,
    customerEmailLegacy: input.customerEmailLegacy || null,
    carType: input.carType || null,
    carMakeLegacy: input.carMakeLegacy || null,
    carModelLegacy: input.carModelLegacy || null,
    carVariantLegacy: input.carVariantLegacy || null,
    carYear: input.carYear,
    carRegistrationNo: input.carRegistrationNo || null,
    insurancePremium: input.insurancePremium,
    oDPremium: input.oDPremium,
    payoutPercentageOdPremium: input.payoutPercentageOdPremium,
    payoutAmount: input.payoutAmount,
    payoutPaymentStatus: input.payoutPaymentStatus || null,
    policyStatus: input.policyStatus || null,
    followupDate: toDate(input.followupDate),
    remark: input.remark || null,
  }
}

export async function createInsurance(input: InsuranceFormInput): Promise<ActionResult> {
  if (!input.customerId && !input.customerNameLegacy.trim()) {
    return { success: false, error: 'Link a customer or enter a name.' }
  }
  if (!input.agentPartnerId) {
    return { success: false, error: 'Select an insurance agent.' }
  }

  const userId = await currentUserId()

  try {
    if (input.carRegistrationNo.trim()) {
      const dup = await prisma.insuranceMain.findFirst({ where: { carRegistrationNo: input.carRegistrationNo.trim() } })
      if (dup) return { success: false, error: 'An insurance record already exists for this registration number.' }
    }

    await prisma.insuranceMain.create({
      data: {
        ...buildData(input),
        partnerMaster: { connect: { partnerId: input.agentPartnerId } },
        ...(input.customerId ? { customer: { connect: { custId: input.customerId } } } : {}),
        ...(input.inventoryId ? { inventoryManagement: { connect: { inventoryId: input.inventoryId } } } : {}),
        ...(input.fkVariantId ? { carVariantMaster: { connect: { pkVariantId: input.fkVariantId } } } : {}),
        totalAmountReceived: 0,
        createdDate: new Date(),
        updatedDate: new Date(),
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/insurance')
  return { success: true }
}

export async function updateInsurance(id: number, input: InsuranceFormInput): Promise<ActionResult> {
  if (!input.customerId && !input.customerNameLegacy.trim()) {
    return { success: false, error: 'Link a customer or enter a name.' }
  }
  if (!input.agentPartnerId) {
    return { success: false, error: 'Select an insurance agent.' }
  }

  const userId = await currentUserId()

  try {
    if (input.carRegistrationNo.trim()) {
      const dup = await prisma.insuranceMain.findFirst({
        where: { carRegistrationNo: input.carRegistrationNo.trim(), NOT: { insuranceMainId: id } },
      })
      if (dup) return { success: false, error: 'An insurance record already exists for this registration number.' }
    }

    await prisma.insuranceMain.update({
      where: { insuranceMainId: id },
      data: {
        ...buildData(input),
        fkPartnerId: input.agentPartnerId,
        customerId: input.customerId,
        inventoryId: input.inventoryId,
        fkVariantId: input.fkVariantId,
        updatedDate: new Date(),
        ...(userId ? { updatedBy: userId } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/insurance')
  return { success: true }
}

export async function deleteInsurance(id: number): Promise<ActionResult> {
  try {
    await prisma.insurancePaymentDetails.deleteMany({ where: { fkInsuranceMainId: id } })
    await prisma.insuranceFollowupDetails.deleteMany({ where: { fkInsuranceMainId: id } })
    await prisma.insuranceMain.delete({ where: { insuranceMainId: id } })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/insurance')
  return { success: true }
}

export async function logInsurancePayment(insuranceMainId: number, input: LogPaymentInput): Promise<ActionResult> {
  if (!input.payoutPaymentStatus || !input.policyStatus) {
    return { success: false, error: 'Payout status and policy status are required.' }
  }

  const userId = await currentUserId()
  const now = new Date()

  try {
    const main = await prisma.insuranceMain.findUnique({ where: { insuranceMainId } })
    if (!main) return { success: false, error: 'Insurance record not found.' }

    await prisma.insurancePaymentDetails.create({
      data: {
        fkInsuranceMainId: insuranceMainId,
        amountReceived: input.amountReceived,
        payoutAmount: main.payoutAmount,
        payoutPaymentStatus: input.payoutPaymentStatus,
        policyStatus: input.policyStatus,
        createdDt: now,
        updatedDt: now,
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      },
    })

    if (input.nextFollowUpDate) {
      await prisma.insuranceFollowupDetails.create({
        data: {
          fkInsuranceMainId: insuranceMainId,
          followupDate: new Date(input.nextFollowUpDate),
          remark: input.remark || null,
          createdDt: now,
          updatedDt: now,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
      })
    }

    const sum = await prisma.insurancePaymentDetails.aggregate({
      where: { fkInsuranceMainId: insuranceMainId },
      _sum: { amountReceived: true },
    })

    await prisma.insuranceMain.update({
      where: { insuranceMainId },
      data: {
        totalAmountReceived: sum._sum.amountReceived ?? 0,
        payoutPaymentStatus: input.payoutPaymentStatus,
        policyStatus: input.policyStatus,
        followupDate: input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : null,
        remark: input.remark || null,
        updatedDate: now,
        ...(userId ? { updatedBy: userId } : {}),
      },
    })
  } catch {
    return { success: false, error: 'Something went wrong logging this payment.' }
  }

  revalidatePath('/insurance')
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
