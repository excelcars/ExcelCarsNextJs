'use server'

import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { canManageUserAccessTarget, getUserAccessActor } from './permissions'

export interface UserAccessFormInput {
  empFirstName: string
  empLastName: string
  empGender: string
  empMobileNo: string
  empPhoneNo: string
  empEmailId: string
  empAddress: string
  empCity: string
  fkStateId: number | null
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_RE = /^\d{10}$/
const PHONE_RE = /^\d{6,10}$/
const PINCODE_RE = /^\d{6}$/
const USERNAME_RE = /^[A-Za-z0-9._-]{4,50}$/
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/
const VALID_GENDERS = new Set(['M', 'F'])
const USER_ACCESS_LOG = 'useraccess'

function normalizeForm(input: UserAccessFormInput): UserAccessFormInput {
  return {
    ...input,
    empFirstName: input.empFirstName.trim(),
    empLastName: input.empLastName.trim(),
    empGender: input.empGender.trim().toUpperCase(),
    empMobileNo: input.empMobileNo.trim(),
    empPhoneNo: input.empPhoneNo.trim(),
    empEmailId: input.empEmailId.trim(),
    empAddress: input.empAddress.trim(),
    empCity: input.empCity.trim(),
    empPincode: input.empPincode.trim(),
    userName: input.userName.trim(),
    password: input.password,
    status: input.status.trim(),
  }
}

function validateUserAccessInput(input: UserAccessFormInput, mode: 'create' | 'update'): string | null {
  if (!input.empFirstName || !input.empLastName || !input.empMobileNo || !input.empEmailId) {
    return 'First name, last name, mobile, and email are required.'
  }
  if (mode === 'create' && (!input.userName || !input.password.trim())) {
    return 'Username and password are required.'
  }
  if (!input.roleId) {
    return 'Select a role.'
  }
  if (!VALID_GENDERS.has(input.empGender)) {
    return 'Gender must be M or F.'
  }
  if (!MOBILE_RE.test(input.empMobileNo)) {
    return 'Mobile number must be exactly 10 digits.'
  }
  if (input.empPhoneNo && !PHONE_RE.test(input.empPhoneNo)) {
    return 'Phone number must be 6 to 10 digits.'
  }
  if (!EMAIL_RE.test(input.empEmailId)) {
    return 'Enter a valid email address.'
  }
  if (input.empPincode && !PINCODE_RE.test(input.empPincode)) {
    return 'Pincode must be exactly 6 digits.'
  }
  if (!USERNAME_RE.test(input.userName)) {
    return 'Username must be 4 to 50 characters and use only letters, numbers, dots, underscores, or hyphens.'
  }
  if (mode === 'create' && !PASSWORD_RE.test(input.password.trim())) {
    return 'Password must be 8 to 100 characters and include at least one letter and one number.'
  }
  if (mode === 'update' && input.password.trim() && !PASSWORD_RE.test(input.password.trim())) {
    return 'New password must be 8 to 100 characters and include at least one letter and one number.'
  }
  return null
}

function logUserAccessError(action: 'create' | 'update' | 'deactivate', error: unknown, context: Record<string, unknown>) {
  const errorId = `${USER_ACCESS_LOG}-${randomUUID()}`
  console.error(`[${USER_ACCESS_LOG}] ${action} failed`, {
    errorId,
    action,
    ...context,
    error,
  })
  return errorId
}

export async function createUserAccount(input: UserAccessFormInput): Promise<ActionResult> {
  const normalized = normalizeForm(input)
  const validationError = validateUserAccessInput(normalized, 'create')
  if (validationError) return { success: false, error: validationError }
  const roleId = normalized.roleId as number

  const me = await getUserAccessActor()
  if (!me) return { success: false, error: 'Not authorized.' }
  if (roleId <= me.roleId) {
    return { success: false, error: 'You can only assign a role below your own.' }
  }

  const dupUser = await prisma.userTable.findFirst({ where: { userName: normalized.userName } })
  if (dupUser) return { success: false, error: 'This username is already taken.' }

  const role = await prisma.roleMaster.findUnique({ where: { roleId } })
  if (!role) return { success: false, error: 'Selected role no longer exists.' }
  const state = normalized.fkStateId
    ? await prisma.indianStatesMaster.findUnique({ where: { stateId: normalized.fkStateId } })
    : null

  try {
    const passwordHash = await bcrypt.hash(normalized.password.trim(), 10)
    const now = new Date()
    await prisma.$transaction(async (tx) => {
      const employee = await tx.addEmployee.create({
        data: {
          empFirstName: normalized.empFirstName,
          empLastName: normalized.empLastName,
          empGender: normalized.empGender || null,
          empMobileNo: normalized.empMobileNo || null,
          empPhoneNo: normalized.empPhoneNo || null,
          empEmailId: normalized.empEmailId || null,
          empAddress: normalized.empAddress || null,
          empCity: normalized.empCity || null,
          fkStateId: state?.stateId ?? null,
          empStateLegacy: state?.statename ?? null,
          empPincode: normalized.empPincode || null,
          createdDate: now,
          updatedDate: now,
          createdBy: me.userId,
          updatedBy: me.userId,
        },
      })

      await tx.userTable.create({
        data: {
          userName: normalized.userName,
          passwordHash,
          roleId,
          roleName: role.roleName,
          status: 'Active',
          empId: employee.empId,
          displayName: `${normalized.empFirstName} ${normalized.empLastName}`,
          emailId: normalized.empEmailId || null,
          createdDate: now,
          updatedDate: now,
          createdBy: me.userId,
          updatedBy: me.userId,
        },
      })
    })
  } catch (error) {
    const errorId = logUserAccessError('create', error, {
      actorUserId: me.userId,
      userName: normalized.userName,
      roleId,
      empEmailId: normalized.empEmailId,
    })
    return { success: false, error: `Something went wrong creating this account. Reference: ${errorId}` }
  }

  revalidatePath('/config/user-access')
  return { success: true }
}

export async function updateUserAccount(userId: number, input: UserAccessFormInput): Promise<ActionResult> {
  const normalized = normalizeForm(input)
  const validationError = validateUserAccessInput(normalized, 'update')
  if (validationError) return { success: false, error: validationError }
  const roleId = normalized.roleId as number

  const me = await getUserAccessActor()
  if (!me) return { success: false, error: 'Not authorized.' }
  if (roleId <= me.roleId) {
    return { success: false, error: 'You can only assign a role below your own.' }
  }

  if (!await canManageUserAccessTarget(me, userId)) {
    return { success: false, error: 'You are not authorized to manage this account.' }
  }

  const role = await prisma.roleMaster.findUnique({ where: { roleId } })
  if (!role) return { success: false, error: 'Selected role no longer exists.' }
  const state = normalized.fkStateId
    ? await prisma.indianStatesMaster.findUnique({ where: { stateId: normalized.fkStateId } })
    : null
  const now = new Date()

  try {
    const existing = await prisma.userTable.findUnique({ where: { userId } })
    if (!existing) return { success: false, error: 'Account not found.' }

    if (existing.empId) {
      await prisma.addEmployee.update({
        where: { empId: existing.empId },
        data: {
          empFirstName: normalized.empFirstName,
          empLastName: normalized.empLastName,
          empGender: normalized.empGender || null,
          empMobileNo: normalized.empMobileNo || null,
          empPhoneNo: normalized.empPhoneNo || null,
          empEmailId: normalized.empEmailId || null,
          empAddress: normalized.empAddress || null,
          empCity: normalized.empCity || null,
          fkStateId: state?.stateId ?? null,
          empStateLegacy: state?.statename ?? null,
          empPincode: normalized.empPincode || null,
          updatedDate: now,
          updatedBy: me.userId,
        },
      })
    }

    const passwordHash = normalized.password.trim() ? await bcrypt.hash(normalized.password.trim(), 10) : undefined

    await prisma.userTable.update({
      where: { userId },
      data: {
        roleId,
        roleName: role.roleName,
        status: normalized.status || 'Active',
        displayName: `${normalized.empFirstName} ${normalized.empLastName}`,
        emailId: normalized.empEmailId || null,
        updatedDate: now,
        updatedBy: me.userId,
        ...(passwordHash ? { passwordHash } : {}),
      },
    })
  } catch (error) {
    const errorId = logUserAccessError('update', error, {
      actorUserId: me.userId,
      targetUserId: userId,
      roleId,
      status: normalized.status || 'Active',
      empEmailId: normalized.empEmailId,
    })
    return { success: false, error: `Something went wrong saving this account. Reference: ${errorId}` }
  }

  revalidatePath('/config/user-access')
  return { success: true }
}

export async function deactivateUserAccount(userId: number): Promise<ActionResult> {
  const me = await getUserAccessActor()
  if (!me) return { success: false, error: 'Not authorized.' }
  if (!await canManageUserAccessTarget(me, userId)) {
    return { success: false, error: 'You are not authorized to manage this account.' }
  }
  const now = new Date()

  try {
    await prisma.userTable.update({
      where: { userId },
      data: {
        status: 'Inactive',
        updatedDate: now,
        updatedBy: me.userId,
      },
    })
  } catch (error) {
    const errorId = logUserAccessError('deactivate', error, {
      actorUserId: me.userId,
      targetUserId: userId,
    })
    return { success: false, error: `Could not deactivate this account. Reference: ${errorId}` }
  }

  revalidatePath('/config/user-access')
  return { success: true }
}
