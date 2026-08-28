'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { auth } from '../../../auth'
import { prisma } from '@/lib/db/prisma'

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordResult {
  success: boolean
  error?: string
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
