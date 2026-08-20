'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'
import { sendEmail } from '@/lib/email/sendMail'
import { vehicleDetailsEmail } from '@/lib/email/templates'

export interface InventoryFormInput {
  registrationNo: string
  fkVariantId: number | null
  colour: string
  year: number | null
  fuelType: string
  noOfOwners: number | null
  kmsDriven: number | null
  price: number | null
  status: string
  customerName: string
  otherRemarks: string
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

// callers already validate fkVariantId is present before invoking this
function buildData(input: InventoryFormInput & { fkVariantId: number }) {
  return {
    registrationNo: input.registrationNo || null,
    carVariantMaster: { connect: { pkVariantId: input.fkVariantId } },
    colour: input.colour || null,
    year: input.year,
    fuelType: input.fuelType || null,
    noOfOwners: input.noOfOwners,
    kmsDriven: input.kmsDriven,
    price: input.price,
    status: input.status || null,
    customerName: input.customerName || null,
    otherRemarks: input.otherRemarks || null,
  }
}

export async function createInventory(input: InventoryFormInput): Promise<ActionResult> {
  const fkVariantId = input.fkVariantId
  if (!input.registrationNo?.trim()) {
    return { success: false, error: 'Registration number is required.' }
  }
  if (!fkVariantId) {
    return { success: false, error: 'Make, model, and variant are required.' }
  }

  const userId = await currentUserId()

  try {
    const maxId = await prisma.inventoryManagement.aggregate({ _max: { inventoryId: true } })
    const nextId = (maxId._max.inventoryId ?? 0) + 1

    await prisma.inventoryManagement.create({
      data: {
        ...buildData({ ...input, fkVariantId }),
        sku: `EC-${String(nextId).padStart(4, '0')}`,
        createdDate: new Date(),
        updatedDate: new Date(),
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inventory')
  return { success: true }
}

export async function updateInventory(id: number, input: InventoryFormInput): Promise<ActionResult> {
  const fkVariantId = input.fkVariantId
  if (!input.registrationNo?.trim()) {
    return { success: false, error: 'Registration number is required.' }
  }
  if (!fkVariantId) {
    return { success: false, error: 'Make, model, and variant are required.' }
  }

  const userId = await currentUserId()

  try {
    await prisma.inventoryManagement.update({
      where: { inventoryId: id },
      data: {
        ...buildData({ ...input, fkVariantId }),
        updatedDate: new Date(),
        ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
      },
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inventory')
  return { success: true }
}

export async function deleteInventory(id: number): Promise<ActionResult> {
  try {
    await prisma.inventoryManagement.delete({ where: { inventoryId: id } })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inventory')
  return { success: true }
}

export interface SendInventoryEmailInput {
  recipientType: 'dealer' | 'customer'
  recipientId: number
}

export async function sendInventoryEmail(inventoryId: number, input: SendInventoryEmailInput): Promise<ActionResult> {
  const session = await auth()

  const vehicle = await prisma.inventoryManagement.findUnique({
    where: { inventoryId },
    include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } },
  })
  if (!vehicle) return { success: false, error: 'Vehicle not found.' }

  let toEmail: string | null = null
  let toName = ''
  if (input.recipientType === 'dealer') {
    const dealer = await prisma.dealerMaster.findUnique({ where: { dealerId: input.recipientId } })
    toEmail = dealer?.dealerEmail ?? null
    toName = dealer?.dealerName ?? 'there'
  } else {
    const customer = await prisma.customer.findUnique({ where: { custId: input.recipientId } })
    toEmail = customer?.custEmail ?? null
    toName = customer?.custName ?? 'there'
  }
  if (!toEmail) return { success: false, error: 'This recipient has no email address on file.' }

  const { subject, html } = vehicleDetailsEmail({
    customerName: toName,
    make: vehicle.carVariantMaster?.carMakeMaster?.make ?? '',
    model: vehicle.carVariantMaster?.carModelMaster?.model ?? '',
    variant: vehicle.carVariantMaster?.variant ?? '',
    year: vehicle.year,
    colour: vehicle.colour ?? '',
    fuelType: vehicle.fuelType ?? '',
    noOfOwners: vehicle.noOfOwners,
    registrationNo: vehicle.registrationNo ?? '',
    kmsDriven: vehicle.kmsDriven ? vehicle.kmsDriven.toString() : null,
    price: vehicle.price ? vehicle.price.toString() : null,
    signedBy: session?.user?.name || 'Excel Cars Team',
  })

  return sendEmail({ to: toEmail, subject, html })
}

function describeError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return 'This registration number is already active on another vehicle in stock.'
    }
    if (err.code === 'P2003') {
      return 'This vehicle has related records (checklist, insurance, loan, RTO, or DSA entries) and cannot be deleted.'
    }
  }
  return 'Something went wrong saving this record.'
}
