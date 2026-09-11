import { prisma } from '@/lib/db/prisma'

export interface LoanCustomerVehicleContext {
  inventoryId: number | null
  fkVariantId: number | null
  registrationNo: string | null
  make: string | null
  model: string | null
  variant: string | null
  year: number | null
}

export interface LoanCustomerMatch {
  id: string
  source: 'customer' | 'inquiry'
  customerId: number | null
  name: string
  mobile: string | null
  email: string | null
  inquiryId: number | null
  inquiryNo: string | null
  vehicle: LoanCustomerVehicleContext | null
}

const MOBILE_SEARCH_LIMIT = 10

function mobileDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

function vehicleFromInquiry(inquiry: {
  inquiryInventoryLinks: Array<{
    inventoryManagement: {
      inventoryId: number
      fkVariantId: number | null
      registrationNo: string | null
      year: number | null
      carVariantMaster: { variant: string | null; carMakeMaster: { make: string | null } | null; carModelMaster: { model: string | null } | null } | null
    }
  }>
  inquiryCarDetails: Array<{ fkVariantId: number | null; makeLegacy: string | null; modelLegacy: string | null; variantLegacy: string | null; year: number | null }>
}): LoanCustomerVehicleContext | null {
  const inventory = inquiry.inquiryInventoryLinks[0]?.inventoryManagement
  if (inventory) {
    return {
      inventoryId: inventory.inventoryId, fkVariantId: inventory.fkVariantId, registrationNo: inventory.registrationNo,
      make: inventory.carVariantMaster?.carMakeMaster?.make ?? null, model: inventory.carVariantMaster?.carModelMaster?.model ?? null,
      variant: inventory.carVariantMaster?.variant ?? null, year: inventory.year,
    }
  }
  const car = inquiry.inquiryCarDetails[0]
  if (!car) return null
  return { inventoryId: null, fkVariantId: car.fkVariantId, registrationNo: null, make: car.makeLegacy, model: car.modelLegacy, variant: car.variantLegacy, year: car.year }
}

/** Mobile-first lookup intentionally returns every person/inquiry record; shared mobiles are not deduplicated. */
export async function findLoanCustomerMatches(mobile: string): Promise<LoanCustomerMatch[]> {
  const digits = mobileDigits(mobile)
  if (digits.length < 3) return []

  const [customers, inquiries] = await Promise.all([
    prisma.customer.findMany({
      where: { custMobile: { contains: digits, mode: 'insensitive' } },
      select: { custId: true, custName: true, custMobile: true, custEmail: true },
      take: MOBILE_SEARCH_LIMIT,
      orderBy: { custName: 'asc' },
    }),
    prisma.inquiry.findMany({
      where: { mobileno: { contains: digits, mode: 'insensitive' } },
      select: {
        inquiryId: true, inquiryNo: true, customerId: true, customerNameLegacy: true, mobileno: true, email: true,
        customer: { select: { custId: true, custName: true, custMobile: true, custEmail: true } },
        inquiryInventoryLinks: {
          where: { isActive: true }, take: 1,
          select: { inventoryManagement: { select: { inventoryId: true, fkVariantId: true, registrationNo: true, year: true, carVariantMaster: { select: { variant: true, carMakeMaster: { select: { make: true } }, carModelMaster: { select: { model: true } } } } } } },
        },
        inquiryCarDetails: { take: 1, select: { fkVariantId: true, makeLegacy: true, modelLegacy: true, variantLegacy: true, year: true } },
      },
      take: MOBILE_SEARCH_LIMIT,
      orderBy: { inquiryId: 'desc' },
    }),
  ])

  return [
    ...customers.map(customer => ({
      id: `customer-${customer.custId}`, source: 'customer' as const, customerId: customer.custId,
      name: customer.custName, mobile: customer.custMobile, email: customer.custEmail, inquiryId: null, inquiryNo: null, vehicle: null,
    })),
    ...inquiries.map(inquiry => ({
      id: `inquiry-${inquiry.inquiryId}`, source: 'inquiry' as const, customerId: inquiry.customer?.custId ?? inquiry.customerId,
      name: inquiry.customer?.custName ?? inquiry.customerNameLegacy ?? 'Unnamed inquiry customer',
      mobile: inquiry.customer?.custMobile ?? inquiry.mobileno, email: inquiry.customer?.custEmail ?? inquiry.email,
      inquiryId: inquiry.inquiryId, inquiryNo: inquiry.inquiryNo, vehicle: vehicleFromInquiry(inquiry),
    })),
  ]
}
