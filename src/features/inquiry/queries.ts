import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export const INQUIRY_STATUSES = ['FollowUp', 'Closed'] as const
export const INQUIRY_CLASSIFICATIONS = ['Hot', 'Warm', 'Cold'] as const
export const PAGE_SIZE = 25

export interface ListInquiriesParams {
  search: string
  status: string
  classification: string
  page: number
}

export async function listInquiries({ search, status, classification, page }: ListInquiriesParams) {
  const where: Prisma.InquiryWhereInput = {}

  if (status !== 'All') {
    where.status = status
  }
  if (classification !== 'All') {
    where.classification = classification
  }

  if (search.trim()) {
    const q = search.trim()
    where.OR = [
      { inquiryNo: { contains: q, mode: 'insensitive' } },
      { mobileno: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { customerNameLegacy: { contains: q, mode: 'insensitive' } },
      { customer: { custName: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const skip = Math.max(0, (page - 1) * PAGE_SIZE)

  const [rows, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: {
        customer: true,
        inquiryCarDetails: {
          include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } },
        },
      },
      orderBy: { inquiryId: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.inquiry.count({ where }),
  ])

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

export async function getInquiryById(id: number) {
  return prisma.inquiry.findUnique({
    where: { inquiryId: id },
    include: {
      customer: true,
      inquiryCarDetails: {
        include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } },
      },
    },
  })
}

export async function getMakes() {
  return prisma.carMakeMaster.findMany({
    where: { make: { not: null } },
    orderBy: { make: 'asc' },
  })
}
