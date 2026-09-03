'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { INQUIRY_SOURCE_MASTER_FUNCTION } from '@/lib/access/accessCatalog'
import type { InquirySourceActionResult, InquirySourceFormInput } from './types'
import { normalizeInquirySourceInput, validateInquirySourceInput } from './validation'

async function canManageSources() {
  return getAuthorizedActorForFunctions([INQUIRY_SOURCE_MASTER_FUNCTION])
}

async function hasDuplicate(sourceId: number | null, input: InquirySourceFormInput) {
  return prisma.inquirySourceMaster.findFirst({
    where: {
      OR: [
        { code: { equals: input.code, mode: 'insensitive' } },
        { displayName: { equals: input.displayName, mode: 'insensitive' } },
      ],
      ...(sourceId ? { NOT: { sourceId } } : {}),
    },
    select: { sourceId: true },
  })
}

function revalidateSourceMaster() {
  revalidatePath('/config/inquiry-sources')
  revalidatePath('/inquiry')
  revalidatePath('/followup')
}

export async function createInquirySource(input: InquirySourceFormInput): Promise<InquirySourceActionResult> {
  if (!await canManageSources()) return { success: false, error: 'Not authorized.' }

  const normalized = normalizeInquirySourceInput(input)
  const validationError = validateInquirySourceInput(normalized)
  if (validationError) return { success: false, error: validationError }
  if (await hasDuplicate(null, normalized)) return { success: false, error: 'A source with this code or name already exists.' }

  try {
    await prisma.inquirySourceMaster.create({ data: normalized })
  } catch (error) {
    return { success: false, error: describeSourceError(error) }
  }

  revalidateSourceMaster()
  return { success: true }
}

export async function updateInquirySource(sourceId: number, input: InquirySourceFormInput): Promise<InquirySourceActionResult> {
  if (!Number.isInteger(sourceId) || sourceId <= 0) return { success: false, error: 'Invalid source.' }
  if (!await canManageSources()) return { success: false, error: 'Not authorized.' }

  const normalized = normalizeInquirySourceInput(input)
  const validationError = validateInquirySourceInput(normalized)
  if (validationError) return { success: false, error: validationError }
  if (await hasDuplicate(sourceId, normalized)) return { success: false, error: 'A source with this code or name already exists.' }

  try {
    await prisma.inquirySourceMaster.update({ where: { sourceId }, data: normalized })
  } catch (error) {
    return { success: false, error: describeSourceError(error) }
  }

  revalidateSourceMaster()
  return { success: true }
}

export async function deleteInquirySource(sourceId: number): Promise<InquirySourceActionResult> {
  if (!Number.isInteger(sourceId) || sourceId <= 0) return { success: false, error: 'Invalid source.' }
  if (!await canManageSources()) return { success: false, error: 'Not authorized.' }

  try {
    const result = await prisma.$transaction(async tx => {
      const source = await tx.inquirySourceMaster.findUnique({
        where: { sourceId },
        select: { displayName: true, _count: { select: { inquiries: true } } },
      })
      if (!source) return { error: 'Source no longer exists.' }
      if (source._count.inquiries > 0) {
        return { error: `${source.displayName} is used by ${source._count.inquiries} inquiry record(s) and cannot be deleted.` }
      }

      await tx.legacyInquirySourceMapping.deleteMany({ where: { sourceId } })
      await tx.inquirySourceMaster.delete({ where: { sourceId } })
      return { error: null }
    })

    if (result.error) return { success: false, error: result.error }
  } catch (error) {
    return { success: false, error: describeSourceError(error) }
  }

  revalidateSourceMaster()
  return { success: true }
}

function describeSourceError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
    return 'This source is linked to existing inquiries and cannot be deleted.'
  }
  return 'Something went wrong saving this source.'
}
