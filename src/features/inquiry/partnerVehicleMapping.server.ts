import type { Prisma } from '@prisma/client'
import { partnerVehicleKey, partnerVehicleSelection } from './partnerVehicleCatalog'

export class PartnerVehicleMappingError extends Error {}

export async function resolvePartnerMappingDescription(tx: Pick<Prisma.TransactionClient, 'partnerWebhookPayload' | 'inquiry'>, inquiryId: number, cars: Array<{ subVariant: string | null }>, requestedDescription?: string) {
  const payload = await tx.partnerWebhookPayload.findFirst({
    where: { inquiryId, partner: 'CARDEKHO' }, orderBy: { partnerWebhookPayloadId: 'asc' }, select: { rawPayload: true },
  })
  if (!payload) {
    const inquiry = await tx.inquiry.findUnique({ where: { inquiryId }, select: { website: true, source: { select: { code: true } } } })
    if (inquiry?.source?.code !== 'CARDEKHO' && inquiry?.website?.trim().toLowerCase() !== 'cardekho') {
      throw new PartnerVehicleMappingError('This is not a CarDekho inquiry.')
    }
  }
  const raw = payload?.rawPayload
  const original = raw && typeof raw === 'object' && !Array.isArray(raw) && typeof raw.mmv === 'string' ? raw.mmv.trim().slice(0, 500) : ''
  const descriptions = [...new Map(cars.filter(car => car.subVariant?.trim()).map(car => [partnerVehicleKey(car.subVariant!), car.subVariant!.trim()])).values()]
  const description = original || requestedDescription?.trim() || (descriptions.length === 1 ? descriptions[0] : '')
  if (!description || !descriptions.some(value => partnerVehicleKey(value) === partnerVehicleKey(description))) {
    throw new PartnerVehicleMappingError('Choose a vehicle with a saved description. If none is recorded, add the vehicle description in Edit Inquiry first.')
  }
  if (requestedDescription && partnerVehicleKey(description) !== partnerVehicleKey(requestedDescription)) {
    throw new PartnerVehicleMappingError('The vehicle description changed. Refresh and try again.')
  }
  return description
}

export async function rememberPartnerVehicleMapping(tx: Prisma.TransactionClient, input: {
  inquiryId: number
  userId: number
  existingCars: Array<{ subVariant: string | null }>
  cars: Array<{ subVariant: string; fkVariantId: number | null }>
  description?: string
}) {
  const description = await resolvePartnerMappingDescription(tx, input.inquiryId, input.existingCars, input.description)
  const key = partnerVehicleKey(description)
  const originalCar = input.existingCars.some(car => partnerVehicleKey(car.subVariant ?? '') === key)
  const selectedIds = [...new Set(input.cars.filter(car => partnerVehicleKey(car.subVariant) === key && car.fkVariantId).map(car => car.fkVariantId!))]
  if (!key || !originalCar || selectedIds.length !== 1) throw new PartnerVehicleMappingError('Keep the original CarDekho vehicle text and select one catalog variant before remembering the mapping.')
  const variant = await tx.carVariantMaster.findUnique({ where: { pkVariantId: selectedIds[0] }, include: { carMakeMaster: true, carModelMaster: true } })
  if (!variant || !partnerVehicleSelection(variant)) throw new PartnerVehicleMappingError('Select a complete catalog make, model, and variant before remembering the mapping.')
  const previous = await tx.partnerVehicleMapping.findUnique({ where: { partner_descriptionKey: { partner: 'CARDEKHO', descriptionKey: key } }, select: { variantId: true } })
  await tx.partnerVehicleMapping.upsert({
    where: { partner_descriptionKey: { partner: 'CARDEKHO', descriptionKey: key } },
    create: { partner: 'CARDEKHO', descriptionKey: key, description, variantId: variant.pkVariantId, confirmedBy: input.userId },
    update: { description, variantId: variant.pkVariantId, confirmedBy: input.userId },
  })
  return { description, variantId: variant.pkVariantId, previousVariantId: previous?.variantId ?? null }
}
