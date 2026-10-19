import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { isValidEmail, isValidPhone } from '@/lib/validation'
import { resolveTrackedVehicleByToken } from '@/features/vehicleEmailLinks/service'

const MAX_MESSAGE_LENGTH = 2000

function normalizeMobile(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

async function findCustomerByMobile(mobile: string) {
  const normalizedMobile = normalizeMobile(mobile)
  if (!normalizedMobile) return null
  const rows = await prisma.$queryRaw<Array<{ cust_id: number }>>(Prisma.sql`
    SELECT cust_id FROM customer
    WHERE RIGHT(regexp_replace(COALESCE(cust_mobile, ''), '\\D', '', 'g'), 10) = ${normalizedMobile}
    ORDER BY cust_id DESC LIMIT 1
  `)
  if (!rows.length) return null
  return prisma.customer.findUnique({
    where: { custId: rows[0].cust_id },
    select: { custId: true, custName: true, custMobile: true, custEmail: true },
  })
}

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

  const vehicle = trackedLink.inventoryManagement
  const now = new Date()

  // Links sent from an existing inquiry already identify the sales record. Some
  // inventory-email links predate that relation, so fall back to an active
  // inquiry for the same customer and vehicle before creating a new lead.
  const linkedInquiry = trackedLink.inquiryId
    ? await prisma.inquiry.findUnique({
        where: { inquiryId: trackedLink.inquiryId },
        select: { inquiryId: true, inquiryNo: true },
      })
    : trackedLink.customerId
      ? await prisma.inquiry.findFirst({
          where: {
            customerId: trackedLink.customerId,
            status: { not: 'Closed' },
            OR: [
              { inquiryInventoryLinks: { some: { inventoryId: vehicle.inventoryId, isActive: true } } },
              ...(vehicle.fkVariantId ? [{ inquiryCarDetails: { some: { fkVariantId: vehicle.fkVariantId } } }] : []),
            ],
          },
          select: { inquiryId: true, inquiryNo: true },
          orderBy: [{ updatedDt: 'desc' }, { inquiryId: 'desc' }],
        })
      : null

  if (linkedInquiry) {
      try {
        await prisma.$transaction([
          prisma.inquiry.update({
            where: { inquiryId: linkedInquiry.inquiryId },
            data: { updatedDt: now },
          }),
          prisma.inquiryActivityLog.create({
            data: {
              inquiryId: linkedInquiry.inquiryId,
              eventType: 'public_vehicle_enquiry_received',
              eventLabel: 'Customer enquired from vehicle link',
              eventDetail: [
                `Vehicle ${vehicle.inventoryNumber ?? `#${vehicle.inventoryId}`}`,
                name ? `Submitted by ${name}` : '',
                message || '',
              ].filter(Boolean).join(' · '),
              inventoryId: vehicle.inventoryId,
              createdAt: now,
            },
          }),
        ])
      } catch (error) {
        console.error('Public vehicle enquiry could not be added to the linked inquiry:', error)
        return NextResponse.json({ error: 'Could not submit your enquiry. Please try again or contact us by phone.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, inquiryId: linkedInquiry.inquiryId, reusedInquiry: true })
  }

  const matchingCustomer = await findCustomerByMobile(phone)
  if (matchingCustomer) {
    const activeInquiry = await prisma.inquiry.findFirst({
      where: { customerId: matchingCustomer.custId, status: { not: 'Closed' } },
      orderBy: [{ updatedDt: 'desc' }, { inquiryId: 'desc' }],
      select: {
        inquiryId: true,
        inquiryNo: true,
        inquiryCarDetails: { where: vehicle.fkVariantId ? { fkVariantId: vehicle.fkVariantId } : undefined, select: { inquiryCarDetailsId: true } },
        inquiryInventoryLinks: { where: { inventoryId: vehicle.inventoryId, isActive: true }, select: { inquiryInventoryLinkId: true } },
      },
    })

    if (activeInquiry) {
      try {
        await prisma.$transaction(async tx => {
          await tx.inquiry.update({ where: { inquiryId: activeInquiry.inquiryId }, data: { updatedDt: now } })
          if (!activeInquiry.inquiryCarDetails.length) {
            await tx.inquiryCarDetails.create({ data: {
              fkInquiryId: activeInquiry.inquiryId,
              fkVariantId: vehicle.fkVariantId,
              makeLegacy: vehicle.makeLegacy,
              modelLegacy: vehicle.modelLegacy,
              variantLegacy: vehicle.variantLegacy,
              year: vehicle.year,
              createdDt: now,
              updatedDt: now,
            } })
          }
          if (!activeInquiry.inquiryInventoryLinks.length) {
            await tx.inquiryInventoryLink.create({ data: {
              inquiryId: activeInquiry.inquiryId,
              inventoryId: vehicle.inventoryId,
              linkType: 'enquired',
              isActive: true,
              createdAt: now,
              updatedAt: now,
            } })
          }
          await tx.inquiryActivityLog.create({ data: {
            inquiryId: activeInquiry.inquiryId,
            eventType: 'public_vehicle_enquiry_received',
            eventLabel: 'Customer enquired from vehicle link',
            eventDetail: [`Vehicle ${vehicle.inventoryNumber ?? `#${vehicle.inventoryId}`}`, `Matched existing mobile ${normalizeMobile(phone)}`, message].filter(Boolean).join(' · '),
            inventoryId: vehicle.inventoryId,
            createdAt: now,
          } })
        })
      } catch (error) {
        console.error('Public vehicle enquiry could not be added to the existing inquiry:', error)
        return NextResponse.json({ error: 'Could not submit your enquiry. Please try again or contact us by phone.' }, { status: 500 })
      }
      return NextResponse.json({ success: true, inquiryId: activeInquiry.inquiryId, reusedInquiry: true })
    }
  }

  const source = await prisma.inquirySourceMaster.findUnique({
    where: { code: 'EXCEL_CARS_MUMBAI' },
    select: { sourceId: true, displayName: true },
  })
  if (!source) {
    return NextResponse.json({ error: 'Enquiries are temporarily unavailable. Please call or WhatsApp us instead.' }, { status: 503 })
  }

  const inquiryNo = `WEB-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`

  try {
    await prisma.inquiry.create({
      data: {
        inquiryNo,
        dateOfInquiry: now,
        website: source.displayName,
        sourceId: source.sourceId,
        sourceDetail: `Public vehicle page — ${vehicle.inventoryNumber ?? `Inventory #${vehicle.inventoryId}`}`,
        customerId: matchingCustomer?.custId ?? null,
        customerNameLegacy: matchingCustomer?.custName || name,
        mobileno: matchingCustomer?.custMobile || phone,
        email: matchingCustomer?.custEmail || email || null,
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
