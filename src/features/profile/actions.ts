'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { auth } from '../../../auth'
import { prisma } from '@/lib/db/prisma'
import { isValidPhone } from '@/lib/validation'

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

export async function updateMyProfile(input: UpdateMyProfileInput): Promise<ChangePasswordResult> {
  const session = await auth()
  const sessionUserId = session?.user?.id
  const userId = sessionUserId ? Number(sessionUserId) : NaN

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, error: 'Your session has expired. Please sign in again.' }
  }

  const firstName = input.empFirstName.trim()
  const lastName = input.empLastName.trim()
  const mobile = input.empMobileNo.trim()
  const phone = input.empPhoneNo.trim()
  const pincode = input.empPincode.trim()

  if (!firstName || !lastName) return { success: false, error: 'First name and last name are required.' }
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
  } catch {
    return { success: false, error: 'Could not update your profile. Please try again.' }
  }

  revalidatePath('/profile')
  return { success: true }
}

function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.'
  if (!/\d/.test(password)) return 'Password must include a number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character.'
  return null
}

export async function changeMyPassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
  const session = await auth()
  const sessionUserId = session?.user?.id
  const userId = sessionUserId ? Number(sessionUserId) : NaN

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, error: 'Your session has expired. Please sign in again.' }
  }
  if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
    return { success: false, error: 'All password fields are required.' }
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
