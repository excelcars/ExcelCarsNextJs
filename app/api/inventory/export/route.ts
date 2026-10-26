import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { listInventoryForExport, type InventoryListParams } from '@/features/inventory/queries'

function toStringParam(value: string | null) {
  return value?.trim() ?? ''
}

function inventoryIdsParam(value: string | null) {
  return [...new Set((value ?? '').split(',').map(Number).filter(id => Number.isInteger(id) && id > 0))]
}

export async function GET(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = req.nextUrl.searchParams
  const filters: InventoryListParams = {
    inventoryIds: inventoryIdsParam(searchParams.get('inventoryIds')),
    search: toStringParam(searchParams.get('search')),
    status: toStringParam(searchParams.get('status')) || 'All',
    make: toStringParam(searchParams.get('make')),
    model: toStringParam(searchParams.get('model')),
    fuelType: toStringParam(searchParams.get('fuelType')),
    inventoryNumber: toStringParam(searchParams.get('inventoryNumber')),
    sku: toStringParam(searchParams.get('sku')),
    registrationNo: toStringParam(searchParams.get('registrationNo')),
    variant: toStringParam(searchParams.get('variant')),
    colour: toStringParam(searchParams.get('colour')),
    year: toStringParam(searchParams.get('year')),
    month: toStringParam(searchParams.get('month')),
    noOfOwners: toStringParam(searchParams.get('noOfOwners')),
    tax: toStringParam(searchParams.get('tax')),
    isCarRegistered: toStringParam(searchParams.get('isCarRegistered')),
    kmsMin: toStringParam(searchParams.get('kmsMin')),
    kmsMax: toStringParam(searchParams.get('kmsMax')),
    insuranceType: toStringParam(searchParams.get('insuranceType')),
    priceMin: toStringParam(searchParams.get('priceMin')),
    priceMax: toStringParam(searchParams.get('priceMax')),
    ownedType: toStringParam(searchParams.get('ownedType')),
    ownedBy: toStringParam(searchParams.get('ownedBy')),
    mobileNoOwnedBy: toStringParam(searchParams.get('mobileNoOwnedBy')),
    emailIdOwnedBy: toStringParam(searchParams.get('emailIdOwnedBy')),
    customerName: toStringParam(searchParams.get('customerName')),
    linkedCustomer: toStringParam(searchParams.get('linkedCustomer')),
    internalComments: toStringParam(searchParams.get('internalComments')),
    otherRemarks: toStringParam(searchParams.get('otherRemarks')),
  }

  const rows = await listInventoryForExport(filters)

  return NextResponse.json(rows.map(row => ({
    ...row,
    kmsDriven: row.kmsDriven ? row.kmsDriven.toString() : null,
    price: row.price ? row.price.toString() : null,
  })))
}
