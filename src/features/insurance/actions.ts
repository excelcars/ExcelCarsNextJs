'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { isValidEmail, isValidPhone, isValidYear, normalizeRegistrationNo } from '@/lib/validation'
import { INSURANCE_PAYOUT_STATUSES, INSURANCE_POLICY_STATUSES, validateInsurancePaymentInput } from './paymentValidation'

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
  initialAmountReceived: number | null
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
  return getAuthorizedUserIdForRoute('/insurance')
}

function toDate(v: string): Date | null {
  if (!v) return null
  const date = new Date(v)
  return Number.isNaN(date.getTime()) ? null : date
}

const INSURANCE_CAR_TYPES = new Set(['New', 'PreOwned'])
const REGISTRATION_WHITESPACE_PATTERN = '\\s+'

function calculatePayoutAmount(input: InsuranceFormInput): Prisma.Decimal | null {
  if (input.oDPremium === null || input.payoutPercentageOdPremium === null) return null
  return new Prisma.Decimal(input.oDPremium).mul(input.payoutPercentageOdPremium).div(100).toDecimalPlaces(2)
}

async function findDuplicateRegistration(registrationNo: string, expiryDate: Date, excludingInsuranceId = -1) {
  const matches = await prisma.$queryRaw<Array<{ insuranceMainId: number }>>`
    SELECT insurance_main_id AS "insuranceMainId"
    FROM insurance_main
    WHERE regexp_replace(upper(COALESCE(car_registration_no, '')), ${REGISTRATION_WHITESPACE_PATTERN}, '', 'g') = ${registrationNo}
      AND expiry_date = ${expiryDate}
      AND insurance_main_id <> ${excludingInsuranceId}
    LIMIT 1
  `
  return matches[0] ?? null
}

function validateInsuranceInput(input: InsuranceFormInput): string | null {
  if (!input.agentPartnerId || !Number.isInteger(input.agentPartnerId) || input.agentPartnerId <= 0) return 'Select an insurance agent.'
  if (!input.customerId || !Number.isInteger(input.customerId) || input.customerId <= 0) return 'Select a customer.'
  if (!normalizeRegistrationNo(input.carRegistrationNo)) return 'Registration number is required.'
  if (!INSURANCE_CAR_TYPES.has(input.carType)) return 'Select a valid car type.'
  if (!input.carMakeLegacy.trim() || !input.carModelLegacy.trim() || !input.carVariantLegacy.trim()) return 'Car make, model, and variant are required.'
  if (input.carYear === null || !Number.isInteger(input.carYear) || !isValidYear(input.carYear)) return 'Enter a valid car year.'
  const entryDate = toDate(input.entryDate)
  const renewalDate = toDate(input.renewalDate)
  const expiryDate = toDate(input.expiryDate)
  const followupDate = toDate(input.followupDate)
  if (!entryDate || !renewalDate || !expiryDate || !followupDate) return 'Entry, renewal, expiry, and follow-up dates are required.'
  if (expiryDate <= entryDate) return 'Expiry date must be after entry date.'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (followupDate < today) return 'Follow-up date cannot be in the past.'
  if (!Number.isFinite(input.insurancePremium ?? NaN) || input.insurancePremium === null || input.insurancePremium <= 0) return 'Insurance premium must be greater than zero.'
  if (!Number.isFinite(input.oDPremium ?? NaN) || input.oDPremium === null || input.oDPremium <= 0) return 'OD premium must be greater than zero.'
  if (input.oDPremium > input.insurancePremium) return 'OD premium cannot exceed insurance premium.'
  if (!Number.isFinite(input.payoutPercentageOdPremium ?? NaN) || input.payoutPercentageOdPremium === null || input.payoutPercentageOdPremium < 0 || input.payoutPercentageOdPremium > 100) return 'Payout percentage must be between 0 and 100.'
  if (!INSURANCE_PAYOUT_STATUSES.has(input.payoutPaymentStatus)) return 'Select a valid payout status.'
  if (!INSURANCE_POLICY_STATUSES.has(input.policyStatus)) return 'Select a valid policy status.'
  if (input.agentMobileNoLegacy && !isValidPhone(input.agentMobileNoLegacy)) return 'Agent mobile must contain 10 digits.'
  if (input.agentEmailIdLegacy && !isValidEmail(input.agentEmailIdLegacy)) return 'Enter a valid agent email address.'
  if (input.customerMobileLegacy && !isValidPhone(input.customerMobileLegacy)) return 'Customer mobile must contain 10 digits.'
  if (input.customerEmailLegacy && !isValidEmail(input.customerEmailLegacy)) return 'Enter a valid customer email address.'
  return null
}

function validateInitialPayment(input: InsuranceFormInput): string | null {
  const payoutAmount = calculatePayoutAmount(input)
  if (!payoutAmount || payoutAmount.lte(0)) return 'OD premium and payout percentage must produce a positive payout amount.'
  if (typeof input.initialAmountReceived !== 'number' || !Number.isFinite(input.initialAmountReceived) || input.initialAmountReceived <= 0) return 'Initial amount received must be greater than zero.'
  if (new Prisma.Decimal(input.initialAmountReceived).gt(payoutAmount)) return 'Initial amount received cannot exceed the payout amount.'
  return null
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
    carRegistrationNo: normalizeRegistrationNo(input.carRegistrationNo),
    insurancePremium: input.insurancePremium,
    oDPremium: input.oDPremium,
    payoutPercentageOdPremium: input.payoutPercentageOdPremium,
    payoutAmount: calculatePayoutAmount(input),
    payoutPaymentStatus: input.payoutPaymentStatus || null,
    policyStatus: input.policyStatus || null,
    followupDate: toDate(input.followupDate),
    remark: input.remark || null,
  }
}

