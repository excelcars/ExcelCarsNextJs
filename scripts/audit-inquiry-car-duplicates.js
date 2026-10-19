const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const totalRows = await prisma.inquiryCarDetails.count({
    where: { fkInquiryId: { not: null } },
  });

  const grouped = await prisma.inquiryCarDetails.groupBy({
    by: ['fkInquiryId'],
    where: { fkInquiryId: { not: null } },
    _count: { fkInquiryId: true },
    orderBy: { _count: { fkInquiryId: 'desc' } },
  });

  const duplicateGroups = grouped.filter(row => (row._count.fkInquiryId ?? 0) > 1);
  const duplicateInquiryIds = duplicateGroups
    .map(row => row.fkInquiryId)
    .filter((id) => id !== null);

  const duplicateRows = duplicateInquiryIds.length
    ? await prisma.inquiryCarDetails.count({
        where: { fkInquiryId: { in: duplicateInquiryIds } },
      })
    : 0;

  const sampleIds = duplicateInquiryIds.slice(0, 10);
  const sample = sampleIds.length
    ? await prisma.inquiry.findMany({
        where: { inquiryId: { in: sampleIds } },
        select: {
          inquiryId: true,
          inquiryNo: true,
          customerNameLegacy: true,
          mobileno: true,
          dateOfInquiry: true,
          inquiryCarDetails: {
            select: {
              inquiryCarDetailsId: true,
              fkVariantId: true,
              makeLegacy: true,
              modelLegacy: true,
              variantLegacy: true,
              subVariant: true,
              year: true,
              createdDt: true,
              updatedDt: true,
            },
            orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
          },
        },
        orderBy: { inquiryId: 'desc' },
      })
    : [];

  console.log(JSON.stringify({
    totalInquiryCarDetailRows: totalRows,
    inquiriesWithAtLeastOneCarDetail: grouped.length,
    duplicateInquiryCount: duplicateInquiryIds.length,
    duplicateRows,
    topDuplicateGroups: duplicateGroups.slice(0, 20),
    sample,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
