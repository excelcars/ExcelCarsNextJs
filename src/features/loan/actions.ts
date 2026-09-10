'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { isValidEmail, isValidPhone, isValidYear, normalizeRegistrationNo } from '@/lib/validation'
import { LOAN_PAYMENT_STATUSES, validateLoanPaymentInput } from './paymentValidation'

export interface LoanFormInput {
  partnerId: number | null
  bankName: string
  bankPersonName: string
  bankPersonMobileNo: string
  bankPersonEmailId: string
  customerId: number | null
  customerNameLegacy: string
  customerMobileLegacy: string
  customerEmailLegacy: string
  inventoryId: number | null
  fkVariantId: number | null
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
  initialAmountReceived: number | null
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

const LOAN_CAR_TYPES = new Set(['New', 'PreOwned'])
const REGISTRATION_WHITESPACE_PATTERN = '\\s+'

async function currentUserId(): Promise<number | null> {
  return getAuthorizedUserIdForRoute('/loan')
}

function toDate(v: string): Date | null {
  return v ? new Date(v) : null
}

function calculatePayoutAmount(input: LoanFormInput): Prisma.Decimal | null {
  if (input.loanAmount === null || input.percentagePayoutAmount === null) return null
  return new Prisma.Decimal(input.loanAmount)
    .mul(input.percentagePayoutAmount)
    .div(100)
    .toDecimalPlaces(2)
}

async function findDuplicateRegistration(registrationNo: string, excludingLoanId = -1) {
  const matches = await prisma.$queryRaw<Array<{ loanManagementId: number }>>`
    SELECT loan_management_id AS "loanManagementId"
    FROM loan_management
    WHERE regexp_replace(upper(COALESCE(registration_no, '')), ${REGISTRATION_WHITESPACE_PATTERN}, '', 'g') = ${registrationNo}
      AND loan_management_id <> ${excludingLoanId}
    LIMIT 1
  `
  return matches[0] ?? null
}

function validateLoanInput(input: LoanFormInput): string | null {
  if (!normalizeRegistrationNo(input.registrationNo)) return 'Registration number is required.'
  if (!input.bankName.trim()) return 'Bank name is required.'
  if (!input.customerId && !input.customerNameLegacy.trim()) return 'Link a customer or enter a name.'
  if (!LOAN_CAR_TYPES.has(input.carType)) return 'Select a valid car type.'
  if (!input.carMake.trim()) return 'Car make is required.'
  if (!input.carModel.trim()) return 'Car model is required.'
  if (!input.carVariant.trim()) return 'Car variant is required.'
  if (input.carYear === null || !Number.isInteger(input.carYear) || !isValidYear(input.carYear)) return 'Enter a valid car year.'
  if (input.bankPersonMobileNo && !isValidPhone(input.bankPersonMobileNo)) return 'Bank contact mobile must contain 10 digits.'
  if (input.bankPersonEmailId && !isValidEmail(input.bankPersonEmailId)) return 'Enter a valid bank contact email address.'
  if (input.customerMobileLegacy && !isValidPhone(input.customerMobileLegacy)) return 'Customer mobile must contain 10 digits.'
  if (input.customerEmailLegacy && !isValidEmail(input.customerEmailLegacy)) return 'Enter a valid customer email address.'
  if (input.loanAmount !== null && (!Number.isFinite(input.loanAmount) || input.loanAmount <= 0)) return 'Loan amount must be greater than zero.'
  if (input.percentagePayoutAmount !== null && (!Number.isFinite(input.percentagePayoutAmount) || input.percentagePayoutAmount < 0 || input.percentagePayoutAmount > 100)) return 'Payout percentage must be between 0 and 100.'
  if ((input.loanAmount === null) !== (input.percentagePayoutAmount === null)) return 'Enter both loan amount and payout percentage.'
  if (!LOAN_PAYMENT_STATUSES.has(input.paymentStatus)) return 'Select a valid payment status.'
  return null
}

function validateInitialPayment(input: LoanFormInput): string | null {
  const payoutAmount = calculatePayoutAmount(input)
  if (!payoutAmount || payoutAmount.lte(0)) return 'Loan amount and payout percentage must produce a positive payout amount.'
  if (typeof input.initialAmountReceived !== 'number' || !Number.isFinite(input.initialAmountReceived) || input.initialAmountReceived <= 0) {
    return 'Initial amount received must be greater than zero.'
  }
  if (new Prisma.Decimal(input.initialAmountReceived).gt(payoutAmount)) {
    return 'Initial amount received cannot exceed the payout amount.'
  }
  return null
}

function buildData(input: LoanFormInput) {
  return {
    entryDate: toDate(input.entryDate),
    bankName: input.bankName || null,
    bankPersonName: input.bankPersonName || null,
    bankPersonMobileNo: input.bankPersonMobileNo || null,
    bankPersonEmailId: input.bankPersonEmailId || null,
    customerNameLegacy: input.customerNameLegacy || null,
    customerMobileLegacy: input.customerMobileLegacy || null,
    customerEmailLegacy: input.customerEmailLegacy || null,
    registrationNo: normalizeRegistrationNo(input.registrationNo),
    carType: input.carType || null,
    carMake: input.carMake || null,
    carModel: input.carModel || null,
    carVariant: input.carVariant || null,
    carYear: input.carYear,
    loanAmount: input.loanAmount,
    percentagePayoutAmount: input.percentagePayoutAmount,
    // This is derived from the validated source inputs. Never trust the browser's readonly field.
    payoutAmount: calculatePayoutAmount(input),
    paymentStatus: input.paymentStatus || null,
    paymentDate: toDate(input.paymentDate),
    followupDate: toDate(input.followupDate),
    remarks: input.remarks || null,
  }
}

export async function createLoan(input: LoanFormInput): Promise<ActionResult> {
  const partnerId = input.partnerId
  if (partnerId !== null && (!Number.isInteger(partnerId) || partnerId <= 0)) return { success: false, error: 'Select a valid bank contact.' }
  const validationError = validateLoanInput(input)
  if (validationError) return { success: false, error: validationError }
  const initialPaymentError = validateInitialPayment(input)
  if (initialPaymentError) return { success: false, error: initialPaymentError }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    const registrationNo = normalizeRegistrationNo(input.registrationNo)
    const dup = await findDuplicateRegistration(registrationNo)
    if (dup) return { success: false, error: 'A loan referral already exists for this registration number.' }

    const now = new Date()
    const paymentDate = toDate(input.paymentDate) ?? now
    const followupDate = toDate(input.followupDate) ?? now
    const initialAmountReceived = input.initialAmountReceived!

    await prisma.$transaction(async (tx) => {
      const loan = await tx.loanManagement.create({
        data: {
          ...buildData(input),
          ...(partnerId ? { partnerMaster: { connect: { partnerId } } } : {}),
          ...(input.customerId ? { customer: { connect: { custId: input.customerId } } } : {}),
          ...(input.inventoryId ? { inventoryManagement: { connect: { inventoryId: input.inventoryId } } } : {}),
          ...(input.fkVariantId ? { carVariantMaster: { connect: { pkVariantId: input.fkVariantId } } } : {}),
          totalAmountReceived: initialAmountReceived,
          paymentDate,
          followupDate,
          createdDate: now,
          updatedDate: now,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
      })

      await tx.loanPaymentDetails.create({
        data: {
          fkLoanManagementId: loan.loanManagementId,
          loanAmount: loan.loanAmount,
          payoutAmount: loan.payoutAmount,
          amountPaid: initialAmountReceived,
          bankName: loan.bankName,
          paymentDate,
          paymentStatus: input.paymentStatus,
          createdDt: now,
          updatedDt: now,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
      })

      await tx.loanFollowupDetails.create({
        data: {
          fkLoanManagementId: loan.loanManagementId,
          followupDate,
          remark: input.remarks.trim() || null,
          createdDt: now,
          updatedDt: now,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
      })
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/loan')
  return { success: true }
}

export async function updateLoan(id: number, input: LoanFormInput): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: 'A valid loan record is required.' }
  const partnerId = input.partnerId
  if (partnerId !== null && (!Number.isInteger(partnerId) || partnerId <= 0)) return { success: false, error: 'Select a valid bank contact.' }
  const validationError = validateLoanInput(input)
  if (validationError) return { success: false, error: validationError }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    const registrationNo = normalizeRegistrationNo(input.registrationNo)
    const dup = await findDuplicateRegistration(registrationNo, id)
    if (dup) return { success: false, error: 'A loan referral already exists for this registration number.' }

    await prisma.loanManagement.update({
      where: { loanManagementId: id },
      data: {
        ...buildData(input),
        fkPartnerId: partnerId,
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

  revalidatePath('/loan')
  return { success: true }
}

export async function deleteLoan(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: 'A valid loan record is required.' }
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.loanPaymentDetails.deleteMany({ where: { fkLoanManagementId: id } })
      await tx.loanFollowupDetails.deleteMany({ where: { fkLoanManagementId: id } })
      await tx.loanManagement.delete({ where: { loanManagementId: id } })
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/loan')
  return { success: true }
}

export async function logLoanPayment(loanManagementId: number, input: LogLoanPaymentInput): Promise<ActionResult> {
  if (!Number.isInteger(loanManagementId) || loanManagementId <= 0) {
    return { success: false, error: 'A valid loan record is required.' }
  }
  const paymentValidation = validateLoanPaymentInput(input)
  if (paymentValidation.error) return { success: false, error: paymentValidation.error }
  const nextFollowUpDate = paymentValidation.nextFollowUpDate

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  const now = new Date()

  try {
    await prisma.$transaction(async (tx) => {
      const main = await tx.loanManagement.findUnique({ where: { loanManagementId } })
      if (!main) throw new Error('LOAN_NOT_FOUND')

      await tx.loanPaymentDetails.create({
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

      if (!main.payoutAmount || main.payoutAmount.lte(0)) throw new Error('INVALID_PAYOUT_AMOUNT')

      const sum = await tx.loanPaymentDetails.aggregate({
        where: { fkLoanManagementId: loanManagementId },
        _sum: { amountPaid: true },
      })
      if (sum._sum.amountPaid && sum._sum.amountPaid.gt(main.payoutAmount)) {
        throw new Error('PAYMENT_EXCEEDS_PAYOUT')
      }

      if (nextFollowUpDate) {
        await tx.loanFollowupDetails.create({
          data: {
            fkLoanManagementId: loanManagementId,
            followupDate: nextFollowUpDate,
            remark: input.remark.trim() || null,
            createdDt: now,
            updatedDt: now,
            ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
          },
        })
      }

      await tx.loanManagement.update({
        where: { loanManagementId },
        data: {
          totalAmountReceived: sum._sum.amountPaid ?? 0,
          paymentStatus: input.paymentStatus,
          paymentDate: now,
          // A completed payment may have no next follow-up. Retain the current
          // summary in that case rather than erasing it as a side effect.
          followupDate: nextFollowUpDate ?? main.followupDate,
          remarks: nextFollowUpDate ? input.remark.trim() || null : main.remarks,
          updatedDate: now,
          ...(userId ? { updatedBy: userId } : {}),
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  } catch (err) {
    if (err instanceof Error && err.message === 'LOAN_NOT_FOUND') {
      return { success: false, error: 'Loan record not found.' }
    }
    if (err instanceof Error && err.message === 'INVALID_PAYOUT_AMOUNT') {
      return { success: false, error: 'This loan does not have a valid payout amount.' }
    }
    if (err instanceof Error && err.message === 'PAYMENT_EXCEEDS_PAYOUT') {
      return { success: false, error: 'This payment would make the total received exceed the payout amount.' }
    }
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
