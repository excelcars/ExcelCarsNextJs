import { prisma } from '@/lib/db/prisma'
import { matchPartnerVehicle, partnerVehicleKey, partnerVehicleSelection } from './partnerVehicleCatalog'

export async function resolvePartnerVehicle(partner: string, description: string) {
  const mapping = await prisma.partnerVehicleMapping.findUnique({
    where: { partner_descriptionKey: { partner, descriptionKey: partnerVehicleKey(description) } },
    include: { variant: { include: { carMakeMaster: true, carModelMaster: true } } },
  })
  if (mapping) {
    const selection = partnerVehicleSelection(mapping.variant)
    if (selection) return selection
  }
  return matchPartnerVehicle(description, await prisma.carVariantMaster.findMany({
    include: { carMakeMaster: true, carModelMaster: true },
  }))
}
