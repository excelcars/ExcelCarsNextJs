'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'

export interface UserAccessFormInput {
  empFirstName: string
  empLastName: string
  empGender: string
  empMobileNo: string
  empPhoneNo: string
  empEmailId: string
  empAddress: string
  empCity: string
  empPincode: string
  userName: string
  password: string
  roleId: number | null
  status: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

async function currentUser(): Promise<{ userId: number; roleId: number | null } | null> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null
  const user = await prisma.userTable.findUnique({ where: { userId: Number(id) }, select: { userId: true, roleId: true } })
  return user
}

export async function createUserAccount(input: UserAccessFormInput): Promise<ActionResult> {
  if (!input.empFirstName.trim() || !input.empLastName.trim() || !input.empMobileNo.trim() || !input.empEmailId.trim()) {
    return { success: false, error: 'First name, last name, mobile, and email are required.' }
  }
  if (!input.userName.trim() || !input.password.trim()) {
    return { success: false, error: 'Username and password are required.' }
  }
  if (!input.roleId) {
    return { success: false, error: 'Select a role.' }
  }

  const me = await currentUser()
  if (!me) return { success: false, error: 'Not authenticated.' }
  if (me.roleId != null && input.roleId <= me.roleId) {
    return { success: false, error: 'You can only assign a role below your own.' }
  }

  const dupUser = await prisma.userTable.findFirst({ where: { userName: input.userName.trim() } })
  if (dupUser) return { success: false, error: 'This username is already taken.' }

  const role = await prisma.roleMaster.findUnique({ where: { roleId: input.roleId } })

  try {
    const passwordHash = await bcrypt.hash(input.password, 10)
    const now = new Date()

    const employee = await prisma.addEmployee.create({
      data: {
        empFirstName: input.empFirstName.trim(),
        empLastName: input.empLastName.trim(),
        empGender: input.empGender || null,
        empMobileNo: input.empMobileNo || null,
        empPhoneNo: input.empPhoneNo || null,
        empEmailId: input.empEmailId || null,
        empAddress: input.empAddress || null,
        empCity: input.empCity || null,
        empPincode: input.empPincode || null,
        createdDate: now,
        updatedDate: now,
        createdBy: me.userId,
        updatedBy: me.userId,
      },
    })

    await prisma.userTable.create({
      data: {
        userName: input.userName.trim(),
        passwordHash,
        roleId: input.roleId,
        roleName: role?.roleName ?? null,
        status: 'Active',
        empId: employee.empId,
        displayName: `${input.empFirstName.trim()} ${input.empLastName.trim()}`,
        emailId: input.empEmailId || null,
        createdDate: now,
        updatedDate: now,
        createdBy: me.userId,
        updatedBy: me.userId,
      },
    })
  } catch {
    return { success: false, error: 'Something went wrong creating this account.' }
  }

  revalidatePath('/config/user-access')
  return { success: true }
}

export async function updateUserAccount(userId: number, input: UserAccessFormInput): Promise<ActionResult> {
  if (!input.empFirstName.trim() || !input.empLastName.trim() || !input.empMobileNo.trim() || !input.empEmailId.trim()) {
    return { success: false, error: 'First name, last name, mobile, and email are required.' }
  }
  if (!input.roleId) {
    return { success: false, error: 'Select a role.' }
  }

  const me = await currentUser()
  if (!me) return { success: false, error: 'Not authenticated.' }
  if (me.roleId != null && input.roleId <= me.roleId) {
    return { success: false, error: 'You can only assign a role below your own.' }
  }

  const role = await prisma.roleMaster.findUnique({ where: { roleId: input.roleId } })
  const now = new Date()

  try {
    const existing = await prisma.userTable.findUnique({ where: { userId } })
    if (!existing) return { success: false, error: 'Account not found.' }

    if (existing.empId) {
      await prisma.addEmployee.update({
        where: { empId: existing.empId },
        data: {
          empFirstName: input.empFirstName.trim(),
          empLastName: input.empLastName.trim(),
          empGender: input.empGender || null,
          empMobileNo: input.empMobileNo || null,
          empPhoneNo: input.empPhoneNo || null,
          empEmailId: input.empEmailId || null,
          empAddress: input.empAddress || null,
          empCity: input.empCity || null,
          empPincode: input.empPincode || null,
          updatedDate: now,
          updatedBy: me.userId,
        },
      })
    }

    const passwordHash = input.password.trim() ? await bcrypt.hash(input.password, 10) : undefined

    await prisma.userTable.update({
      where: { userId },
      data: {
        roleId: input.roleId,
        roleName: role?.roleName ?? null,
        status: input.status || 'Active',
        displayName: `${input.empFirstName.trim()} ${input.empLastName.trim()}`,
        emailId: input.empEmailId || null,
        updatedDate: now,
        updatedBy: me.userId,
        ...(passwordHash ? { passwordHash } : {}),
      },
    })
  } catch {
    return { success: false, error: 'Something went wrong saving this account.' }
  }

  revalidatePath('/config/user-access')
  return { success: true }
}

export async function deactivateUserAccount(userId: number): Promise<ActionResult> {
  try {
    await prisma.userTable.update({ where: { userId }, data: { status: 'Inactive' } })
  } catch {
    return { success: false, error: 'Could not deactivate this account.' }
  }

  revalidatePath('/config/user-access')
  return { success: true }
}
