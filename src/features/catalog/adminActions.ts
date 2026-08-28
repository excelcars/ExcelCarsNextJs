'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

export type CatalogActionResult = { success: boolean; error?: string; id?: number }

export async function createMake(make: string): Promise<CatalogActionResult> {
  if (!make.trim()) return { success: false, error: 'Make is required.' }
  try {
    const value = make.trim()
    if (await prisma.carMakeMaster.findFirst({ where: { make: { equals: value, mode: 'insensitive' } } })) return { success: false, error: 'This make already exists.' }
    const created = await prisma.carMakeMaster.create({ data: { make: value, createdDt: new Date(), updatedDt: new Date() } })
    revalidatePath('/config/catalog')
    return { success: true, id: created.pkMakeId }
  } catch (err) { return { success: false, error: describeError(err) } }
}

export async function updateMake(id: number, make: string): Promise<CatalogActionResult> {
  if (!make.trim()) return { success: false, error: 'Make is required.' }
  try {
    const value = make.trim()
    if (await prisma.carMakeMaster.findFirst({ where: { make: { equals: value, mode: 'insensitive' }, NOT: { pkMakeId: id } } })) return { success: false, error: 'This make already exists.' }
    await prisma.carMakeMaster.update({ where: { pkMakeId: id }, data: { make: value, updatedDt: new Date() } })
    revalidatePath('/config/catalog')
    return { success: true }
  } catch (err) { return { success: false, error: describeError(err) } }
}

export async function createModel(model: string, makeId: number): Promise<CatalogActionResult> {
  if (!model.trim()) return { success: false, error: 'Model is required.' }
  if (!makeId) return { success: false, error: 'Make is required.' }
  return saveModel(model, makeId)
}

export async function updateModel(id: number, model: string, makeId: number): Promise<CatalogActionResult> {
  if (!model.trim()) return { success: false, error: 'Model is required.' }
  if (!makeId) return { success: false, error: 'Make is required.' }
  return saveModel(model, makeId, id)
}

async function saveModel(model: string, makeId: number, id?: number): Promise<CatalogActionResult> {
  try {
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
  if (!variant.trim()) return { success: false, error: 'Variant is required.' }
  if (!makeId || !modelId) return { success: false, error: 'Make and model are required.' }
  return saveVariant(variant, makeId, modelId)
}

export async function updateVariant(id: number, variant: string, makeId: number, modelId: number): Promise<CatalogActionResult> {
  if (!variant.trim()) return { success: false, error: 'Variant is required.' }
  if (!makeId || !modelId) return { success: false, error: 'Make and model are required.' }
  return saveVariant(variant, makeId, modelId, id)
}

async function saveVariant(variant: string, makeId: number, modelId: number, id?: number): Promise<CatalogActionResult> {
  try {
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

export async function deleteMake(id: number) { return deleteRecord(() => prisma.carMakeMaster.delete({ where: { pkMakeId: id } })) }
export async function deleteModel(id: number) { return deleteRecord(() => prisma.carModelMaster.delete({ where: { pkModelId: id } })) }
export async function deleteVariant(id: number) { return deleteRecord(() => prisma.carVariantMaster.delete({ where: { pkVariantId: id } })) }

async function deleteRecord(operation: () => Promise<unknown>): Promise<CatalogActionResult> {
  try { await operation(); revalidatePath('/config/catalog'); return { success: true } }
  catch (err) { return { success: false, error: describeError(err, true) } }
}

function describeError(err: unknown, deleting = false) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') return deleting ? 'This record is in use and cannot be deleted.' : 'This record could not be saved because a related record is missing.'
  return 'Something went wrong saving this record.'
}
