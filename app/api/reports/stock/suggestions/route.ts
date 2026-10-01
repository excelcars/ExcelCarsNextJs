import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { prisma } from '@/lib/db/prisma'

const FIELDS = new Set(['make', 'model', 'variant', 'colour', 'fuelType', 'ownerType', 'ownerName', 'ownerMobile', 'registrationNo'])

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map(value => value?.trim() ?? '').filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, 15)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/reports/stock'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const field = req.nextUrl.searchParams.get('field') ?? ''
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!FIELDS.has(field) || q.length < 2) return NextResponse.json([])
  const match = { contains: q, mode: 'insensitive' as const }

  switch (field) {
    case 'make': {
      const [masters, legacy] = await Promise.all([
        prisma.carMakeMaster.findMany({ where: { make: match }, select: { make: true }, take: 15 }),
        prisma.inventoryManagement.findMany({ where: { makeLegacy: match }, select: { makeLegacy: true }, distinct: ['makeLegacy'], take: 15 }),
      ])
      return NextResponse.json(unique([...masters.map(row => row.make), ...legacy.map(row => row.makeLegacy)]))
    }
    case 'model': {
      const [masters, legacy] = await Promise.all([
        prisma.carModelMaster.findMany({ where: { model: match }, select: { model: true }, take: 15 }),
        prisma.inventoryManagement.findMany({ where: { modelLegacy: match }, select: { modelLegacy: true }, distinct: ['modelLegacy'], take: 15 }),
      ])
      return NextResponse.json(unique([...masters.map(row => row.model), ...legacy.map(row => row.modelLegacy)]))
    }
    case 'variant': {
      const [masters, legacy] = await Promise.all([
        prisma.carVariantMaster.findMany({ where: { variant: match }, select: { variant: true }, take: 15 }),
        prisma.inventoryManagement.findMany({ where: { variantLegacy: match }, select: { variantLegacy: true }, distinct: ['variantLegacy'], take: 15 }),
      ])
      return NextResponse.json(unique([...masters.map(row => row.variant), ...legacy.map(row => row.variantLegacy)]))
    }
  }

  const selectByField = {
    colour: { colour: true },
    fuelType: { fuelType: true },
    ownerType: { ownedType: true },
    ownerName: { ownedBy: true },
    ownerMobile: { mobileNoOwnedBy: true },
    registrationNo: { registrationNo: true },
  } as const
  const column = selectByField[field as keyof typeof selectByField]
  const whereByField = {
    colour: { colour: match },
    fuelType: { fuelType: match },
    ownerType: { ownedType: match },
    ownerName: { ownedBy: match },
    ownerMobile: { mobileNoOwnedBy: match },
    registrationNo: { registrationNo: match },
  } as const
  const rows = await prisma.inventoryManagement.findMany({
    where: whereByField[field as keyof typeof whereByField],
    select: column,
    take: 15,
  })
  return NextResponse.json(unique(rows.map(row => Object.values(row)[0] as string | null)))
}
