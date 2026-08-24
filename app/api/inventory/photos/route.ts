import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../../auth'

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'inventory')
const PUBLIC_PREFIX = '/uploads/inventory'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE = 10 * 1024 * 1024

function safeExt(fileName: string, mimeType: string) {
  const ext = path.extname(fileName).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  return '.jpg'
}

function fileNameFromPath(photoPath: string | null) {
  if (!photoPath) return 'file'
  const normalized = photoPath.replace(/\\/g, '/')
  return normalized.split('/').pop() || normalized
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const inventoryId = Number(req.nextUrl.searchParams.get('inventoryId'))
  const inventoryNumber = req.nextUrl.searchParams.get('inventoryNumber')?.trim() || null
  if (!inventoryId && !inventoryNumber) return NextResponse.json([])

  const photos = await prisma.inventoryPhotos.findMany({
    where: {
      OR: [
        ...(inventoryId ? [{ fkInventoryId: inventoryId }] : []),
        ...(inventoryNumber ? [{ inventoryNumberLegacy: inventoryNumber }] : []),
      ],
    },
    orderBy: { documentId: 'desc' },
  })

  const deduped = Array.from(new Map(photos.map(photo => [photo.documentId, photo])).values())
  return NextResponse.json(
    deduped.map(photo => ({
      documentId: photo.documentId,
      path: photo.path,
      inventoryNumberLegacy: photo.inventoryNumberLegacy,
      isUploadedHere: Boolean(photo.path?.startsWith(PUBLIC_PREFIX)),
      fileName: fileNameFromPath(photo.path),
    })),
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const inventoryId = Number(formData.get('inventoryId'))
  const inventoryNumber = String(formData.get('inventoryNumber') || '').trim()
  const files = formData.getAll('files').filter((value): value is File => value instanceof File)

  if (!inventoryId || !inventoryNumber) {
    return NextResponse.json({ error: 'Inventory reference is required.' }, { status: 400 })
  }
  if (files.length === 0) {
    return NextResponse.json({ error: 'Select at least one image.' }, { status: 400 })
  }

  const inventory = await prisma.inventoryManagement.findUnique({
    where: { inventoryId },
    select: { inventoryId: true, inventoryNumber: true },
  })
  if (!inventory) {
    return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })
  }

  await mkdir(path.join(UPLOAD_ROOT, String(inventoryId)), { recursive: true })

  const results: Array<{ name: string; success: boolean; error?: string; photo?: unknown }> = []

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      results.push({ name: file.name, success: false, error: 'Only JPG, PNG, and WEBP files are allowed.' })
      continue
    }
    if (file.size > MAX_FILE_SIZE) {
      results.push({ name: file.name, success: false, error: 'File exceeds 10 MB limit.' })
      continue
    }

    try {
      const ext = safeExt(file.name, file.type)
      const fileName = `${Date.now()}-${randomUUID()}${ext}`
      const relativePath = `${PUBLIC_PREFIX}/${inventoryId}/${fileName}`
      const absolutePath = path.join(UPLOAD_ROOT, String(inventoryId), fileName)
      const bytes = Buffer.from(await file.arrayBuffer())
      await writeFile(absolutePath, bytes)

      const photo = await prisma.inventoryPhotos.create({
        data: {
          fkInventoryId: inventoryId,
          inventoryNumberLegacy: inventory.inventoryNumber ?? inventoryNumber,
          path: relativePath,
        },
      })

      results.push({
        name: file.name,
        success: true,
        photo: {
          documentId: photo.documentId,
          path: photo.path,
          inventoryNumberLegacy: photo.inventoryNumberLegacy,
          isUploadedHere: true,
          fileName,
        },
      })
    } catch {
      results.push({ name: file.name, success: false, error: 'Upload failed.' })
    }
  }

  return NextResponse.json({
    success: results.some(result => result.success),
    results,
  })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const documentId = Number(body?.documentId)
  if (!documentId) return NextResponse.json({ error: 'Photo id is required.' }, { status: 400 })

  const photo = await prisma.inventoryPhotos.findUnique({ where: { documentId } })
  if (!photo) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 })

  if (photo.path?.startsWith(PUBLIC_PREFIX)) {
    const resolvedPath = path.resolve(path.join(process.cwd(), 'public', photo.path.replace(/^\//, '')))
    const resolvedRoot = path.resolve(UPLOAD_ROOT)
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return NextResponse.json({ error: 'Unsafe photo path.' }, { status: 400 })
    }
    try {
      await unlink(resolvedPath)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') {
        return NextResponse.json({ error: 'Could not delete the stored file.' }, { status: 500 })
      }
    }
  }

  await prisma.inventoryPhotos.delete({ where: { documentId } })
  return NextResponse.json({ success: true })
}
