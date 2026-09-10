import { NextRequest, NextResponse } from 'next/server'
import { getPaymentHistory } from '@/features/insurance/queries'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  if (!(await canCurrentUserAccessRoute('/insurance'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const insuranceMainId = Number(req.nextUrl.searchParams.get('insuranceMainId'))
  if (!Number.isInteger(insuranceMainId) || insuranceMainId <= 0) {
    return NextResponse.json({ error: 'A valid insurance record is required.' }, { status: 400 })
  }
  const exists = await prisma.insuranceMain.findUnique({ where: { insuranceMainId }, select: { insuranceMainId: true } })
  if (!exists) return NextResponse.json({ error: 'Insurance record not found.' }, { status: 404 })
  const history = await getPaymentHistory(insuranceMainId)
  return NextResponse.json(history)
}
