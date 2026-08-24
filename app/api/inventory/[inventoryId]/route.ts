import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { getInventoryById } from '@/features/inventory/queries'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ inventoryId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inventoryId } = await params
  const parsedId = Number(inventoryId)
  if (!parsedId) return NextResponse.json({ error: 'Inventory id is required.' }, { status: 400 })

  const row = await getInventoryById(parsedId)
  if (!row) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })

  return NextResponse.json({
    ...row,
    kmsDriven: row.kmsDriven ? row.kmsDriven.toString() : null,
    price: row.price ? row.price.toString() : null,
  })
}
