import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

const OTHER_LEAD_SOURCES_CODE = '__OTHER__'

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function dateParam(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfToday() {
  return startOfDay()
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
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
      key: 'all',
      label: 'All Leads',
      href: '/inquiry?quickFilter=all',
      ownHref: `/inquiry?quickFilter=all&userId=${userId}`,
    },
    {
      key: 'fresh',
      label: 'Fresh Leads',
      href: `/inquiry?quickFilter=all&inquiryDate=${dateParam(today)}`,
      ownHref: `/inquiry?quickFilter=all&inquiryDate=${dateParam(today)}&userId=${userId}`,
    },
    {
      key: 'appointment',
      label: "Today's Appointment Fixed",
      href: `/followup?status=FollowUp&followUpDateFrom=${dateParam(today)}&followUpDateTo=${dateParam(today)}&subStatus=${encodeURIComponent('Appt. Fixed')}`,
      ownHref: `/followup?status=FollowUp&followUpDateFrom=${dateParam(today)}&followUpDateTo=${dateParam(today)}&subStatus=${encodeURIComponent('Appt. Fixed')}&userId=${userId}`,
    },
    {
      key: 'todayFollowup',
      label: 'Follow up Today',
      href: `/followup?status=FollowUp&followUpDateFrom=${dateParam(today)}&followUpDateTo=${dateParam(today)}`,
      ownHref: `/followup?status=FollowUp&followUpDateFrom=${dateParam(today)}&followUpDateTo=${dateParam(today)}&userId=${userId}`,
    },
    {
      key: 'pending',
      label: 'Pending Follow up',
      href: `/followup?status=FollowUp&followUpDateTo=${dateParam(yesterday)}`,
      ownHref: `/followup?status=FollowUp&followUpDateTo=${dateParam(yesterday)}&userId=${userId}`,
    },
    {
      key: 'upcoming',
      label: 'Follow up (Upcoming)',
      href: `/followup?status=FollowUp&followUpDateFrom=${dateParam(tomorrow)}`,
      ownHref: `/followup?status=FollowUp&followUpDateFrom=${dateParam(tomorrow)}&userId=${userId}`,
    },
    {
      key: 'closed',
      label: 'Closed',
      href: '/followup?status=Closed',
      ownHref: `/followup?status=Closed&userId=${userId}`,
    },
  ]

  // One aggregate scan replaces 21 concurrent count queries on every lead-dashboard load.
  // The values deliberately retain the existing definitions used by the linked screens.
  const [counts] = await prisma.$queryRaw<Array<Record<string, number>>>(Prisma.sql`
    SELECT
      COUNT(*)::integer AS "all",
      COUNT(*) FILTER (WHERE date_of_inquiry >= ${today} AND date_of_inquiry < ${tomorrow})::integer AS fresh,
      COUNT(*) FILTER (WHERE status = 'FollowUp' AND sub_status = 'Appt. Fixed' AND follow_up_date >= ${today} AND follow_up_date < ${tomorrow})::integer AS appointment,
      COUNT(*) FILTER (WHERE status = 'FollowUp' AND follow_up_date >= ${today} AND follow_up_date < ${tomorrow})::integer AS "todayFollowup",
      COUNT(*) FILTER (WHERE status = 'FollowUp' AND follow_up_date < ${today})::integer AS pending,
      COUNT(*) FILTER (WHERE status = 'FollowUp' AND follow_up_date >= ${tomorrow})::integer AS upcoming,
      COUNT(*) FILTER (WHERE status = 'Closed')::integer AS closed,
      COUNT(*) FILTER (WHERE created_by = ${userId})::integer AS "own_all",
      COUNT(*) FILTER (WHERE created_by = ${userId} AND date_of_inquiry >= ${today} AND date_of_inquiry < ${tomorrow})::integer AS own_fresh,
      COUNT(*) FILTER (WHERE created_by = ${userId} AND status = 'FollowUp' AND sub_status = 'Appt. Fixed' AND follow_up_date >= ${today} AND follow_up_date < ${tomorrow})::integer AS own_appointment,
      COUNT(*) FILTER (WHERE created_by = ${userId} AND status = 'FollowUp' AND follow_up_date >= ${today} AND follow_up_date < ${tomorrow})::integer AS "own_todayFollowup",
      COUNT(*) FILTER (WHERE created_by = ${userId} AND status = 'FollowUp' AND follow_up_date < ${today})::integer AS own_pending,
      COUNT(*) FILTER (WHERE created_by = ${userId} AND status = 'FollowUp' AND follow_up_date >= ${tomorrow})::integer AS own_upcoming,
      COUNT(*) FILTER (WHERE created_by = ${userId} AND status = 'Closed')::integer AS own_closed
    FROM inquiry
  `)

  return rows.map(row => {
    const all = Number(counts?.[row.key] ?? 0)
    const own = Number(counts?.[`own_${row.key}`] ?? 0)
    const total = isRestricted ? own : all
    return {
    label: row.label,
    total,
    own,
    other: isRestricted ? 0 : Math.max(all - own, 0),
    href: isRestricted ? row.ownHref : row.href,
    ownHref: row.ownHref,
    }
  })
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
  const checkDate = addDays(today, 30)
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
        code: true,
        displayName: true,
        _count: { select: { inquiries: true } },
      },
      orderBy: { inquiries: { _count: 'desc' } },
    }),
  ])
  const topSources = rows.slice(0, 5).map(row => ({ name: row.displayName, sourceCode: row.code, value: row._count.inquiries }))
  const otherSources = totalInquiries - topSources.reduce((total, row) => total + row.value, 0)

  return otherSources > 0 ? [...topSources, { name: 'Other', sourceCode: OTHER_LEAD_SOURCES_CODE, value: otherSources }] : topSources
}

