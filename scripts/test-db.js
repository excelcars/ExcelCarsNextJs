const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.inquiry.count();
  console.log('Inquiry Count:', count);
  
  const leadSource = await prisma.inquiry.groupBy({
    by: ['website'],
    _count: { website: true },
    where: { website: { not: null } },
    orderBy: { _count: { website: 'desc' } },
    take: 3,
  });
  console.log('Lead Source Breakdown Sample:', leadSource);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
