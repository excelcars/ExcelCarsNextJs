'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { auth } from '../../../auth'
import { prisma } from '@/lib/db/prisma'
import { isValidPhone } from '@/lib/validation'
import { isStringRecord, passwordPolicyError, PROFILE_FIELD_LIMITS } from '@/lib/profileValidation'

export interface UpdateMyProfileInput {
  empFirstName: string
  empLastName: string
  empGender: string
  empMobileNo: string
  empPhoneNo: string
  empAddress: string
  empCity: string
  empStateLegacy: string
  empPincode: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordResult {
  success: boolean
  error?: string
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

const PROFILE_STRING_FIELDS = [
  'empFirstName', 'empLastName', 'empGender', 'empMobileNo', 'empPhoneNo',
  'empAddress', 'empCity', 'empStateLegacy', 'empPincode',
] as const

class EmployeeOwnershipError extends Error {}

function hasProfileStringFields(input: unknown): input is UpdateMyProfileInput {
  return isStringRecord(input) && PROFILE_STRING_FIELDS.every(field => typeof input[field] === 'string')
}

function profileInputError(input: UpdateMyProfileInput): string | null {
  const limits: Array<[keyof UpdateMyProfileInput, number]> = [
    ['empFirstName', PROFILE_FIELD_LIMITS.firstName],
    ['empLastName', PROFILE_FIELD_LIMITS.lastName],
    ['empGender', PROFILE_FIELD_LIMITS.gender],
    ['empMobileNo', PROFILE_FIELD_LIMITS.mobile],
    ['empPhoneNo', PROFILE_FIELD_LIMITS.phone],
    ['empAddress', PROFILE_FIELD_LIMITS.address],
    ['empCity', PROFILE_FIELD_LIMITS.city],
    ['empStateLegacy', PROFILE_FIELD_LIMITS.state],
    ['empPincode', PROFILE_FIELD_LIMITS.pincode],
  ]
  const exceeded = limits.find(([field, limit]) => input[field].trim().length > limit)
  if (exceeded) {
    const labels: Partial<Record<keyof UpdateMyProfileInput, string>> = {
      empFirstName: 'First name', empLastName: 'Last name', empGender: 'Gender',
      empMobileNo: 'Mobile', empPhoneNo: 'Phone', empAddress: 'Address',
      empCity: 'City', empStateLegacy: 'State', empPincode: 'Pincode',
    }
    return `${labels[exceeded[0]] ?? exceeded[0]} must be ${exceeded[1]} characters or fewer.`
  }
  return null
}

export async function updateMyProfile(input: UpdateMyProfileInput): Promise<ChangePasswordResult> {
  const session = await auth()
  const sessionUserId = session?.user?.id
  const userId = sessionUserId ? Number(sessionUserId) : NaN

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, error: 'Your session has expired. Please sign in again.' }
  }

  if (!hasProfileStringFields(input)) {
    return { success: false, error: 'Profile information is invalid.' }
  }

  const firstName = input.empFirstName.trim()
  const lastName = input.empLastName.trim()
  const mobile = input.empMobileNo.trim()
  const phone = input.empPhoneNo.trim()
  const pincode = input.empPincode.trim()

  if (!firstName || !lastName) return { success: false, error: 'First name and last name are required.' }
  const fieldLimitError = profileInputError(input)
  if (fieldLimitError) return { success: false, error: fieldLimitError }
  if (!isValidPhone(mobile) || !isValidPhone(phone)) return { success: false, error: 'Mobile and phone numbers must contain 10 digits.' }
  if (pincode && !/^\d{6}$/.test(pincode)) return { success: false, error: 'Pincode must contain 6 digits.' }
  if (input.empGender && !['M', 'F'].includes(input.empGender)) return { success: false, error: 'Select a valid gender.' }

  const existing = await prisma.userTable.findUnique({ where: { userId }, select: { empId: true } })
  if (!existing) return { success: false, error: 'Account not found.' }

  const now = new Date()
  try {
    await prisma.$transaction(async transaction => {
      const employeeData = {
        empFirstName: firstName,
        empLastName: lastName,
        empGender: nullable(input.empGender),
        empMobileNo: nullable(mobile),
        empPhoneNo: nullable(phone),
        empAddress: nullable(input.empAddress),
        empCity: nullable(input.empCity),
        empStateLegacy: nullable(input.empStateLegacy),
        empPincode: nullable(pincode),
        updatedDate: now,
        updatedBy: userId,
      }

      if (existing.empId) {
        const otherAccount = await transaction.userTable.findFirst({
          where: { empId: existing.empId, NOT: { userId } },
          select: { userId: true },
        })
        if (otherAccount) throw new EmployeeOwnershipError('Employee record is linked to another account.')
        await transaction.addEmployee.update({ where: { empId: existing.empId }, data: employeeData })
      } else {
        const employee = await transaction.addEmployee.create({
          data: { ...employeeData, createdDate: now, createdBy: userId },
        })
        await transaction.userTable.update({ where: { userId }, data: { empId: employee.empId } })
      }

      await transaction.userTable.update({
        where: { userId },
        data: {
          displayName: `${firstName} ${lastName}`,
          updatedDate: now,
          updatedBy: userId,
        },
      })
    })
  } catch (error) {
    if (error instanceof EmployeeOwnershipError) {
      return { success: false, error: 'This employee record is linked to another user account.' }
    }
    return { success: false, error: 'Could not update your profile. Please try again.' }
  }

  revalidatePath('/profile')
  return { success: true }
}

export async function changeMyPassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
  const session = await auth()
  const sessionUserId = session?.user?.id
  const userId = sessionUserId ? Number(sessionUserId) : NaN

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, error: 'Your session has expired. Please sign in again.' }
  }

  if (!isStringRecord(input) || !['currentPassword', 'newPassword', 'confirmPassword'].every(field => typeof input[field] === 'string')) {
    return { success: false, error: 'Password information is invalid.' }
  }
  if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
    return { success: false, error: 'All password fields are required.' }
  }
  if ([input.currentPassword, input.newPassword, input.confirmPassword].some(password => password.length > PROFILE_FIELD_LIMITS.password)) {
    return { success: false, error: `Password must be ${PROFILE_FIELD_LIMITS.password} characters or fewer.` }
  }
  if (input.newPassword !== input.confirmPassword) {
    return { success: false, error: 'New password and confirmation do not match.' }
  }
  if (input.currentPassword === input.newPassword) {
    return { success: false, error: 'New password must be different from your current password.' }
  }

  const policyError = passwordPolicyError(input.newPassword)
  if (policyError) return { success: false, error: policyError }

  const user = await prisma.userTable.findUnique({
    where: { userId },
    select: { passwordHash: true },
  })

  if (!user?.passwordHash) return { success: false, error: 'Password change is unavailable for this account.' }

  const currentPasswordMatches = await bcrypt.compare(input.currentPassword, user.passwordHash)
  if (!currentPasswordMatches) return { success: false, error: 'Current password is incorrect.' }

  try {
    const passwordHash = await bcrypt.hash(input.newPassword, 12)
    await prisma.userTable.update({
      where: { userId },
      data: {
        passwordHash,
        authVersion: { increment: 1 },
        updatedDate: new Date(),
        updatedBy: userId,
      },
    })
  } catch {
    return { success: false, error: 'Could not update your password. Please try again.' }
  }

  revalidatePath('/profile')
  return { success: true }
}
