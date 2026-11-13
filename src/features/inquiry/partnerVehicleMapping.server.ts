import type { Prisma } from '@prisma/client'
import { partnerVehicleKey, partnerVehicleSelection } from './partnerVehicleCatalog'

export class PartnerVehicleMappingError extends Error {}

export async function rememberPartnerVehicleMapping(tx: Prisma.TransactionClient, input: {
  inquiryId: number
  userId: number
  existingCars: Array<{ subVariant: string | null }>
  cars: Array<{ subVariant: string; fkVariantId: number | null }>
}) {
  const payloads = await tx.partnerWebhookPayload.findMany({
    where: { inquiryId: input.inquiryId, partner: 'CARDEKHO' }, orderBy: { partnerWebhookPayloadId: 'asc' },
    distinct: ['externalLeadId'],
    select: { rawPayload: true },
  })
  const descriptions = [...new Set(payloads.flatMap(payload => {
    const raw = payload.rawPayload
    return raw && typeof raw === 'object' && !Array.isArray(raw) && typeof raw.mmv === 'string' ? [raw.mmv.trim().slice(0, 500)] : []
  }))]
  const confirmed = []
  for (const description of descriptions) {
    const key = partnerVehicleKey(description)
    const originalCar = input.existingCars.some(car => partnerVehicleKey(car.subVariant ?? '') === key)
    const selectedIds = [...new Set(input.cars.filter(car => partnerVehicleKey(car.subVariant) === key && car.fkVariantId).map(car => car.fkVariantId!))]
    if (!key || !originalCar || !selectedIds.length) continue
    if (selectedIds.length !== 1) throw new PartnerVehicleMappingError('Select one catalog variant for each original CarDekho vehicle description before remembering the mapping.')
    const variant = await tx.carVariantMaster.findUnique({ where: { pkVariantId: selectedIds[0] }, include: { carMakeMaster: true, carModelMaster: true } })
    if (!variant || !partnerVehicleSelection(variant)) throw new PartnerVehicleMappingError('Select a complete catalog make, model, and variant before remembering the mapping.')
    const previous = await tx.partnerVehicleMapping.findUnique({ where: { partner_descriptionKey: { partner: 'CARDEKHO', descriptionKey: key } }, select: { variantId: true } })
    await tx.partnerVehicleMapping.upsert({
      where: { partner_descriptionKey: { partner: 'CARDEKHO', descriptionKey: key } },
      create: { partner: 'CARDEKHO', descriptionKey: key, description, variantId: variant.pkVariantId, confirmedBy: input.userId },
      update: { description, variantId: variant.pkVariantId, confirmedBy: input.userId },
    })
    confirmed.push({ description, variantId: variant.pkVariantId, previousVariantId: previous?.variantId ?? null })
  }
  if (!confirmed.length) throw new PartnerVehicleMappingError('Keep the original CarDekho vehicle text and select a catalog variant before remembering the mapping.')
  return confirmed
}
