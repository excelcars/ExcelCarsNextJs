import { prisma } from '@/lib/db/prisma'

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfToday() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export async function getDashboardStats() {
  const [
    totalInventory,
    availableStock,
    soldThisMonth,
    totalInquiries,
    todayInquiries,
    hotLeads,
    pendingFollowups,
    overdueFollowups,
    activeLoans,
    activeInsurance,
    pendingRTO,
  ] = await Promise.all([
    prisma.inventoryManagement.count(),
    prisma.inventoryManagement.count({ where: { status: 'In Stock' } }),
    prisma.inventoryManagement.count({ where: { status: 'Sold', updatedDate: { gte: startOfMonth() } } }),
    prisma.inquiry.count(),
    prisma.inquiry.count({ where: { dateOfInquiry: { gte: startOfToday() } } }),
    prisma.inquiry.count({ where: { classification: 'Hot', status: { not: 'Closed' } } }),
    prisma.inquiry.count({ where: { status: 'FollowUp' } }),
    prisma.inquiry.count({ where: { status: 'FollowUp', followUpDate: { lt: startOfToday() } } }),
    prisma.loanManagement.count({ where: { paymentStatus: { not: 'Fully Paid' } } }),
    prisma.insuranceMain.count({ where: { policyStatus: 'Received' } }),
    prisma.rtoAgent.count({ where: { OR: [{ paymentStatus: 'Pending' }, { transferStatus: 'Pending' }] } }),
  ])

  return {
    totalInventory,
    availableStock,
    soldThisMonth,
    totalInquiries,
    todayInquiries,
    hotLeads,
    pendingFollowups,
    overdueFollowups,
    activeLoans,
    activeInsurance,
    pendingRTO,
  }
}

export async function getLeadSourceBreakdown() {
  const rows = await prisma.inquiry.groupBy({
    by: ['website'],
    _count: { website: true },
    where: { website: { not: null } },
    orderBy: { _count: { website: 'desc' } },
    take: 6,
  })
  return rows.map((r) => ({ name: r.website ?? 'Unknown', value: r._count.website }))
}

export async function getPendingFollowups(limit = 8) {
  const rows = await prisma.inquiry.findMany({
    where: { status: 'FollowUp' },
    orderBy: [{ followUpDate: 'asc' }, { inquiryId: 'asc' }],
    take: limit,
    include: { customer: true },
  })

  return rows.map((f) => ({
    id: f.inquiryId,
    customerName: f.customer?.custName ?? f.customerNameLegacy ?? 'Unknown',
    mobile: f.mobileno ?? f.customer?.custMobile ?? '—',
    followupDate: f.followUpDate,
    classification: f.classification,
    status: f.status,
  }))
}
