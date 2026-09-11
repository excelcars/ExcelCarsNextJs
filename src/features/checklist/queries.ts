import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

const CHECKLIST_PAGE_SIZE = 25

async function loadUsers(userIds: number[]) {
  if (userIds.length === 0) return new Map<number, { userId: number; userName: string | null; displayName: string | null }>()

  const users = await prisma.userTable.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, userName: true, displayName: true },
  })

  return new Map(users.map(user => [user.userId, user]))
}

function buildChecklistWhere(search: string, registration: string): Prisma.CheckListDocMainWhereInput {
  const q = search.trim()
  const exactRegistration = registration.trim()
  const filters: Prisma.CheckListDocMainWhereInput[] = []

  if (exactRegistration) filters.push({ registrationNo: { equals: exactRegistration } })
  if (q) {
    filters.push({
      OR: [
        { registrationNo: { contains: q, mode: 'insensitive' } },
        { customerNameLegacy: { contains: q, mode: 'insensitive' } },
        { customerMobileLegacy: { contains: q, mode: 'insensitive' } },
        { customerEmailLegacy: { contains: q, mode: 'insensitive' } },
        { customer: { custName: { contains: q, mode: 'insensitive' } } },
        { customer: { custMobile: { contains: q, mode: 'insensitive' } } },
        { customer: { custEmail: { contains: q, mode: 'insensitive' } } },
        { make: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { variant: { contains: q, mode: 'insensitive' } },
      ],
    })
  }

  if (filters.length === 0) return {}
  return filters.length === 1 ? filters[0] : { AND: filters }
}

async function mapChecklistSummaryRows(rows: Array<{
  documentId: number
  inventoryId: number | null
  make: string | null
  model: string | null
  variant: string | null
  colour: string | null
  registrationNo: string | null
  year: number | null
  fuelType: string | null
  customerId: number | null
  customerNameLegacy: string | null
  customerMobileLegacy: string | null
  customerEmailLegacy: string | null
  createdBy: number | null
  createdDate: Date | null
  updatedBy: number | null
  updatedDate: Date | null
  customer: {
    custId: number
    custName: string
    custMobile: string | null
    custEmail: string | null
  } | null
  _count: {
    checklistDocDetails: number
  }
}>) {
  const userIds = Array.from(new Set(rows.flatMap(row => [row.createdBy, row.updatedBy]).filter((id): id is number => typeof id === 'number')))
  const userMap = await loadUsers(userIds)

  const documentIds = rows.map(row => row.documentId)
  const docStats = documentIds.length
    ? await prisma.$queryRaw<Array<{ documentId: number; applicableCount: bigint; receivedApplicableCount: bigint; receivedCount: bigint }>>(Prisma.sql`
        SELECT
          fk_document_id AS "documentId",
          SUM(CASE WHEN applicable IN ('Yes', 'Applicable') THEN 1 ELSE 0 END) AS "applicableCount",
          SUM(CASE WHEN applicable IN ('Yes', 'Applicable') AND received = 'Yes' THEN 1 ELSE 0 END) AS "receivedApplicableCount",
          SUM(CASE WHEN received = 'Yes' THEN 1 ELSE 0 END) AS "receivedCount"
        FROM checklist_doc_details
        WHERE fk_document_id IN (${Prisma.join(documentIds)})
        GROUP BY fk_document_id
      `)
    : []

  const docStatMap = new Map(
    docStats.map(stat => [
      stat.documentId,
      {
        applicableCount: Number(stat.applicableCount ?? 0),
        receivedApplicableCount: Number(stat.receivedApplicableCount ?? 0),
        receivedCount: Number(stat.receivedCount ?? 0),
      },
    ]),
  )

  return rows.map(row => ({
    ...row,
    documentCount: row._count.checklistDocDetails,
    applicableCount: docStatMap.get(row.documentId)?.applicableCount ?? 0,
    receivedApplicableCount: docStatMap.get(row.documentId)?.receivedApplicableCount ?? 0,
    receivedCount: docStatMap.get(row.documentId)?.receivedCount ?? 0,
    createdByUser: row.createdBy ? userMap.get(row.createdBy) ?? null : null,
    updatedByUser: row.updatedBy ? userMap.get(row.updatedBy) ?? null : null,
  }))
}

export async function listChecklists({ search = '', registration = '', page = 1 }: { search?: string; registration?: string; page?: number }) {
  const where = buildChecklistWhere(search, registration)
  const total = await prisma.checkListDocMain.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / CHECKLIST_PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page || 1), pageCount)

  const rows = await prisma.checkListDocMain.findMany({
    where,
    select: {
      documentId: true,
      inventoryId: true,
      make: true,
      model: true,
      variant: true,
      colour: true,
      registrationNo: true,
      year: true,
      fuelType: true,
      customerId: true,
      customerNameLegacy: true,
      customerMobileLegacy: true,
      customerEmailLegacy: true,
      createdBy: true,
      createdDate: true,
      updatedBy: true,
      updatedDate: true,
      customer: true,
      _count: {
        select: { checklistDocDetails: true },
      },
    },
    orderBy: { documentId: 'desc' },
    skip: (safePage - 1) * CHECKLIST_PAGE_SIZE,
    take: CHECKLIST_PAGE_SIZE,
  })

  return {
    rows: await mapChecklistSummaryRows(rows),
    total,
    page: safePage,
    pageCount,
    pageSize: CHECKLIST_PAGE_SIZE,
  }
}

export async function listChecklistsForExport({ search = '', registration = '' }: { search?: string; registration?: string }) {
  const where = buildChecklistWhere(search, registration)
  const rows = await prisma.checkListDocMain.findMany({
    where,
    select: {
      documentId: true,
      inventoryId: true,
      make: true,
      model: true,
      variant: true,
      colour: true,
      registrationNo: true,
      year: true,
      fuelType: true,
      customerId: true,
      customerNameLegacy: true,
      customerMobileLegacy: true,
      customerEmailLegacy: true,
      createdBy: true,
      createdDate: true,
      updatedBy: true,
      updatedDate: true,
      customer: true,
      _count: {
        select: { checklistDocDetails: true },
      },
    },
    orderBy: { documentId: 'desc' },
  })

  return mapChecklistSummaryRows(rows)
}

export async function getChecklistDetail(documentId: number) {
  const row = await prisma.checkListDocMain.findUnique({
    where: { documentId },
    include: {
      customer: true,
      checklistDocDetails: {
        orderBy: { checklistDetailsId: 'asc' },
      },
    },
  })

  if (!row) return null

  const userIds = Array.from(new Set([row.createdBy, row.updatedBy].filter((id): id is number => typeof id === 'number')))
  const userMap = await loadUsers(userIds)

  return {
    ...row,
    createdByUser: row.createdBy ? userMap.get(row.createdBy) ?? null : null,
    updatedByUser: row.updatedBy ? userMap.get(row.updatedBy) ?? null : null,
  }
}

export async function getVehicles() {
  return prisma.inventoryManagement.findMany({
    select: {
      inventoryId: true,
      registrationNo: true,
      sku: true,
      colour: true,
      year: true,
      fuelType: true,
      customerId: true,
      customerName: true,
      customer: {
        select: { custId: true, custName: true, custMobile: true, custEmail: true },
      },
      carVariantMaster: {
        select: { variant: true, carMakeMaster: { select: { make: true } }, carModelMaster: { select: { model: true } } },
      },
    },
    orderBy: { inventoryId: 'desc' },
  })
}
