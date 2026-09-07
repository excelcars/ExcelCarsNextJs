import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

type LeadCondition = Prisma.InquiryWhereInput

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfToday() {
  return startOfDay()
}

function dateRange(date: Date) {
  const start = startOfDay(date)
  return { gte: start, lt: addDays(start, 1) }
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function ownWhere(userId: number, condition: LeadCondition): LeadCondition {
  return { AND: [condition, { createdBy: userId }] }
}

function otherWhere(userId: number, condition: LeadCondition): LeadCondition {
  return { AND: [condition, { createdBy: { not: userId } }] }
}

function dateParam(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function getDashboardStats({
  includeInventory = true,
  includeInquiry = true,
  includeFollowup = true,
  includeLoan = true,
  includeInsurance = true,
  includeRto = true,
} = {}) {
  const today = startOfToday()
  const tomorrow = addDays(today, 1)
  const monthStart = startOfMonth()
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
    includeInventory ? prisma.inventoryManagement.count() : Promise.resolve(0),
    includeInventory ? prisma.inventoryManagement.count({ where: { status: 'In Stock' } }) : Promise.resolve(0),
    includeInventory ? prisma.inventoryManagement.count({ where: { status: 'Sold', updatedDate: { gte: monthStart } } }) : Promise.resolve(0),
    includeInquiry ? prisma.inquiry.count() : Promise.resolve(0),
    includeInquiry ? prisma.inquiry.count({ where: { dateOfInquiry: { gte: today, lt: tomorrow } } }) : Promise.resolve(0),
    includeInquiry ? prisma.inquiry.count({ where: { classification: 'Hot', status: { not: 'Closed' } } }) : Promise.resolve(0),
    includeFollowup ? prisma.inquiry.count({ where: { status: 'FollowUp' } }) : Promise.resolve(0),
    includeFollowup ? prisma.inquiry.count({ where: { status: 'FollowUp', followUpDate: { lt: today } } }) : Promise.resolve(0),
    includeLoan ? prisma.loanManagement.count({ where: { paymentStatus: { not: 'Fully Paid' } } }) : Promise.resolve(0),
    includeInsurance ? prisma.insuranceMain.count({ where: { policyStatus: 'Received' } }) : Promise.resolve(0),
    includeRto ? prisma.rtoAgent.count({ where: { OR: [{ paymentStatus: 'Pending' }, { transferStatus: 'Pending' }, { rcStatus: 'Pending' }] } }) : Promise.resolve(0),
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

export async function getTodayActivityStats({
  includeInventory = true,
  includeFollowup = true,
  includeLoan = true,
  includeInsurance = true,
  includeRto = true,
} = {}) {
  const today = startOfToday()
  const tomorrow = addDays(today, 1)
  const [
    deliveriesToday,
    followupsToday,
    loanPaymentsReceivedToday,
    insurancePaymentsReceivedToday,
    rtoPaymentsReceivedToday,
  ] = await Promise.all([
    includeInventory ? prisma.inventoryManagement.count({ where: { status: 'Sold', updatedDate: { gte: today, lt: tomorrow } } }) : Promise.resolve(0),
    includeFollowup ? prisma.inquiry.count({ where: { status: 'FollowUp', followUpDate: { gte: today, lt: tomorrow } } }) : Promise.resolve(0),
    includeLoan ? prisma.loanPaymentDetails.count({ where: { amountPaid: { gt: 0 }, createdDt: { gte: today, lt: tomorrow } } }) : Promise.resolve(0),
    includeInsurance ? prisma.insurancePaymentDetails.count({ where: { amountReceived: { gt: 0 }, createdDt: { gte: today, lt: tomorrow } } }) : Promise.resolve(0),
    includeRto ? prisma.rtoPaymentDetails.count({ where: { amountPaid: { gt: 0 }, createdDt: { gte: today, lt: tomorrow } } }) : Promise.resolve(0),
  ])

  return {
    deliveriesToday,
    followupsToday,
    paymentsReceivedToday: loanPaymentsReceivedToday + insurancePaymentsReceivedToday + rtoPaymentsReceivedToday,
  }
}

export async function getLegacyLeadDetails({ userId, roleId }: { userId: number; roleId: number }) {
  const today = startOfToday()
  const tomorrow = addDays(today, 1)
  const yesterday = addDays(today, -1)
  const isRestricted = roleId === 4
  const rows = [
    {
      label: 'All Leads',
      condition: {} satisfies LeadCondition,
      href: '/inquiry?quickFilter=all',
      ownHref: `/inquiry?quickFilter=all&userId=${userId}`,
    },
    {
      label: 'Fresh Leads',
      condition: { dateOfInquiry: dateRange(today) } satisfies LeadCondition,
      href: `/inquiry?quickFilter=all&inquiryDate=${dateParam(today)}`,
      ownHref: `/inquiry?quickFilter=all&inquiryDate=${dateParam(today)}&userId=${userId}`,
    },
    {
      label: "Today's Appointment Fixed",
      condition: { followUpDate: dateRange(today), status: 'FollowUp', subStatus: 'Appt. Fixed' } satisfies LeadCondition,
      href: `/followup?status=FollowUp&followUpDateFrom=${dateParam(today)}&followUpDateTo=${dateParam(today)}&subStatus=${encodeURIComponent('Appt. Fixed')}`,
      ownHref: `/followup?status=FollowUp&followUpDateFrom=${dateParam(today)}&followUpDateTo=${dateParam(today)}&subStatus=${encodeURIComponent('Appt. Fixed')}&userId=${userId}`,
    },
    {
      label: 'Follow up Today',
      condition: { followUpDate: dateRange(today), status: 'FollowUp' } satisfies LeadCondition,
      href: `/followup?status=FollowUp&followUpDateFrom=${dateParam(today)}&followUpDateTo=${dateParam(today)}`,
      ownHref: `/followup?status=FollowUp&followUpDateFrom=${dateParam(today)}&followUpDateTo=${dateParam(today)}&userId=${userId}`,
    },
    {
      label: 'Pending Follow up',
      condition: { followUpDate: { lt: today }, status: 'FollowUp' } satisfies LeadCondition,
      href: `/followup?status=FollowUp&followUpDateTo=${dateParam(yesterday)}`,
      ownHref: `/followup?status=FollowUp&followUpDateTo=${dateParam(yesterday)}&userId=${userId}`,
    },
    {
      label: 'Follow up (Upcoming)',
      condition: { followUpDate: { gte: tomorrow }, status: 'FollowUp' } satisfies LeadCondition,
      href: `/followup?status=FollowUp&followUpDateFrom=${dateParam(tomorrow)}`,
      ownHref: `/followup?status=FollowUp&followUpDateFrom=${dateParam(tomorrow)}&userId=${userId}`,
    },
    {
      label: 'Closed',
      condition: { status: 'Closed' } satisfies LeadCondition,
      href: '/followup?status=Closed',
      ownHref: `/followup?status=Closed&userId=${userId}`,
    },
  ]

  const counts = await Promise.all(rows.flatMap(row => [
    prisma.inquiry.count({ where: isRestricted ? ownWhere(userId, row.condition) : row.condition }),
    prisma.inquiry.count({ where: ownWhere(userId, row.condition) }),
    isRestricted ? Promise.resolve(0) : prisma.inquiry.count({ where: otherWhere(userId, row.condition) }),
  ]))

  return rows.map((row, index) => ({
    label: row.label,
    total: counts[index * 3],
    own: counts[index * 3 + 1],
    other: counts[index * 3 + 2],
    href: isRestricted ? row.ownHref : row.href,
    ownHref: row.ownHref,
  }))
}

export async function getBirthdayAnniversaryReminders() {
  const today = new Date()
  const rows = await prisma.customer.findMany({
    where: {
      OR: [
        { custDob: { not: null } },
        { custAnniversaryDt: { not: null } },
      ],
    },
    select: {
      custId: true,
      custName: true,
      custMobile: true,
      custEmail: true,
      custDob: true,
      custAnniversaryDt: true,
    },
    orderBy: { custName: 'asc' },
  })

  return rows.flatMap(row => {
    const reminders = []
    if (row.custDob && row.custDob.getDate() === today.getDate() && row.custDob.getMonth() === today.getMonth()) {
      reminders.push({ id: `${row.custId}-birthday`, name: row.custName, mobile: row.custMobile, email: row.custEmail, type: 'Birth Day' })
    }
    if (row.custAnniversaryDt && row.custAnniversaryDt.getDate() === today.getDate() && row.custAnniversaryDt.getMonth() === today.getMonth()) {
      reminders.push({ id: `${row.custId}-anniversary`, name: row.custName, mobile: row.custMobile, email: row.custEmail, type: 'Anniversary' })
    }
    return reminders
  })
}

export async function getPendingInsurancePolicies() {
  return prisma.insuranceMain.findMany({
    where: { policyStatus: 'Pending' },
    select: {
      insuranceMainId: true,
      agentNameLegacy: true,
      agentMobileNoLegacy: true,
      customerNameLegacy: true,
      customerMobileLegacy: true,
      carRegistrationNo: true,
      policyStatus: true,
      customer: { select: { custName: true, custMobile: true } },
      partnerMaster: { select: { name: true, mobile: true } },
    },
    orderBy: { insuranceMainId: 'desc' },
  })
}

export async function getExpiryRenewalPolicies() {
  const today = startOfToday()
  const checkDate = addDays(today, 15)
  return prisma.insuranceMain.findMany({
    where: {
      expiryDate: {
        gte: today,
        lte: checkDate,
      },
    },
    select: {
      insuranceMainId: true,
      agentNameLegacy: true,
      agentMobileNoLegacy: true,
      customerNameLegacy: true,
      customerMobileLegacy: true,
      carRegistrationNo: true,
      expiryDate: true,
      renewalDate: true,
      customer: { select: { custName: true, custMobile: true } },
      partnerMaster: { select: { name: true, mobile: true } },
    },
    orderBy: { expiryDate: 'asc' },
  })
}

export async function getRtoTransferPendingRcPending() {
  return prisma.rtoAgent.findMany({
    where: {
      OR: [
        { transferStatus: 'Pending' },
        { rcStatus: 'Pending' },
      ],
    },
    select: {
      rtoAgentMainId: true,
      agentNameLegacy: true,
      agentMobileNoLegacy: true,
      customerNameLegacy: true,
      customerMobLegacy: true,
      carRegistrationNo: true,
      rcStatus: true,
      transferStatus: true,
      customer: { select: { custName: true, custMobile: true } },
      partnerMaster: { select: { name: true, mobile: true } },
    },
    orderBy: { rtoAgentMainId: 'desc' },
  })
}

export async function getPendingPayments({
  includeRto,
  includeLoan,
  includeInsurance,
}: {
  includeRto: boolean
  includeLoan: boolean
  includeInsurance: boolean
}) {
  const [rtoRows, loanRows, insuranceRows] = await Promise.all([
    includeRto
      ? prisma.rtoAgent.findMany({
          select: {
            rtoAgentMainId: true,
            agentNameLegacy: true,
            agentMobileNoLegacy: true,
            customerNameLegacy: true,
            customerMobLegacy: true,
            carRegistrationNo: true,
            transferCharges: true,
            amtPaid: true,
            followupDate: true,
            customer: { select: { custName: true, custMobile: true } },
            partnerMaster: { select: { name: true, mobile: true } },
          },
          orderBy: { rtoAgentMainId: 'desc' },
        })
      : Promise.resolve([]),
    includeLoan
      ? prisma.loanManagement.findMany({
          select: {
            loanManagementId: true,
            bankPersonName: true,
            bankPersonMobileNo: true,
            customerNameLegacy: true,
            customerMobileLegacy: true,
            registrationNo: true,
            payoutAmount: true,
            totalAmountReceived: true,
            followupDate: true,
            customer: { select: { custName: true, custMobile: true } },
            partnerMaster: { select: { name: true, mobile: true } },
          },
          orderBy: { loanManagementId: 'desc' },
        })
      : Promise.resolve([]),
    includeInsurance
      ? prisma.insuranceMain.findMany({
          select: {
            insuranceMainId: true,
            agentNameLegacy: true,
            agentMobileNoLegacy: true,
            customerNameLegacy: true,
            customerMobileLegacy: true,
            carRegistrationNo: true,
            payoutAmount: true,
            totalAmountReceived: true,
            followupDate: true,
            customer: { select: { custName: true, custMobile: true } },
            partnerMaster: { select: { name: true, mobile: true } },
          },
          orderBy: { insuranceMainId: 'desc' },
        })
      : Promise.resolve([]),
  ])

  return [
    ...rtoRows
      .map(row => {
        const actual = toNumber(row.transferCharges)
        const received = toNumber(row.amtPaid)
        return {
          id: `rto-${row.rtoAgentMainId}`,
          type: 'RTO',
          registrationNo: row.carRegistrationNo,
          href: `/rto?registrationNo=${encodeURIComponent(row.carRegistrationNo ?? '')}`,
          customerName: row.customer?.custName ?? row.customerNameLegacy,
          customerMobile: row.customer?.custMobile ?? row.customerMobLegacy,
          agentName: row.partnerMaster?.name ?? row.agentNameLegacy,
          agentMobile: row.partnerMaster?.mobile ?? row.agentMobileNoLegacy,
          followupDate: row.followupDate,
          actual,
          received,
          balance: actual - received,
        }
      })
      .filter(row => row.actual > row.received),
    ...loanRows
      .map(row => {
        const actual = toNumber(row.payoutAmount)
        const received = toNumber(row.totalAmountReceived)
        return {
          id: `loan-${row.loanManagementId}`,
          type: 'Loan',
          registrationNo: row.registrationNo,
          href: `/loan?search=${encodeURIComponent(row.registrationNo ?? '')}`,
          customerName: row.customer?.custName ?? row.customerNameLegacy,
          customerMobile: row.customer?.custMobile ?? row.customerMobileLegacy,
          agentName: row.partnerMaster?.name ?? row.bankPersonName,
          agentMobile: row.partnerMaster?.mobile ?? row.bankPersonMobileNo,
          followupDate: row.followupDate,
          actual,
          received,
          balance: actual - received,
        }
      })
      .filter(row => row.actual > row.received),
    ...insuranceRows
      .map(row => {
        const actual = toNumber(row.payoutAmount)
        const received = toNumber(row.totalAmountReceived)
        return {
          id: `insurance-${row.insuranceMainId}`,
          type: 'Insurance',
          registrationNo: row.carRegistrationNo,
          href: `/insurance?search=${encodeURIComponent(row.carRegistrationNo ?? '')}`,
          customerName: row.customer?.custName ?? row.customerNameLegacy,
          customerMobile: row.customer?.custMobile ?? row.customerMobileLegacy,
          agentName: row.partnerMaster?.name ?? row.agentNameLegacy,
          agentMobile: row.partnerMaster?.mobile ?? row.agentMobileNoLegacy,
          followupDate: row.followupDate,
          actual,
          received,
          balance: actual - received,
        }
      })
      .filter(row => row.actual > row.received),
  ]
}

export async function getLeadSourceBreakdown() {
  const [totalInquiries, rows] = await Promise.all([
    prisma.inquiry.count(),
    prisma.inquirySourceMaster.findMany({
      where: { inquiries: { some: {} } },
      select: {
        displayName: true,
        _count: { select: { inquiries: true } },
      },
      orderBy: { inquiries: { _count: 'desc' } },
    }),
  ])
  const topSources = rows.slice(0, 5).map(row => ({ name: row.displayName, value: row._count.inquiries }))
  const otherSources = totalInquiries - topSources.reduce((total, row) => total + row.value, 0)

  return otherSources > 0 ? [...topSources, { name: 'Other', value: otherSources }] : topSources
}

export async function getPendingFollowups(limit: number | null = 8) {
  const rows = await prisma.inquiry.findMany({
    where: { status: 'FollowUp' },
    orderBy: [{ followUpDate: 'asc' }, { inquiryId: 'asc' }],
    ...(limit == null ? {} : { take: limit }),
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