function countLeadDimensions(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>()
  for (const value of values) {
    const name = value?.trim()
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}

export async function getLeadRegionBreakdowns() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const [rows, sourceRows] = await Promise.all([
    prisma.inquiry.findMany({
      where: { locationId: { not: null }, dateOfInquiry: { gte: yearStart, lt: now } },
      select: {
        dateOfInquiry: true,
        source: { select: { code: true } },
        reportingLocation: { select: { region: true } },
      },
    }),
    prisma.inquirySourceMaster.findMany({
      where: { inquiries: { some: {} } },
      select: { code: true, _count: { select: { inquiries: true } } },
      orderBy: { inquiries: { _count: 'desc' } },
      take: 5,
    }),
  ])

  const ranges = { month: monthStart, quarter: quarterStart, year: yearStart } as const
  const all = { month: [] as string[], quarter: [] as string[], year: [] as string[] }
  const bySource: Record<string, { month: string[]; quarter: string[]; year: string[] }> = {}
  const topSourceCodes = new Set(sourceRows.map(row => row.code))
  bySource[OTHER_LEAD_SOURCES_CODE] = { month: [], quarter: [], year: [] }

  for (const row of rows) {
    if (!row.dateOfInquiry || !row.reportingLocation?.region) continue
    const sourceCode = row.source?.code
    if (sourceCode && !bySource[sourceCode]) bySource[sourceCode] = { month: [], quarter: [], year: [] }

    for (const [period, start] of Object.entries(ranges) as Array<[keyof typeof ranges, Date]>) {
      if (row.dateOfInquiry < start) continue
      all[period].push(row.reportingLocation.region)
      if (sourceCode) bySource[sourceCode][period].push(row.reportingLocation.region)
      if (!sourceCode || !topSourceCodes.has(sourceCode)) bySource[OTHER_LEAD_SOURCES_CODE][period].push(row.reportingLocation.region)
    }
  }

  return {
    all: {
      month: countLeadDimensions(all.month),
      quarter: countLeadDimensions(all.quarter),
      year: countLeadDimensions(all.year),
    },
    bySource: Object.fromEntries(Object.entries(bySource).map(([sourceCode, breakdowns]) => [sourceCode, {
      month: countLeadDimensions(breakdowns.month),
      quarter: countLeadDimensions(breakdowns.quarter),
      year: countLeadDimensions(breakdowns.year),
    }])),
  }
}

export async function getAssignedExpiryRenewalPolicies(assignedUserId: number) {
  const today = startOfToday()
  const checkDate = addDays(today, 30)
  return prisma.insuranceMain.findMany({
    where: {
      expiryDate: { gte: today, lte: checkDate },
      customer: { inquiry: { some: { assignedTo: assignedUserId } } },
    },
    select: {
      insuranceMainId: true,
      customerNameLegacy: true,
      customerMobileLegacy: true,
      carRegistrationNo: true,
      expiryDate: true,
      renewalDate: true,
      customer: { select: { custName: true, custMobile: true } },
    },
    orderBy: { expiryDate: 'asc' },
  })
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
