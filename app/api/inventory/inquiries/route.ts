import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { buildInquiryOwnershipWhere, getInquiryOwnershipScopeForRoute } from '@/lib/access/inquiryOwnership'

export async function GET(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ownershipScope = await getInquiryOwnershipScopeForRoute('/inventory')
  if (!ownershipScope.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const make = req.nextUrl.searchParams.get('make')?.trim() ?? ''
  const model = req.nextUrl.searchParams.get('model')?.trim() ?? ''
  const variant = req.nextUrl.searchParams.get('variant')?.trim() ?? ''
  const vehicleConditions = [
    make ? {
      OR: [
        { makeLegacy: { contains: make, mode: 'insensitive' as const } },
        { carVariantMaster: { carMakeMaster: { make: { contains: make, mode: 'insensitive' as const } } } },
      ],
    } : null,
    model ? {
      OR: [
        { modelLegacy: { contains: model, mode: 'insensitive' as const } },
        { carVariantMaster: { carModelMaster: { model: { contains: model, mode: 'insensitive' as const } } } },
      ],
    } : null,
    variant ? {
      OR: [
        { variantLegacy: { contains: variant, mode: 'insensitive' as const } },
        { carVariantMaster: { variant: { contains: variant, mode: 'insensitive' as const } } },
      ],
    } : null,
  ].filter((condition): condition is NonNullable<typeof condition> => condition !== null)
  const inquiryCarWhere = vehicleConditions.length > 0 ? { AND: vehicleConditions } : undefined

  const where = {
    // Inventory can only be linked to an active enquiry. This includes Open
    // and FollowUp leads, but never a Closed lead.
    status: { not: 'Closed' },
    ...(ownershipScope.restrictToUserId
      ? { AND: [buildInquiryOwnershipWhere(ownershipScope.restrictToUserId, ownershipScope.ownershipMode)] }
      : {}),
    ...(inquiryCarWhere ? { inquiryCarDetails: { some: inquiryCarWhere } } : {}),
    ...(q
      ? {
          OR: [
          { inquiryNo: { contains: q, mode: 'insensitive' as const } },
          { customerNameLegacy: { contains: q, mode: 'insensitive' as const } },
          { mobileno: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
          { customer: { custName: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const rows = await prisma.inquiry.findMany({
    where,
    include: {
      customer: { select: { custId: true, custName: true, custMobile: true, custEmail: true } },
      inquiryCarDetails: {
        ...(inquiryCarWhere ? { where: inquiryCarWhere } : {}),
        include: {
          carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } },
        },
        orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
      },
    },
    orderBy: { inquiryId: 'desc' },
    take: 20,
  })

  return NextResponse.json(rows)
}
