import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const reportingSortByCode = {
  JUSTDIAL: 1, OLX: 2, CARDEKHO: 3, CARDEKHO_MARKETPLACE: 4, CARTRADE: 5,
  CARWALE: 6, GAADI: 7, QUIKR: 8, AUTOPORTAL: 9, SULEKHA: 10,
  BIKEWALE: 11, GAADIGURUS: 12, LELECARR: 13, MOTOZITE: 14, ZIGWHEELS: 15,
  EXPORTERS_INDIA: 16, FACEBOOK: 17, INSTAGRAM: 18, YOUTUBE: 19, INDIAMART: 20,
  TRADEINDIA: 21, INBOUND_CALL: 22, WALK_IN: 23, EMAIL: 24, WHATSAPP: 25,
  REFERENCE: 26, EXCEL_CARS_MUMBAI: 27, EXCEL_CARS_DEALER: 28, GOOGLE: 29,
  TIMES_OF_INDIA: 30, ASKME: 31, BOOST_360: 32, SMS_MARKETING: 33, OTHER: 34,
  UNKNOWN: 35,
}

function normalizeSource(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

async function main() {
  const filePath = join(process.cwd(), 'db', 'inquiry-source-import.json')
  const { sourceRows, mappingRows } = JSON.parse(await readFile(filePath, 'utf8'))

  for (const source of sourceRows) {
    const reportingSort = reportingSortByCode[source.code]
    if (!reportingSort) throw new Error(`No reporting sort is defined for ${source.code}.`)
    await prisma.inquirySourceMaster.upsert({
      where: { code: source.code },
      create: { ...source, reportingSort },
      update: {
        displayName: source.displayName,
        category: source.category,
        requiresDetail: source.requiresDetail,
        isActive: source.isActive,
        reportingSort,
        updatedAt: new Date(),
      },
    })
  }

  const masterRows = await prisma.inquirySourceMaster.findMany({ select: { sourceId: true, code: true } })
  const sourceIdByCode = new Map(masterRows.map((row) => [row.code, row.sourceId]))
  const uniqueMappings = new Map()

  for (const mapping of mappingRows) {
    const normalizedSource = normalizeSource(mapping.legacySource)
    if (normalizedSource) uniqueMappings.set(normalizedSource, mapping)
  }

  for (const [normalizedSource, mapping] of uniqueMappings) {
    const sourceId = sourceIdByCode.get(mapping.sourceCode)
    if (!sourceId) throw new Error(`No source master row exists for ${mapping.sourceCode}.`)
    await prisma.legacyInquirySourceMapping.upsert({
      where: { normalizedSource },
      create: {
        legacySource: mapping.legacySource,
        normalizedSource,
        sourceId,
        mappingStatus: mapping.reviewNote ? 'review' : 'approved',
        reviewNote: mapping.reviewNote || null,
      },
      update: {
        legacySource: mapping.legacySource,
        sourceId,
        mappingStatus: mapping.reviewNote ? 'review' : 'approved',
        reviewNote: mapping.reviewNote || null,
        updatedAt: new Date(),
      },
    })
  }

  const backfilled = await prisma.$executeRawUnsafe(`
    UPDATE inquiry AS inquiry_row
    SET source_id = mapping.source_id
    FROM legacy_inquiry_source_mapping AS mapping
    WHERE inquiry_row.source_id IS NULL
      AND inquiry_row.website IS NOT NULL
      AND lower(regexp_replace(trim(inquiry_row.website), '[[:space:]]+', ' ', 'g')) = mapping.normalized_source
  `)

  const unknownSourceId = sourceIdByCode.get('UNKNOWN')
  if (!unknownSourceId) throw new Error('No source master row exists for UNKNOWN.')
  // Historic blank websites have an unknown source; do not misclassify them as user-selected Other.
  const blankBackfilled = await prisma.$executeRawUnsafe(`
    UPDATE inquiry
    SET source_id = ${unknownSourceId}
    WHERE source_id IS DISTINCT FROM ${unknownSourceId}
      AND NULLIF(trim(COALESCE(website, '')), '') IS NULL
  `)

  const unmappedRows = await prisma.inquiry.groupBy({
    by: ['website'],
    where: { sourceId: null },
    _count: { inquiryId: true },
    orderBy: { _count: { inquiryId: 'desc' } },
  })
  const csv = [
    'Legacy Source,Inquiry Count',
    ...unmappedRows.map((row) => `"${String(row.website ?? '(blank)').replace(/"/g, '""')}",${row._count.inquiryId}`),
  ].join('\n') + '\n'
  const reportPath = join(process.cwd(), 'db', 'inquiry-source-unmapped-report.csv')
  await writeFile(reportPath, csv)

  const unmapped = unmappedRows.reduce((sum, row) => sum + row._count.inquiryId, 0)
  console.log(`Inquiry sources synced: ${sourceRows.length} master rows, ${uniqueMappings.size} legacy mappings, ${backfilled} mapped inquiries, ${blankBackfilled} blank websites assigned to Unknown, ${unmapped} inquiries unmapped. Review ${reportPath}.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
