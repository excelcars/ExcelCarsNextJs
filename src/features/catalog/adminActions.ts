'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { cleanCatalogName } from '@/lib/catalogNames'

export type CatalogActionResult = { success: boolean; error?: string; id?: number }

export async function createMake(make: string): Promise<CatalogActionResult> {
  if (!(await getAuthorizedUserIdForRoute('/config/catalog'))) return { success: false, error: 'Not authorized.' }
  if (!cleanCatalogName(make)) return { success: false, error: 'Enter a make name; placeholders such as NA or null are not allowed.' }
  try {
    const value = make.trim()
    if (await prisma.carMakeMaster.findFirst({ where: { make: { equals: value, mode: 'insensitive' } } })) return { success: false, error: 'This make already exists.' }
    const created = await prisma.carMakeMaster.create({ data: { make: value, createdDt: new Date(), updatedDt: new Date() } })
    revalidatePath('/config/catalog')
    return { success: true, id: created.pkMakeId }
  } catch (err) { return { success: false, error: describeError(err) } }
}

export async function updateMake(id: number, make: string): Promise<CatalogActionResult> {
  if (!(await getAuthorizedUserIdForRoute('/config/catalog'))) return { success: false, error: 'Not authorized.' }
  if (!cleanCatalogName(make)) return { success: false, error: 'Enter a make name; placeholders such as NA or null are not allowed.' }
  try {
    const value = make.trim()
    if (await prisma.carMakeMaster.findFirst({ where: { make: { equals: value, mode: 'insensitive' }, NOT: { pkMakeId: id } } })) return { success: false, error: 'This make already exists.' }
    await prisma.carMakeMaster.update({ where: { pkMakeId: id }, data: { make: value, updatedDt: new Date() } })
    revalidatePath('/config/catalog')
    return { success: true }
  } catch (err) { return { success: false, error: describeError(err) } }
}

export async function createModel(model: string, makeId: number): Promise<CatalogActionResult> {
  if (!(await getAuthorizedUserIdForRoute('/config/catalog'))) return { success: false, error: 'Not authorized.' }
  if (!cleanCatalogName(model)) return { success: false, error: 'Enter a model name; placeholders such as NA or null are not allowed.' }
  if (!makeId) return { success: false, error: 'Make is required.' }
  return saveModel(model, makeId)
}

export async function updateModel(id: number, model: string, makeId: number): Promise<CatalogActionResult> {
  if (!(await getAuthorizedUserIdForRoute('/config/catalog'))) return { success: false, error: 'Not authorized.' }
  if (!cleanCatalogName(model)) return { success: false, error: 'Enter a model name; placeholders such as NA or null are not allowed.' }
  if (!makeId) return { success: false, error: 'Make is required.' }
  return saveModel(model, makeId, id)
}

async function saveModel(model: string, makeId: number, id?: number): Promise<CatalogActionResult> {
  try {
    const make = await prisma.carMakeMaster.findUnique({ where: { pkMakeId: makeId }, select: { make: true } })
    if (!make || !cleanCatalogName(make.make)) return { success: false, error: 'Select a named make. Repair incomplete make records in Vehicle Masters first.' }
    const value = model.trim()
    const duplicate = await prisma.carModelMaster.findFirst({ where: { model: { equals: value, mode: 'insensitive' }, fkMakeId: makeId, ...(id ? { NOT: { pkModelId: id } } : {}) } })
    if (duplicate) return { success: false, error: 'This model already exists for the selected make.' }
    let savedId = id
    if (id) await prisma.carModelMaster.update({ where: { pkModelId: id }, data: { model: value, fkMakeId: makeId, updatedDt: new Date() } })
    else savedId = (await prisma.carModelMaster.create({ data: { model: value, fkMakeId: makeId, createdDt: new Date(), updatedDt: new Date() } })).pkModelId
    revalidatePath('/config/catalog')
    return { success: true, id: savedId }
  } catch (err) { return { success: false, error: describeError(err) } }
}

export async function createVariant(variant: string, makeId: number, modelId: number): Promise<CatalogActionResult> {
  if (!(await getAuthorizedUserIdForRoute('/config/catalog'))) return { success: false, error: 'Not authorized.' }
  if (!cleanCatalogName(variant)) return { success: false, error: 'Enter a variant name; placeholders such as NA or null are not allowed.' }
  if (!makeId || !modelId) return { success: false, error: 'Make and model are required.' }
  return saveVariant(variant, makeId, modelId)
}

export async function updateVariant(id: number, variant: string, makeId: number, modelId: number): Promise<CatalogActionResult> {
  if (!(await getAuthorizedUserIdForRoute('/config/catalog'))) return { success: false, error: 'Not authorized.' }
  if (!cleanCatalogName(variant)) return { success: false, error: 'Enter a variant name; placeholders such as NA or null are not allowed.' }
  if (!makeId || !modelId) return { success: false, error: 'Make and model are required.' }
  return saveVariant(variant, makeId, modelId, id)
}

