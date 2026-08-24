import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const where = q
    ? {
        OR: [
          { inquiryNo: { contains: q, mode: 'insensitive' as const } },
          { customerNameLegacy: { contains: q, mode: 'insensitive' as const } },
          { mobileno: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
          { customer: { custName: { contains: q, mode: 'insensitive' as const } } },
        ],
      }
    : { status: 'FollowUp' }

  const rows = await prisma.inquiry.findMany({
    where,
    include: {
      customer: { select: { custId: true, custName: true, custMobile: true, custEmail: true } },
      inquiryCarDetails: {
        include: {
          carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } },
        },
        take: 1,
        orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
      },
    },
    orderBy: { inquiryId: 'desc' },
    take: q ? 20 : 10,
  })

  return NextResponse.json(rows)
}
