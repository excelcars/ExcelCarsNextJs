import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const rows = await prisma.inventoryManagement.findMany({
    where: {
      registrationNo: { contains: q, mode: 'insensitive' },
    },
    select: { registrationNo: true },
    distinct: ['registrationNo'],
    orderBy: { registrationNo: 'asc' },
    take: 15,
  })

  return NextResponse.json(
    rows
      .map(row => row.registrationNo?.trim() ?? '')
      .filter((value): value is string => Boolean(value)),
  )
}
