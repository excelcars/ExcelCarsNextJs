'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { canAccessInquiryByOwnership, getInquiryOwnershipScopeForRoute, buildInquiryOwnershipWhere } from '@/lib/access/inquiryOwnership'
import { partnerVehicleKey, partnerVehicleSelection } from './partnerVehicleCatalog'
import { rememberPartnerVehicleMapping, resolvePartnerMappingDescription, PartnerVehicleMappingError } from './partnerVehicleMapping.server'
import { cleanCatalogName } from '@/lib/catalogNames'
import type { Prisma } from '@prisma/client'
import { ensureInquiryActivityLogTable, logInquiryEvent } from './eventLog'

async function authorizedUser(inquiryId: number) {
  if (!Number.isSafeInteger(inquiryId) || inquiryId <= 0) return null
  const userId = await getAuthorizedUserIdForRoute('/inquiry')
  return userId && await canAccessInquiryByOwnership(inquiryId, '/inquiry') ? userId : null
}

async function mappingTarget(db: Pick<typeof prisma, 'partnerWebhookPayload' | 'inquiryCarDetails' | 'inquiry'>, inquiryId: number, requestedDescription?: string) {
  const cars = await db.inquiryCarDetails.findMany({ where: { fkInquiryId: inquiryId } })
  const description = await resolvePartnerMappingDescription(db, inquiryId, cars, requestedDescription)
  const car = cars.find(item => item.fkVariantId === null && partnerVehicleKey(item.subVariant ?? '') === partnerVehicleKey(description))
  if (!car) throw new PartnerVehicleMappingError('This vehicle is already mapped or has changed. Refresh the inquiry.')
  return { description, car }
}

async function olderMatchingCars(db: Pick<Prisma.TransactionClient, 'inquiryCarDetails'>, inquiryId: number, description: string, ownershipWhere: Prisma.InquiryWhereInput) {
  const cars = await db.inquiryCarDetails.findMany({
    where: { fkInquiryId: { not: inquiryId }, fkVariantId: null, makeLegacy: null, modelLegacy: null, variantLegacy: null, subVariant: { not: null },
      inquiry: { AND: [ownershipWhere, { OR: [{ source: { code: 'CARDEKHO' } }, { website: { equals: 'CarDekho', mode: 'insensitive' } }] }] } },
  })
  return cars.filter(car => car.fkInquiryId !== inquiryId && car.fkVariantId === null && !car.makeLegacy && !car.modelLegacy && !car.variantLegacy && partnerVehicleKey(car.subVariant ?? '') === partnerVehicleKey(description))
}

export async function getQuickVehicleMappingOptions(inquiryId: number, requestedDescription?: string) {
  if (!(await authorizedUser(inquiryId))) return { error: 'You do not have permission to map this inquiry.' }
  try {
    const { description } = await mappingTarget(prisma, inquiryId, requestedDescription)
    const scope = await getInquiryOwnershipScopeForRoute('/inquiry')
    if (!scope.userId) return { error: 'Your session expired. Sign in again.' }
    const ownershipWhere = scope.restrictToUserId ? buildInquiryOwnershipWhere(scope.restrictToUserId, scope.ownershipMode) : {}
    const [catalog, makes, models, older, catalogUser] = await Promise.all([
      prisma.carVariantMaster.findMany({ include: { carMakeMaster: true, carModelMaster: true } }),
      prisma.carMakeMaster.findMany({ orderBy: { make: 'asc' }, select: { pkMakeId: true, make: true } }),
      prisma.carModelMaster.findMany({ orderBy: { model: 'asc' }, select: { pkModelId: true, fkMakeId: true, model: true } }),
      olderMatchingCars(prisma, inquiryId, description, ownershipWhere),
      getAuthorizedUserIdForRoute('/config/catalog'),
    ])
    const options = catalog.flatMap(row => {
      const selection = partnerVehicleSelection(row)
      return selection ? [{ variantId: row.pkVariantId, makeId: row.carMakeMaster!.pkMakeId, modelId: row.carModelMaster!.pkModelId,
        make: selection.makeLegacy, model: selection.modelLegacy, variant: selection.variantLegacy }] : []
    }).sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || a.variant.localeCompare(b.variant))
    return { description, options, makes: makes.flatMap(row => cleanCatalogName(row.make) ? [{ id: row.pkMakeId, name: cleanCatalogName(row.make) }] : []),
      models: models.flatMap(row => cleanCatalogName(row.model) && row.fkMakeId ? [{ id: row.pkModelId, makeId: row.fkMakeId, name: cleanCatalogName(row.model) }] : []),
      canCreateCatalog: Boolean(catalogUser), olderInquiryCount: new Set(older.map(car => car.fkInquiryId)).size }
  } catch (error) {
    return { error: error instanceof PartnerVehicleMappingError ? error.message : 'Could not load vehicle choices. Try again.' }
  }
}