async function saveVariant(variant: string, makeId: number, modelId: number, id?: number): Promise<CatalogActionResult> {
  try {
    const model = await prisma.carModelMaster.findUnique({ where: { pkModelId: modelId }, select: { model: true, fkMakeId: true, carMakeMaster: { select: { make: true } } } })
    if (!model || model.fkMakeId !== makeId) return { success: false, error: 'The selected model must belong to the selected make.' }
    if (!cleanCatalogName(model.model) || !cleanCatalogName(model.carMakeMaster?.make)) return { success: false, error: 'Select a named make and model. Repair incomplete records in Vehicle Masters first.' }
    const value = variant.trim()
    const duplicate = await prisma.carVariantMaster.findFirst({ where: { variant: { equals: value, mode: 'insensitive' }, fkMakeId: makeId, fkModelId: modelId, ...(id ? { NOT: { pkVariantId: id } } : {}) } })
    if (duplicate) return { success: false, error: 'This variant already exists for the selected model.' }
    let savedId = id
    if (id) await prisma.carVariantMaster.update({ where: { pkVariantId: id }, data: { variant: value, fkMakeId: makeId, fkModelId: modelId, updatedDt: new Date() } })
    else savedId = (await prisma.carVariantMaster.create({ data: { variant: value, fkMakeId: makeId, fkModelId: modelId, createdDt: new Date(), updatedDt: new Date() } })).pkVariantId
    revalidatePath('/config/catalog')
    return { success: true, id: savedId }
  } catch (err) { return { success: false, error: describeError(err) } }
}

export async function deleteMake(id: number) {
  if (!(await getAuthorizedUserIdForRoute('/config/catalog'))) return { success: false, error: 'Not authorized.' }
  return deleteRecord(async () => {
    const variants = await prisma.carVariantMaster.findMany({ where: { fkMakeId: id }, select: { pkVariantId: true } })
    const variantIds = variants.map(variant => variant.pkVariantId)
    if (variantIds.length > 0 && await hasVariantDependencies(variantIds)) {
      throw new Error('This make has vehicle variants that are in use and cannot be deleted.')
    }
    await prisma.$transaction([
      prisma.carVariantMaster.deleteMany({ where: { fkMakeId: id } }),
      prisma.carModelMaster.deleteMany({ where: { fkMakeId: id } }),
      prisma.carMakeMaster.delete({ where: { pkMakeId: id } }),
    ])
  })
}

export async function deleteModel(id: number) {
  if (!(await getAuthorizedUserIdForRoute('/config/catalog'))) return { success: false, error: 'Not authorized.' }
  return deleteRecord(async () => {
    const variants = await prisma.carVariantMaster.findMany({ where: { fkModelId: id }, select: { pkVariantId: true } })
    const variantIds = variants.map(variant => variant.pkVariantId)
    if (variantIds.length > 0 && await hasVariantDependencies(variantIds)) {
      throw new Error('This model has vehicle variants that are in use and cannot be deleted.')
    }
    await prisma.$transaction([
      prisma.carVariantMaster.deleteMany({ where: { fkModelId: id } }),
      prisma.carModelMaster.delete({ where: { pkModelId: id } }),
    ])
  })
}
export async function deleteVariant(id: number) {
  if (!(await getAuthorizedUserIdForRoute('/config/catalog'))) return { success: false, error: 'Not authorized.' }
  return deleteRecord(async () => {
    if (await hasVariantDependencies([id])) {
      throw new Error('This variant is in use and cannot be deleted. Remove or change the linked vehicle records first.')
    }
    await prisma.carVariantMaster.delete({ where: { pkVariantId: id } })
  })
}

async function hasVariantDependencies(variantIds: number[]) {
  const where = { fkVariantId: { in: variantIds } }
  const counts = await Promise.all([
    prisma.inventoryManagement.count({ where }),
    prisma.customerFeedback.count({ where }),
    prisma.dsaManagement.count({ where }),
    prisma.inquiryCarDetails.count({ where }),
    prisma.insuranceMain.count({ where }),
    prisma.loanManagement.count({ where }),
    prisma.rtoAgent.count({ where }),
  ])
  return counts.some(Boolean)
}

async function deleteRecord(operation: () => Promise<unknown>): Promise<CatalogActionResult> {
  try { await operation(); revalidatePath('/config/catalog'); return { success: true } }
  catch (err) { return { success: false, error: describeError(err, true) } }
}

function describeError(err: unknown, deleting = false) {
  if (err instanceof Error && !('code' in err)) return err.message
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') return deleting ? 'This record is in use and cannot be deleted.' : 'This record could not be saved because a related record is missing.'
  return deleting ? 'Could not delete this record.' : 'Something went wrong saving this record.'
}
