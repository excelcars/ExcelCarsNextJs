import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mobile = req.nextUrl.searchParams.get('mobile')?.trim() ?? ''
  const excludeInquiryId = Number(req.nextUrl.searchParams.get('excludeInquiryId'))

  if (!mobile) return NextResponse.json([])

  const rows = await prisma.inquiry.findMany({
    where: {
      mobileno: { equals: mobile, mode: 'insensitive' },
      ...(excludeInquiryId ? { inquiryId: { not: excludeInquiryId } } : {}),
    },
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
    take: 10,
  })

  return NextResponse.json(rows)
}
