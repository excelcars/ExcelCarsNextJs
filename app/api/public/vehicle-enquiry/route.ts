import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { isValidEmail, isValidPhone } from '@/lib/validation'
import { resolveTrackedVehicleByToken } from '@/features/vehicleEmailLinks/service'

const MAX_MESSAGE_LENGTH = 2000

function value(body: Record<string, unknown>, key: string) {
  return typeof body[key] === 'string' ? body[key].trim() : ''
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid enquiry details.' }, { status: 400 })
  }

  const values = body as Record<string, unknown>
  const token = value(values, 'token')
  const name = value(values, 'name')
  const phone = value(values, 'phone')
  const email = value(values, 'email')
  const message = value(values, 'message')

  if (!token || !name || !phone) {
    return NextResponse.json({ error: 'Name and mobile number are required.' }, { status: 400 })
  }
  if (name.length > 120 || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Please shorten the details and try again.' }, { status: 400 })
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: 'Enter a valid mobile number.' }, { status: 400 })
  }
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const trackedLink = await resolveTrackedVehicleByToken(token)
  if (!trackedLink) {
    return NextResponse.json({ error: 'This vehicle link is no longer available.' }, { status: 404 })
  }

  const source = await prisma.inquirySourceMaster.findUnique({
    where: { code: 'EXCEL_CARS_MUMBAI' },
    select: { sourceId: true, displayName: true },
  })
  if (!source) {
    return NextResponse.json({ error: 'Enquiries are temporarily unavailable. Please call or WhatsApp us instead.' }, { status: 503 })
  }

  const vehicle = trackedLink.inventoryManagement
  const now = new Date()
  const inquiryNo = `WEB-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`

  try {
    await prisma.inquiry.create({
      data: {
        inquiryNo,
        dateOfInquiry: now,
        website: source.displayName,
        sourceId: source.sourceId,
        sourceDetail: `Public vehicle page — ${vehicle.inventoryNumber ?? `Inventory #${vehicle.inventoryId}`}`,
        customerNameLegacy: name,
        mobileno: phone,
        email: email || null,
        classification: 'Warm',
        status: 'Open',
        remark: message || `Enquiry received from the public vehicle page for ${vehicle.inventoryNumber ?? `inventory #${vehicle.inventoryId}`}.`,
        createdDt: now,
        updatedDt: now,
        inquiryCarDetails: {
          create: {
            fkVariantId: vehicle.fkVariantId,
            makeLegacy: vehicle.makeLegacy,
            modelLegacy: vehicle.modelLegacy,
            variantLegacy: vehicle.variantLegacy,
            year: vehicle.year,
            createdDt: now,
            updatedDt: now,
          },
        },
        inquiryInventoryLinks: {
          create: {
            inventoryId: vehicle.inventoryId,
            linkType: 'enquired',
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    })
  } catch (error) {
    console.error('Public vehicle enquiry could not be saved:', error)
    return NextResponse.json({ error: 'Could not submit your enquiry. Please try again or contact us by phone.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