export async function createInsurance(input: InsuranceFormInput): Promise<ActionResult> {
  const validationError = validateInsuranceInput(input)
  if (validationError) return { success: false, error: validationError }
  const initialPaymentError = validateInitialPayment(input)
  if (initialPaymentError) return { success: false, error: initialPaymentError }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    const registrationNo = normalizeRegistrationNo(input.carRegistrationNo)
    const dup = await findDuplicateRegistration(registrationNo, toDate(input.expiryDate)!)
    if (dup) return { success: false, error: 'An insurance policy already exists for this registration number and expiry date.' }
    const now = new Date()
    const initialAmountReceived = input.initialAmountReceived!

    await prisma.$transaction(async (tx) => {
      const insurance = await tx.insuranceMain.create({ data: {
        ...buildData(input),
        partnerMaster: { connect: { partnerId: input.agentPartnerId! } },
        customer: { connect: { custId: input.customerId! } },
        ...(input.inventoryId ? { inventoryManagement: { connect: { inventoryId: input.inventoryId } } } : {}),
        ...(input.fkVariantId ? { carVariantMaster: { connect: { pkVariantId: input.fkVariantId } } } : {}),
        totalAmountReceived: initialAmountReceived,
        createdDate: now,
        updatedDate: now,
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
      } })
      await tx.insurancePaymentDetails.create({ data: {
        fkInsuranceMainId: insurance.insuranceMainId, amountReceived: initialAmountReceived,
        payoutAmount: insurance.payoutAmount, payoutPaymentStatus: input.payoutPaymentStatus, policyStatus: input.policyStatus,
        createdDt: now, updatedDt: now, createdBy: userId, updatedBy: userId,
      } })
      await tx.insuranceFollowupDetails.create({ data: {
        fkInsuranceMainId: insurance.insuranceMainId, followupDate: toDate(input.followupDate), remark: input.remark.trim() || null,
        createdDt: now, updatedDt: now, createdBy: userId, updatedBy: userId,
      } })
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/insurance')
  return { success: true }
}

export async function updateInsurance(id: number, input: InsuranceFormInput): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: 'A valid insurance record is required.' }
  const validationError = validateInsuranceInput(input)
  if (validationError) return { success: false, error: validationError }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    const dup = await findDuplicateRegistration(normalizeRegistrationNo(input.carRegistrationNo), toDate(input.expiryDate)!, id)
    if (dup) return { success: false, error: 'An insurance policy already exists for this registration number and expiry date.' }

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
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: 'A valid insurance record is required.' }
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.insurancePaymentDetails.deleteMany({ where: { fkInsuranceMainId: id } })
      await tx.insuranceFollowupDetails.deleteMany({ where: { fkInsuranceMainId: id } })
      await tx.insuranceMain.delete({ where: { insuranceMainId: id } })
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/insurance')
  return { success: true }
}

export async function logInsurancePayment(insuranceMainId: number, input: LogPaymentInput): Promise<ActionResult> {
  if (!Number.isInteger(insuranceMainId) || insuranceMainId <= 0) return { success: false, error: 'A valid insurance record is required.' }
  const paymentValidation = validateInsurancePaymentInput(input)
  if (paymentValidation.error) return { success: false, error: paymentValidation.error }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  const now = new Date()

  try {
    await prisma.$transaction(async (tx) => {
    const main = await tx.insuranceMain.findUnique({ where: { insuranceMainId } })
    if (!main) throw new Error('INSURANCE_NOT_FOUND')
    if (!main.payoutAmount || main.payoutAmount.lte(0)) throw new Error('INVALID_PAYOUT_AMOUNT')
    await tx.insurancePaymentDetails.create({
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

    if (paymentValidation.nextFollowUpDate) {
      await tx.insuranceFollowupDetails.create({
        data: {
          fkInsuranceMainId: insuranceMainId,
          followupDate: paymentValidation.nextFollowUpDate,
          remark: input.remark || null,
          createdDt: now,
          updatedDt: now,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
      })
    }

    const sum = await tx.insurancePaymentDetails.aggregate({
      where: { fkInsuranceMainId: insuranceMainId },
      _sum: { amountReceived: true },
    })

    if (sum._sum.amountReceived && sum._sum.amountReceived.gt(main.payoutAmount)) throw new Error('PAYMENT_EXCEEDS_PAYOUT')
    await tx.insuranceMain.update({
      where: { insuranceMainId },
      data: {
        totalAmountReceived: sum._sum.amountReceived ?? 0,
        payoutPaymentStatus: input.payoutPaymentStatus,
        policyStatus: input.policyStatus,
        followupDate: paymentValidation.nextFollowUpDate ?? main.followupDate,
        remark: paymentValidation.nextFollowUpDate ? input.remark.trim() || null : main.remark,
        updatedDate: now,
        ...(userId ? { updatedBy: userId } : {}),
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (err) {
    if (err instanceof Error && err.message === 'INSURANCE_NOT_FOUND') return { success: false, error: 'Insurance record not found.' }
    if (err instanceof Error && err.message === 'INVALID_PAYOUT_AMOUNT') return { success: false, error: 'This insurance record does not have a valid payout amount.' }
    if (err instanceof Error && err.message === 'PAYMENT_EXCEEDS_PAYOUT') return { success: false, error: 'This payment would make the total received exceed the payout amount.' }
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
