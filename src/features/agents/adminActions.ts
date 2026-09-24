'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { AGENT_TYPES } from './adminQueries'
import { isValidEmail, isValidPhone } from '@/lib/validation'

export interface AgentFormInput {
  partnerType: string
  name: string
  mobile: string
  email: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

export async function createAgent(input: AgentFormInput): Promise<ActionResult> {
  if (!AGENT_TYPES.includes(input.partnerType as typeof AGENT_TYPES[number])) return { success: false, error: 'Select a valid agent type.' }
  if (!input.name.trim()) return { success: false, error: 'Name is required.' }
  if (!input.mobile.trim() && !input.email.trim()) return { success: false, error: 'Enter mobile or email.' }
  if (input.mobile.trim() && !isValidPhone(input.mobile)) return { success: false, error: 'Mobile number must contain 10 digits.' }
  if (input.email.trim() && !isValidEmail(input.email)) return { success: false, error: 'Enter a valid email address.' }

  try {
    const duplicate = await prisma.partnerMaster.findFirst({
      where: { partnerType: input.partnerType, name: input.name.trim(), mobile: input.mobile.trim() || null },
    })
    if (duplicate) return { success: false, error: 'An agent with this type, name and mobile already exists.' }

    await prisma.partnerMaster.create({
      data: {
        partnerType: input.partnerType,
        name: input.name.trim(),
        mobile: input.mobile.trim() || null,
        email: input.email.trim() || null,
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/config/agents')
  return { success: true }
}

export async function updateAgent(id: number, input: AgentFormInput): Promise<ActionResult> {
  if (!AGENT_TYPES.includes(input.partnerType as typeof AGENT_TYPES[number])) return { success: false, error: 'Select a valid agent type.' }
  if (!input.name.trim()) return { success: false, error: 'Name is required.' }
  if (!input.mobile.trim() && !input.email.trim()) return { success: false, error: 'Enter mobile or email.' }
  if (input.mobile.trim() && !isValidPhone(input.mobile)) return { success: false, error: 'Mobile number must contain 10 digits.' }
  if (input.email.trim() && !isValidEmail(input.email)) return { success: false, error: 'Enter a valid email address.' }

  try {
    const duplicate = await prisma.partnerMaster.findFirst({
      where: { partnerType: input.partnerType, name: input.name.trim(), mobile: input.mobile.trim() || null, NOT: { partnerId: id } },
    })
    if (duplicate) return { success: false, error: 'An agent with this type, name and mobile already exists.' }

    await prisma.partnerMaster.update({
      where: { partnerId: id },
      data: {
        partnerType: input.partnerType,
        name: input.name.trim(),
        mobile: input.mobile.trim() || null,
        email: input.email.trim() || null,
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/config/agents')
  return { success: true }
}

export async function deleteAgent(id: number): Promise<ActionResult> {
  try {
    await prisma.partnerMaster.delete({ where: { partnerId: id } })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/config/agents')
  return { success: true }
}

function describeError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
    return 'This agent is linked to existing transactions and cannot be deleted.'
  }
  return 'Something went wrong saving this record.'
}
