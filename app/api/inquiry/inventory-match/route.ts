import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const variantId = Number(req.nextUrl.searchParams.get('variantId'))
  const makeId = Number(req.nextUrl.searchParams.get('makeId'))
  const modelId = Number(req.nextUrl.searchParams.get('modelId'))
  const year = Number(req.nextUrl.searchParams.get('year'))

  if (!variantId && !modelId && !makeId) {
    return NextResponse.json([])
  }

  const rows = await prisma.inventoryManagement.findMany({
    where: {
      ...(variantId
        ? { fkVariantId: variantId }
        : modelId
          ? { carVariantMaster: { fkModelId: modelId } }
          : { carVariantMaster: { fkMakeId: makeId } }),
      ...(year ? { year } : {}),
      status: { equals: 'In Stock', mode: 'insensitive' },
    },
    include: {
      customer: { select: { custId: true, custName: true, custMobile: true, custEmail: true } },
      carVariantMaster: {
        include: { carMakeMaster: true, carModelMaster: true },
      },
      _count: {
        select: { inventoryPhotos: true },
      },
    },
    orderBy: { inventoryId: 'desc' },
    take: 100,
  })

  const matchReasons = [
    variantId ? 'Exact variant match' : modelId ? 'Same model match' : makeId ? 'Same make match' : '',
    year ? 'Year matched' : '',
    'Currently in stock',
  ].filter(Boolean)

  return NextResponse.json(rows.map(row => ({
    ...row,
    kmsDriven: row.kmsDriven ? row.kmsDriven.toString() : null,
    price: row.price ? row.price.toString() : null,
    matchReasons,
  })))
}
