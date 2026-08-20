'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'

export interface LoanFormInput {
  partnerId: number | null
  bankName: string
  customerId: number | null
  customerNameLegacy: string
  customerMobileLegacy: string
  customerEmailLegacy: string
  inventoryId: number | null
  registrationNo: string
  carType: string
  carMake: string
  carModel: string
  carVariant: string
  carYear: number | null
  entryDate: string
  loanAmount: number | null
  percentagePayoutAmount: number | null
  payoutAmount: number | null
  paymentStatus: string
  paymentDate: string
  followupDate: string
  remarks: string
}

export interface LogLoanPaymentInput {
  amountPaid: number | null
  paymentStatus: string
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

function buildData(input: LoanFormInput) {
  return {
    entryDate: toDate(input.entryDate),
    bankName: input.bankName || null,
    customerNameLegacy: input.customerNameLegacy || null,
    customerMobileLegacy: input.customerMobileLegacy || null,
    customerEmailLegacy: input.customerEmailLegacy || null,
    registrationNo: input.registrationNo || null,
    carType: input.carType || null,
    carMake: input.carMake || null,
    carModel: input.carModel || null,
    carVariant: input.carVariant || null,
    carYear: input.carYear,
    loanAmount: input.loanAmount,
    percentagePayoutAmount: input.percentagePayoutAmount,
    payoutAmount: input.payoutAmount,
    paymentStatus: input.paymentStatus || null,
    paymentDate: toDate(input.paymentDate),
    followupDate: toDate(input.followupDate),
    remarks: input.remarks || null,
  }
}

export async function createLoan(input: LoanFormInput): Promise<ActionResult> {
  if (!input.customerId && !input.customerNameLegacy.trim()) {
    return { success: false, error: 'Link a customer or enter a name.' }
  }
  if (!input.partnerId) {
    return { success: false, error: 'Select a bank contact.' }
  }

  const userId = await currentUserId()

  try {
    if (input.registrationNo.trim()) {
      const dup = await prisma.loanManagement.findFirst({ where: { registrationNo: input.registrationNo.trim() } })
      if (dup) return { success: false, error: 'A loan referral already exists for this registration number.' }
    }

    await prisma.loanManagement.create({
      data: {
        ...buildData(input),
        partnerMaster: { connect: { partnerId: input.partnerId } },
        ...(input.customerId ? { customer: { connect: { custId: input.customerId } } } : {}),
        ...(input.inventoryId ? { inventoryManagement: { connect: { inventoryId: input.inventoryId } } } : {}),
        totalAmountReceived: 0,
        createdDate: new Date(),
        updatedDate: new Date(),
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/loan')
  return { success: true }
}

export async function updateLoan(id: number, input: LoanFormInput): Promise<ActionResult> {
  if (!input.customerId && !input.customerNameLegacy.trim()) {
    return { success: false, error: 'Link a customer or enter a name.' }
  }
  if (!input.partnerId) {
    return { success: false, error: 'Select a bank contact.' }
  }

  const userId = await currentUserId()

  try {
    if (input.registrationNo.trim()) {
      const dup = await prisma.loanManagement.findFirst({
        where: { registrationNo: input.registrationNo.trim(), NOT: { loanManagementId: id } },
      })
      if (dup) return { success: false, error: 'A loan referral already exists for this registration number.' }
    }

    await prisma.loanManagement.update({
      where: { loanManagementId: id },
      data: {
        ...buildData(input),
        fkPartnerId: input.partnerId,
        customerId: input.customerId,
        inventoryId: input.inventoryId,
        updatedDate: new Date(),
        ...(userId ? { updatedBy: userId } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/loan')
  return { success: true }
}

export async function deleteLoan(id: number): Promise<ActionResult> {
  try {
    await prisma.loanPaymentDetails.deleteMany({ where: { fkLoanManagementId: id } })
    await prisma.loanFollowupDetails.deleteMany({ where: { fkLoanManagementId: id } })
    await prisma.loanManagement.delete({ where: { loanManagementId: id } })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/loan')
  return { success: true }
}

export async function logLoanPayment(loanManagementId: number, input: LogLoanPaymentInput): Promise<ActionResult> {
  if (!input.paymentStatus) {
    return { success: false, error: 'Payment status is required.' }
  }

  const userId = await currentUserId()
  const now = new Date()

  try {
    const main = await prisma.loanManagement.findUnique({ where: { loanManagementId } })
    if (!main) return { success: false, error: 'Loan record not found.' }

    await prisma.loanPaymentDetails.create({
      data: {
        fkLoanManagementId: loanManagementId,
        loanAmount: main.loanAmount,
        payoutAmount: main.payoutAmount,
        amountPaid: input.amountPaid,
        bankName: main.bankName,
        paymentDate: now,
        paymentStatus: input.paymentStatus,
        createdDt: now,
        updatedDt: now,
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      },
    })

    if (input.nextFollowUpDate) {
      await prisma.loanFollowupDetails.create({
        data: {
          fkLoanManagementId: loanManagementId,
          followupDate: new Date(input.nextFollowUpDate),
          remark: input.remark || null,
          createdDt: now,
          updatedDt: now,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
      })
    }

    const sum = await prisma.loanPaymentDetails.aggregate({
      where: { fkLoanManagementId: loanManagementId },
      _sum: { amountPaid: true },
    })

    await prisma.loanManagement.update({
      where: { loanManagementId },
      data: {
        totalAmountReceived: sum._sum.amountPaid ?? 0,
        paymentStatus: input.paymentStatus,
        paymentDate: now,
        followupDate: input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : null,
        remarks: input.remark || null,
        updatedDate: now,
        ...(userId ? { updatedBy: userId } : {}),
      },
    })
  } catch {
    return { success: false, error: 'Something went wrong logging this payment.' }
  }

  revalidatePath('/loan')
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
