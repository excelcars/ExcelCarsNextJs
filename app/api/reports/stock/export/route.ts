import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { auth } from '../../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { listStock, normalizeStockFilters } from '@/features/reports/stock/queries'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/reports/stock'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const params = req.nextUrl.searchParams
    const filters = normalizeStockFilters({
      search: params.get('search') ?? '',
      status: params.get('status') ?? '',
      make: params.get('make') ?? '',
      model: params.get('model') ?? '',
      variant: params.get('variant') ?? '',
      colour: params.get('colour') ?? '',
      fuelType: params.get('fuelType') ?? '',
      ownerType: params.get('ownerType') ?? '',
      ownerName: params.get('ownerName') ?? '',
      ownerMobile: params.get('ownerMobile') ?? '',
      registrationNo: params.get('registrationNo') ?? '',
    })
    const rows = await listStock(filters)
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Stock Report')
    sheet.mergeCells('A1:R1')
    sheet.getCell('A1').value = 'Stock Report'
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } }
    sheet.getCell('A2').value = `Filters: ${Object.entries(filters).filter(([, value]) => value && value !== 'All').map(([key, value]) => `${key}: ${value}`).join(' · ') || 'All records'}`
    sheet.addRow([])
    sheet.columns = [
      ['SKU', 'sku'], ['Reg No', 'registrationNo'], ['Make', 'make'], ['Model', 'model'], ['Variant', 'variant'], ['Year', 'year'], ['Month', 'month'], ['Colour', 'colour'], ['Fuel', 'fuelType'], ['KM', 'kmsDriven'], ['Owners', 'noOfOwners'], ['Tax', 'tax'], ['Insurance Type', 'insuranceType'], ['Price', 'price'], ['Status', 'status'], ['Remarks', 'otherRemarks'], ['Internal Comments', 'internalComments'], ['Owner', 'ownedBy'],
    ].map(([header, key]) => ({ header, key, width: 18 }))
    const headerRow = sheet.getRow(4)
    headerRow.values = sheet.columns.map(column => String(column.header ?? ''))
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } }
    rows.forEach(row => sheet.addRow({
      ...row,
      make: row.carVariantMaster?.carMakeMaster?.make ?? row.makeLegacy,
      model: row.carVariantMaster?.carModelMaster?.model ?? row.modelLegacy,
      variant: row.carVariantMaster?.variant ?? row.variantLegacy,
      kmsDriven: row.kmsDriven ? Number(row.kmsDriven) : null,
      price: row.price ? Number(row.price) : null,
    }))
    sheet.getColumn('kmsDriven').numFmt = '#,##0'
    sheet.getColumn('price').numFmt = '₹#,##0'
    sheet.views = [{ state: 'frozen', ySplit: 4 }]
    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer, { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="stock-report.xlsx"',
    } })
  } catch {
    return NextResponse.json({ error: 'Could not export stock report.' }, { status: 500 })
  }
}
