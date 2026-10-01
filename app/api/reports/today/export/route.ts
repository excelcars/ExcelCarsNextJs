import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { auth } from '../../../../../auth'
import { prisma } from '@/lib/db/prisma'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { listTodayFollowups } from '@/features/reports/today/queries'
import { indiaDateKey, validateIndiaDateRange } from '@/features/reports/today/date'
import { parseTodayUserId } from '@/features/reports/today/filters'

function exportDate(value: Date | string | null) {
  return value ? indiaDateKey(value) : ''
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canCurrentUserAccessRoute('/reports/today'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const me = session.user?.id
      ? await prisma.userTable.findUnique({ where: { userId: Number(session.user.id) }, select: { userId: true, roleId: true } })
      : null
    const restrictToUserId = me?.roleId === 4 ? me.userId : null
    const fromDate = req.nextUrl.searchParams.get('fromDate') || indiaDateKey()
    const toDate = req.nextUrl.searchParams.get('toDate') || indiaDateKey()
    const dateError = validateIndiaDateRange(fromDate, toDate)
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 })
    const rows = await listTodayFollowups({
      fromDate,
      toDate,
      userId: parseTodayUserId(req.nextUrl.searchParams.get('userId')),
      restrictToUserId,
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Today Activity')
    sheet.mergeCells('A1:R1')
    sheet.getCell('A1').value = "Today's Inquiry & Follow-up"
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } }
    sheet.mergeCells('A2:R2')
    sheet.getCell('A2').value = `From: ${fromDate}  To: ${toDate}${restrictToUserId ? '  Scope: Your created inquiries' : ''}`
    sheet.addRow([])
    sheet.columns = [
      { header: 'Inquiry', key: 'inquiryNo', width: 16 },
      { header: 'Inquiry Date', key: 'dateOfInquiry', width: 16 },
      { header: 'Website', key: 'website', width: 24 },
      { header: 'Customer', key: 'customerName', width: 24 },
      { header: 'Mobile', key: 'mobileno', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Car Interest', key: 'carDetails', width: 34 },
      { header: 'Budget', key: 'budgetOfCustomer', width: 16 },
      { header: 'Visited', key: 'visitedDateOfCustomer', width: 16 },
      { header: 'Classification', key: 'followupClassification', width: 18 },
      { header: 'Status', key: 'followupStatus', width: 16 },
      { header: 'Sub-status', key: 'followupSubStatus', width: 24 },
      { header: 'Follow-up', key: 'followupDate', width: 16 },
      { header: 'Comments', key: 'comments', width: 40 },
      { header: 'Created', key: 'createdDt', width: 16 },
      { header: 'Created By', key: 'createdByName', width: 22 },
      { header: 'Updated', key: 'updatedDt', width: 16 },
      { header: 'Updated By', key: 'updatedByName', width: 22 },
    ]
    const headerRow = sheet.getRow(4)
    headerRow.values = sheet.columns.map(column => String(column.header ?? ''))
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } }

    rows.forEach(row => sheet.addRow({
      ...row,
      budgetOfCustomer: row.budgetOfCustomer ? Number(row.budgetOfCustomer) : null,
      dateOfInquiry: exportDate(row.dateOfInquiry),
      visitedDateOfCustomer: exportDate(row.visitedDateOfCustomer),
      followupDate: exportDate(row.followupDate),
      createdDt: exportDate(row.createdDt),
      updatedDt: exportDate(row.updatedDt),
    }))
    sheet.getColumn('budgetOfCustomer').numFmt = '₹#,##0'
    sheet.views = [{ state: 'frozen', ySplit: 4 }]

    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="today-inquiry-followup-report.xlsx"',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Could not export today activity report.' }, { status: 500 })
  }
}
