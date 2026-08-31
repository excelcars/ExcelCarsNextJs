import { prisma } from '@/lib/db/prisma'

export const RECIPIENT_GROUPS = ['Customers', 'Contacts', 'Dealers', 'RTO Agents', 'Insurance Agents', 'Loan Agents'] as const
export type RecipientGroup = typeof RECIPIENT_GROUPS[number]

export interface RecipientOption {
  group: RecipientGroup
  id: number
  name: string
  email: string | null
  mobile: string | null
}

export interface RecipientSelection {
  group: RecipientGroup
  id: number
}

const GROUP_LABELS: Record<RecipientGroup, string> = {
  Customers: 'Customer',
  Contacts: 'Contact',
  Dealers: 'Dealer',
  'RTO Agents': 'RTO Agent',
  'Insurance Agents': 'Insurance Agent',
  'Loan Agents': 'Bank',
}

function toOptions(group: RecipientGroup, rows: Array<{ id: number; name: string | null; email: string | null; mobile: string | null }>): RecipientOption[] {
  return rows
    .filter(row => !!row.name && !!row.email?.trim())
    .map(row => ({ group, id: row.id, name: row.name!.trim(), email: row.email!.trim(), mobile: row.mobile }))
}

export async function searchMessageRecipients(group: RecipientGroup, query: string): Promise<RecipientOption[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const contains = { contains: q, mode: 'insensitive' as const }

  switch (group) {
    case 'Customers':
    case 'Contacts':
      return toOptions(group, await prisma.customer.findMany({
        where: { ...(group === 'Contacts' ? { type: 'Contact' } : {}), OR: [{ custName: contains }, { custMobile: contains }, { custEmail: contains }] },
        select: { custId: true, custName: true, custEmail: true, custMobile: true },
        orderBy: { custName: 'asc' }, take: 25,
      }).then(rows => rows.map(row => ({ id: row.custId, name: row.custName, email: row.custEmail, mobile: row.custMobile }))))
    case 'Dealers':
      return toOptions(group, await prisma.dealerMaster.findMany({
        where: { OR: [{ dealerName: contains }, { dealerMobileNo: contains }, { dealerEmail: contains }] },
        select: { dealerId: true, dealerName: true, dealerEmail: true, dealerMobileNo: true },
        orderBy: { dealerName: 'asc' }, take: 25,
      }).then(rows => rows.map(row => ({ id: row.dealerId, name: row.dealerName, email: row.dealerEmail, mobile: row.dealerMobileNo }))))
    case 'RTO Agents':
    case 'Insurance Agents':
    case 'Loan Agents':
      return toOptions(group, await prisma.partnerMaster.findMany({
        where: { partnerType: GROUP_LABELS[group], OR: [{ name: contains }, { mobile: contains }, { email: contains }] },
        select: { partnerId: true, name: true, email: true, mobile: true },
        orderBy: { name: 'asc' }, take: 25,
      }).then(rows => rows.map(row => ({ id: row.partnerId, name: row.name, email: row.email, mobile: row.mobile }))))
  }
}

export async function resolveMessageRecipients(selections: RecipientSelection[]): Promise<RecipientOption[]> {
  const idsByGroup = new Map<RecipientGroup, number[]>()
  for (const selection of selections) {
    if (!RECIPIENT_GROUPS.includes(selection.group) || !Number.isInteger(selection.id) || selection.id <= 0) continue
    idsByGroup.set(selection.group, [...new Set([...(idsByGroup.get(selection.group) ?? []), selection.id])])
  }

  const results = await Promise.all([...idsByGroup].map(async ([group, ids]) => {
    switch (group) {
      case 'Customers':
      case 'Contacts':
        return toOptions(group, (await prisma.customer.findMany({
          where: { custId: { in: ids }, ...(group === 'Contacts' ? { type: 'Contact' } : {}) },
          select: { custId: true, custName: true, custEmail: true, custMobile: true },
        })).map(row => ({ id: row.custId, name: row.custName, email: row.custEmail, mobile: row.custMobile })))
      case 'Dealers':
        return toOptions(group, (await prisma.dealerMaster.findMany({
          where: { dealerId: { in: ids } }, select: { dealerId: true, dealerName: true, dealerEmail: true, dealerMobileNo: true },
        })).map(row => ({ id: row.dealerId, name: row.dealerName, email: row.dealerEmail, mobile: row.dealerMobileNo })))
      case 'RTO Agents':
      case 'Insurance Agents':
      case 'Loan Agents':
        return toOptions(group, (await prisma.partnerMaster.findMany({
          where: { partnerId: { in: ids }, partnerType: GROUP_LABELS[group] }, select: { partnerId: true, name: true, email: true, mobile: true },
        })).map(row => ({ id: row.partnerId, name: row.name, email: row.email, mobile: row.mobile })))
    }
  }))

  return results.flat()
}
