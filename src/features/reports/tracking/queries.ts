import { prisma } from '@/lib/db/prisma'

export async function listTrackingStock() {
  return prisma.inventoryManagement.findMany({
    include: {
      carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } },
    },
    orderBy: { inventoryId: 'desc' },
  })
}

export async function getVehicleDetails(registrationNo: string) {
  const [checklist, insurance, rto, loan] = await Promise.all([
    prisma.checkListDocMain.findFirst({
      where: { registrationNo },
      include: { checklistDocDetails: true },
    }),
    prisma.insuranceMain.findFirst({ where: { carRegistrationNo: registrationNo }, include: { partnerMaster: true } }),
    prisma.rtoAgent.findFirst({ where: { carRegistrationNo: registrationNo }, include: { partnerMaster: true } }),
    prisma.loanManagement.findFirst({ where: { registrationNo }, include: { partnerMaster: true } }),
  ])

  return {
    checklist: checklist ? {
      ...checklist,
      documentId: checklist.documentId,
      checklistDocDetails: checklist.checklistDocDetails,
    } : null,
    insurance: insurance ? {
      ...insurance,
      insurancePremium: insurance.insurancePremium?.toString() ?? null,
      oDPremium: insurance.oDPremium?.toString() ?? null,
      payoutAmount: insurance.payoutAmount?.toString() ?? null,
      totalAmountReceived: insurance.totalAmountReceived?.toString() ?? null,
    } : null,
    rto: rto ? {
      ...rto,
      transferCharges: rto.transferCharges?.toString() ?? null,
      amtPaid: rto.amtPaid?.toString() ?? null,
    } : null,
    loan: loan ? {
      ...loan,
      loanAmount: loan.loanAmount?.toString() ?? null,
      payoutAmount: loan.payoutAmount?.toString() ?? null,
      totalAmountReceived: loan.totalAmountReceived?.toString() ?? null,
    } : null,
  }
}
