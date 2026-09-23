'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { validateChecklistInput } from './validation'

export interface DocRow {
  documentName: string
  applicable: string
  received: string
  originalCopy: string
}

export interface ChecklistFormInput {
  inventoryId: number | null
  make: string
  model: string
  variant: string
  colour: string
  registrationNo: string
  year: number | null
  fuelType: string
  customerId: number | null
  customerNameLegacy: string
  customerMobileLegacy: string
  customerEmailLegacy: string
  docs: DocRow[]
}

export interface ActionResult {
  success: boolean
  error?: string
}

function normalizeRegistration(value: string | null | undefined) {
  return (value ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

async function currentUserId(): Promise<number | null> {
  return getAuthorizedUserIdForRoute('/checklist')
}

function buildMainData(input: ChecklistFormInput) {
  return {
    make: input.make || null,
    model: input.model || null,
    variant: input.variant || null,
    colour: input.colour || null,
    registrationNo: input.registrationNo || null,
    year: input.year,
    fuelType: input.fuelType || null,
    customerNameLegacy: input.customerNameLegacy || null,
    customerMobileLegacy: input.customerMobileLegacy || null,
    customerEmailLegacy: input.customerEmailLegacy || null,
  }
}

function validDocs(docs: DocRow[]) {
  return docs.filter(d => d.documentName.trim())
}

async function validateChecklistInventory(input: ChecklistFormInput, currentDocumentId?: number): Promise<string | null> {
  if (!input.inventoryId) {
    return null
  }

  const inventory = await prisma.inventoryManagement.findUnique({
    where: { inventoryId: input.inventoryId },
    select: {
      inventoryId: true,
      registrationNo: true,
      status: true,
      customerId: true,
      customerName: true,
    },
  })

  if (!inventory) {
    return 'This vehicle no longer exists.'
  }

  if (inventory.customerId !== null && input.customerId !== inventory.customerId) {
    return 'Checklist customer must match the selected vehicle customer.'
  }

  if (inventory.customerId === null && input.customerNameLegacy.trim() && input.customerNameLegacy.trim() !== (inventory.customerName ?? '').trim()) {
    return 'Checklist customer must match the selected vehicle customer.'
  }

  if (normalizeRegistration(input.registrationNo) !== normalizeRegistration(inventory.registrationNo)) {
    return 'Selected vehicle does not match the registration number.'
  }

  const duplicate = await prisma.checkListDocMain.findFirst({
    where: {
      inventoryId: input.inventoryId,
      ...(currentDocumentId ? { documentId: { not: currentDocumentId } } : {}),
    },
    select: { documentId: true },
  })

  if (duplicate) {
    return 'A checklist already exists for this vehicle.'
  }

  return null
}

export async function createChecklist(input: ChecklistFormInput): Promise<ActionResult> {
  const inputError = validateChecklistInput(input)
  if (inputError) return { success: false, error: inputError }

  const validationError = await validateChecklistInventory(input)
  if (validationError) return { success: false, error: validationError }
  const docs = validDocs(input.docs)

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    await prisma.checkListDocMain.create({
      data: {
        ...buildMainData(input),
        ...(input.inventoryId ? { inventoryManagement: { connect: { inventoryId: input.inventoryId } } } : {}),
        ...(input.customerId ? { customer: { connect: { custId: input.customerId } } } : {}),
        createdDate: new Date(),
        updatedDate: new Date(),
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        checklistDocDetails: {
          create: docs.map(d => ({
            documentName: d.documentName,
            applicable: d.applicable,
            received: d.received,
            originalCopy: d.originalCopy,
            createdDt: new Date(),
            updatedDt: new Date(),
            ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
          })),
        },
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/checklist')
  return { success: true }
}

export async function updateChecklist(id: number, input: ChecklistFormInput): Promise<ActionResult> {
  const inputError = validateChecklistInput(input)
  if (inputError) return { success: false, error: inputError }

  const validationError = await validateChecklistInventory(input, id)
  if (validationError) return { success: false, error: validationError }

  const docs = validDocs(input.docs)

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    await prisma.$transaction(async tx => {
      await tx.checklistDocDetails.deleteMany({ where: { fkDocumentId: id } })

      await tx.checkListDocMain.update({
        where: { documentId: id },
        data: {
          ...buildMainData(input),
          inventoryId: input.inventoryId,
          customerId: input.customerId,
          updatedDate: new Date(),
          ...(userId ? { updatedBy: userId } : {}),
          checklistDocDetails: {
            create: docs.map(d => ({
              documentName: d.documentName,
              applicable: d.applicable,
              received: d.received,
              originalCopy: d.originalCopy,
              createdDt: new Date(),
              updatedDt: new Date(),
              ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
            })),
          },
        },
      })
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/checklist')
  return { success: true }
}

export async function deleteChecklist(id: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  try {
    await prisma.$transaction(async tx => {
      await tx.checklistDocDetails.deleteMany({ where: { fkDocumentId: id } })
      await tx.checkListDocMain.delete({ where: { documentId: id } })
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/checklist')
  return { success: true }
}

function describeError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2003') {
      return 'This checklist references records that no longer exist.'
    }
  }
  return 'Something went wrong saving this record.'
}
