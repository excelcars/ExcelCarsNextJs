import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { auth } from '../../../../../auth'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { getVehicleDetails, listTrackingExport, normalizeTrackingFilters } from '@/features/reports/tracking/queries'

const clean = (value: string | null | undefined) => value && !['null', 'na', 'n/a'].includes(value.trim().toLowerCase()) ? value : ''
const asNumber = (value: { toString(): string } | null | undefined) => value == null ? null : Number(value.toString())
const difference = (left: { toString(): string } | null | undefined, right: { toString(): string } | null | undefined) => {
  const a = asNumber(left); const b = asNumber(right); return a == null || b == null ? null : a - b
}
const vehicleName = (row: { carVariantMaster: { variant: string | null; carMakeMaster: { make: string | null } | null; carModelMaster: { model: string | null } | null } | null; makeLegacy?: string | null; modelLegacy?: string | null; variantLegacy?: string | null }) => ({ make: clean(row.carVariantMaster?.carMakeMaster?.make ?? row.makeLegacy), model: clean(row.carVariantMaster?.carModelMaster?.model ?? row.modelLegacy), variant: clean(row.carVariantMaster?.variant ?? row.variantLegacy) })

function styleSheet(sheet: ExcelJS.Worksheet, title: string) {
  sheet.mergeCells('A1:H1'); sheet.getCell('A1').value = title; sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }; sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } }
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}
function header(sheet: ExcelJS.Worksheet, columns: Array<[string, string, number]>) {
  sheet.columns = columns.map(([header, key, width]) => ({ header, key, width })); const row = sheet.getRow(3); row.values = columns.map(([label]) => label); row.font = { bold: true, color: { argb: 'FFFFFFFF' } }; row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } }
}
function response(workbook: ExcelJS.Workbook, name: string) { return workbook.xlsx.writeBuffer().then(buffer => new NextResponse(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${name}"` } })) }

export async function GET(req: NextRequest) {
  const session = await auth(); if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/reports/tracking'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const inventoryId = Number(req.nextUrl.searchParams.get('inventoryId'))
    if (Number.isInteger(inventoryId) && inventoryId > 0) {
      const detail = await getVehicleDetails(inventoryId); if (!detail) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })
      const workbook = new ExcelJS.Workbook(); const vehicle = detail.vehicle; const identity = vehicleName(vehicle)
      const summary = workbook.addWorksheet('Vehicle Summary'); styleSheet(summary, 'Stock Tracking — Vehicle Summary'); header(summary, [['Registration', 'registrationNo', 18], ['SKU', 'sku', 18], ['Make', 'make', 18], ['Model', 'model', 18], ['Variant', 'variant', 22], ['Colour', 'colour', 14], ['Fuel', 'fuelType', 14], ['Status', 'status', 16]])
      summary.addRow({ registrationNo: clean(vehicle.registrationNo), sku: clean(vehicle.sku), ...identity, colour: clean(vehicle.colour), fuelType: clean(vehicle.fuelType), status: clean(vehicle.status) })
      const checklist = workbook.addWorksheet('Checklist'); styleSheet(checklist, 'Checklist / Documents'); header(checklist, [['Document', 'documentName', 28], ['Applicable', 'applicable', 16], ['Received', 'received', 16], ['Original Copy', 'originalCopy', 16]])
      detail.checklist.flatMap(record => record.checklistDocDetails).forEach(item => checklist.addRow(item)); if (detail.checklist.flatMap(record => record.checklistDocDetails).length === 0) checklist.addRow({ documentName: 'No checklist documents' })
      const insurance = workbook.addWorksheet('Insurance'); styleSheet(insurance, 'Insurance'); header(insurance, [['Agent', 'agent', 24], ['Premium', 'premium', 16], ['OD Premium', 'odPremium', 16], ['Payout', 'payout', 16], ['Received', 'received', 16], ['Balance', 'balance', 16], ['Payout Status', 'payoutStatus', 18], ['Policy Status', 'policyStatus', 18]])
      detail.insurance.forEach(item => insurance.addRow({ agent: clean(item.partnerMaster?.name ?? item.agentNameLegacy), premium: asNumber(item.insurancePremium), odPremium: asNumber(item.oDPremium), payout: asNumber(item.payoutAmount), received: asNumber(item.totalAmountReceived), balance: difference(item.payoutAmount, item.totalAmountReceived), payoutStatus: clean(item.payoutPaymentStatus), policyStatus: clean(item.policyStatus) })); if (!detail.insurance.length) insurance.addRow({ agent: 'No insurance records' })
      const rto = workbook.addWorksheet('RTO'); styleSheet(rto, 'RTO'); header(rto, [['Agent', 'agent', 24], ['Mobile', 'mobile', 16], ['Charges', 'charges', 16], ['Paid', 'paid', 16], ['Balance', 'balance', 16], ['Payment Status', 'paymentStatus', 18], ['RC Status', 'rcStatus', 18], ['Transfer Status', 'transferStatus', 18]])
      detail.rto.forEach(item => rto.addRow({ agent: clean(item.partnerMaster?.name ?? item.agentNameLegacy), mobile: clean(item.agentMobileNoLegacy), charges: asNumber(item.transferCharges), paid: asNumber(item.amtPaid), balance: difference(item.transferCharges, item.amtPaid), paymentStatus: clean(item.paymentStatus), rcStatus: clean(item.rcStatus), transferStatus: clean(item.transferStatus) })); if (!detail.rto.length) rto.addRow({ agent: 'No RTO records' })
      const loan = workbook.addWorksheet('Loan'); styleSheet(loan, 'Loan'); header(loan, [['Bank', 'bank', 24], ['Contact', 'contact', 22], ['Loan Amount', 'loanAmount', 16], ['Payout', 'payout', 16], ['Received', 'received', 16], ['Balance', 'balance', 16], ['Payment Status', 'paymentStatus', 18], ['Payment Date', 'paymentDate', 16]])
      detail.loan.forEach(item => loan.addRow({ bank: clean(item.bankName ?? item.partnerMaster?.name), contact: clean(item.bankPersonName), loanAmount: asNumber(item.loanAmount), payout: asNumber(item.payoutAmount), received: asNumber(item.totalAmountReceived), balance: difference(item.payoutAmount, item.totalAmountReceived), paymentStatus: clean(item.paymentStatus), paymentDate: item.paymentDate ?? null })); if (!detail.loan.length) loan.addRow({ bank: 'No loan records' })
      for (const sheet of [insurance, rto, loan]) sheet.eachRow((row, rowNumber) => { if (rowNumber > 3) row.eachCell(cell => { if (typeof cell.value === 'number') cell.numFmt = '₹#,##0' }) })
      return response(workbook, `stock-tracking-${clean(vehicle.registrationNo) || vehicle.inventoryId}.xlsx`)
    }
    const params = req.nextUrl.searchParams; const filters = normalizeTrackingFilters({ search: params.get('search') ?? '', make: params.get('make') ?? '', model: params.get('model') ?? '', variant: params.get('variant') ?? '', colour: params.get('colour') ?? '', fuelType: params.get('fuelType') ?? '' })
    const rows = await listTrackingExport(filters); const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Stock Tracking'); styleSheet(sheet, 'Stock Tracking Summary'); header(sheet, [['Registration', 'registrationNo', 18], ['SKU', 'sku', 18], ['Make', 'make', 18], ['Model', 'model', 18], ['Variant', 'variant', 22], ['Colour', 'colour', 14], ['Fuel', 'fuelType', 14], ['Year', 'year', 10], ['Status', 'status', 16], ['Owner', 'ownedBy', 22], ['Customer', 'customer', 22], ['Customer Mobile', 'customerMobile', 18], ['Customer Email', 'customerEmail', 28]])
    rows.forEach(row => { const identity = vehicleName(row); sheet.addRow({ registrationNo: clean(row.registrationNo), sku: clean(row.sku), ...identity, colour: clean(row.colour), fuelType: clean(row.fuelType), year: row.year, status: clean(row.status), ownedBy: clean(row.ownedBy), customer: clean(row.customer?.custName ?? row.customerName), customerMobile: clean(row.customer?.custMobile), customerEmail: clean(row.customer?.custEmail) }) })
    return response(workbook, 'stock-tracking.xlsx')
  } catch { return NextResponse.json({ error: 'Could not export stock tracking.' }, { status: 500 }) }
}
