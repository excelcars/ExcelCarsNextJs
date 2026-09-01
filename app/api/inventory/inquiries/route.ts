import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'

export async function GET(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const variantId = Number(req.nextUrl.searchParams.get('variantId'))
  if (!Number.isInteger(variantId) || variantId <= 0) {
    return NextResponse.json({ error: 'A linked inventory Variant is required.' }, { status: 400 })
  }

  const where = {
    AND: [
      { inquiryCarDetails: { some: { fkVariantId: variantId } } },
      ...(q ? [{
        OR: [
          { inquiryNo: { contains: q, mode: 'insensitive' as const } },
          { customerNameLegacy: { contains: q, mode: 'insensitive' as const } },
          { mobileno: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
          { customer: { custName: { contains: q, mode: 'insensitive' as const } } },
        ],
      }] : []),
    ],
  }

  const rows = await prisma.inquiry.findMany({
    where,
    include: {
      customer: { select: { custId: true, custName: true, custMobile: true, custEmail: true } },
      inquiryCarDetails: {
        include: {
          carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } },
        },
        orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
      },
    },
    orderBy: { inquiryId: 'desc' },
  })

  return NextResponse.json(rows)
}
