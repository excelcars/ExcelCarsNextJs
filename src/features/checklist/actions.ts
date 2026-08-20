'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'

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

async function currentUserId(): Promise<number | null> {
  const session = await auth()
  const id = session?.user?.id
  return id ? Number(id) : null
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

export async function createChecklist(input: ChecklistFormInput): Promise<ActionResult> {
  if (!input.inventoryId) {
    return { success: false, error: 'Select a vehicle.' }
  }
  const docs = validDocs(input.docs)
  if (docs.length === 0) {
    return { success: false, error: 'Add at least one document.' }
  }

  const userId = await currentUserId()

  try {
    await prisma.checkListDocMain.create({
      data: {
        ...buildMainData(input),
        inventoryManagement: { connect: { inventoryId: input.inventoryId } },
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
  if (!input.inventoryId) {
    return { success: false, error: 'Select a vehicle.' }
  }
  const docs = validDocs(input.docs)
  if (docs.length === 0) {
    return { success: false, error: 'Add at least one document.' }
  }

  const userId = await currentUserId()

  try {
    await prisma.checklistDocDetails.deleteMany({ where: { fkDocumentId: id } })

    await prisma.checkListDocMain.update({
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
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/checklist')
  return { success: true }
}

export async function deleteChecklist(id: number): Promise<ActionResult> {
  try {
    await prisma.checklistDocDetails.deleteMany({ where: { fkDocumentId: id } })
    await prisma.checkListDocMain.delete({ where: { documentId: id } })
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