export async function saveQuickVehicleMapping(inquiryId: number, variantId: number, options: { description?: string; applyToExisting?: boolean } = {}) {
  const userId = await authorizedUser(inquiryId)
  if (!userId) return { success: false, error: 'You do not have permission to map this inquiry.' }
  if (!Number.isSafeInteger(variantId) || variantId <= 0) return { success: false, error: 'Select a variant before saving.' }
  try {
    const scope = await getInquiryOwnershipScopeForRoute('/inquiry')
    if (!scope.userId) return { success: false, error: 'Your session expired. Sign in again.' }
    const ownershipWhere = scope.restrictToUserId ? buildInquiryOwnershipWhere(scope.restrictToUserId, scope.ownershipMode) : {}
    await ensureInquiryActivityLogTable()
    const updatedOlderCount = await prisma.$transaction(async tx => {
      const { description, car } = await mappingTarget(tx, inquiryId, options.description)
      const variant = await tx.carVariantMaster.findUnique({ where: { pkVariantId: variantId }, include: { carMakeMaster: true, carModelMaster: true } })
      const selection = variant && partnerVehicleSelection(variant)
      if (!selection) throw new PartnerVehicleMappingError('Select a complete catalog make, model, and variant.')
      await rememberPartnerVehicleMapping(tx, { inquiryId, userId, existingCars: [car], cars: [{ subVariant: description, fkVariantId: variantId }], description })
      const now = new Date()
      const updated = await tx.inquiryCarDetails.updateMany({
        where: { inquiryCarDetailsId: car.inquiryCarDetailsId, fkInquiryId: inquiryId, fkVariantId: null, subVariant: car.subVariant, inquiry: ownershipWhere },
        data: { ...selection, updatedDt: now, updatedBy: userId },
      })
      if (updated.count !== 1) throw new PartnerVehicleMappingError('The vehicle changed while you were mapping it. Refresh and try again.')
      await tx.inquiry.update({ where: { inquiryId }, data: { updatedDt: now } })
      await logInquiryEvent(tx, { inquiryId, eventType: 'partner_vehicle_mapping_confirmed', eventLabel: 'CarDekho vehicle mapping confirmed',
        eventDetail: `${description} → ${selection.makeLegacy} ${selection.modelLegacy} ${selection.variantLegacy} (variant #${variantId})`, actorUserId: userId, createdAt: now })
      const updatedInquiries = new Set<number>()
      if (options.applyToExisting) {
        const older = await olderMatchingCars(tx, inquiryId, description, ownershipWhere)
        for (const row of older) {
          if (!row.fkInquiryId) continue
          const result = await tx.inquiryCarDetails.updateMany({
            where: { inquiryCarDetailsId: row.inquiryCarDetailsId, fkVariantId: null, makeLegacy: null, modelLegacy: null, variantLegacy: null, subVariant: row.subVariant,
              inquiry: ownershipWhere }, data: { ...selection, updatedDt: now, updatedBy: userId },
          })
          if (result.count === 1) updatedInquiries.add(row.fkInquiryId)
        }
        for (const id of updatedInquiries) {
          await tx.inquiry.update({ where: { inquiryId: id }, data: { updatedDt: now } })
          await logInquiryEvent(tx, { inquiryId: id, eventType: 'partner_vehicle_mapping_applied', eventLabel: 'Saved CarDekho vehicle mapping applied',
            eventDetail: `${description} → catalog variant #${variantId}; confirmed from inquiry #${inquiryId}`, actorUserId: userId, createdAt: now })
        }
      }
      return updatedInquiries.size
    }, { timeout: 60_000 })
    revalidatePath('/inquiry')
    revalidatePath('/followup')
    revalidatePath('/dashboard')
    return { success: true, updatedOlderCount }
  } catch (error) {
    return { success: false, error: error instanceof PartnerVehicleMappingError ? error.message : 'Could not save vehicle mapping. Try again.' }
  }
}
