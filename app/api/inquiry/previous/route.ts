import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { auth } from '../../../../auth'
import { buildInquiryOwnershipWhere, getInquiryOwnershipScopeForRoute } from '@/lib/access/inquiryOwnership'

function normalizeMobile(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.length > 10 ? digits.slice(-10) : digits
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ownershipScope = await getInquiryOwnershipScopeForRoute('/inquiry')
  if (!ownershipScope.userId) return NextResponse.json({ error: 'You do not have access to inquiries.' }, { status: 403 })

  const mobile = req.nextUrl.searchParams.get('mobile')?.trim() ?? ''
  const customerId = Number(req.nextUrl.searchParams.get('customerId'))
  const excludeInquiryId = Number(req.nextUrl.searchParams.get('excludeInquiryId'))
  const variantIds = (req.nextUrl.searchParams.get('variantIds') ?? '').split(',').map(Number).filter(Number.isFinite)
  const normalizedMobile = normalizeMobile(mobile)

  if (!normalizedMobile && !customerId) return NextResponse.json([])

  const whereClauses: Prisma.Sql[] = []
  if (normalizedMobile) {
    whereClauses.push(
      Prisma.sql`RIGHT(regexp_replace(COALESCE(mobileno, ''), '\D', '', 'g'), 10) = ${normalizedMobile}`,
    )
  }
  if (customerId) {
    whereClauses.push(Prisma.sql`customer_id = ${customerId}`)
  }

  const rawMatches = await prisma.$queryRaw<Array<{ inquiry_id: number }>>(Prisma.sql`
    SELECT inquiry_id
    FROM inquiry
    WHERE (${Prisma.join(whereClauses, ' OR ')})
      ${excludeInquiryId ? Prisma.sql`AND inquiry_id <> ${excludeInquiryId}` : Prisma.empty}
    ORDER BY inquiry_id DESC
    LIMIT 20
  `)

  if (rawMatches.length === 0) return NextResponse.json([])

  const rows = await prisma.inquiry.findMany({
    where: {
      AND: [
        { inquiryId: { in: rawMatches.map(row => row.inquiry_id) } },
        ...(ownershipScope.restrictToUserId
          ? [buildInquiryOwnershipWhere(ownershipScope.restrictToUserId, ownershipScope.ownershipMode)]
          : []),
      ],
    },
    include: {
      customer: { select: { custId: true, custName: true, custMobile: true, custEmail: true } },
      assignedToUser: { select: { userName: true, displayName: true } },
      createdByUser: { select: { userName: true, displayName: true } },
      inquiryCarDetails: {
        include: {
          carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } },
        },
        orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
      },
    },
    orderBy: { inquiryId: 'desc' },
  })

  const enrichedRows = rows.map(row => {
    const matchReasons: string[] = []
    const rowMobile = normalizeMobile(row.customer?.custMobile ?? row.mobileno)
    const hasSameVehicleInterest = variantIds.length > 0
      && row.inquiryCarDetails.some(car => car.fkVariantId && variantIds.includes(car.fkVariantId))

    if (normalizedMobile && rowMobile === normalizedMobile) {
      matchReasons.push('Same mobile')
    }
    if (customerId && row.customer?.custId === customerId) {
      matchReasons.push('Same linked customer')
    }
    if (hasSameVehicleInterest) matchReasons.push('Same vehicle interest')
    if ((row.status ?? '').trim().toLowerCase() !== 'closed') {
      matchReasons.push('Open inquiry')
    }

    return {
      ...row,
      inquiryOwner: row.assignedToUser?.displayName ?? row.assignedToUser?.userName ?? row.createdByUser?.displayName ?? row.createdByUser?.userName ?? 'Unassigned',
      matchReasons,
    }
  })

  return NextResponse.json(enrichedRows)
}
