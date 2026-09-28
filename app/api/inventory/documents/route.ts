import { randomUUID } from 'crypto'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { deleteFromFirebaseStorage, uploadToFirebaseStorage } from '@/lib/firebase/storage'

const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE = 15 * 1024 * 1024
const DOCUMENT_TYPES = new Set(['RC', 'Insurance', 'KYC', 'Other'])

function safeExt(fileName: string, mimeType: string) {
  const ext = path.extname(fileName).toLowerCase()
  if (['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext
  return mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg'
}

function isAllowedContent(bytes: Buffer, mimeType: string) {
  if (mimeType === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-'
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
}

export async function GET(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const inventoryId = Number(req.nextUrl.searchParams.get('inventoryId'))
  if (!Number.isInteger(inventoryId) || inventoryId <= 0) return NextResponse.json({ error: 'A valid inventory id is required.' }, { status: 400 })

  const rows = await prisma.inventoryDocument.findMany({ where: { inventoryId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(rows.map(row => ({
    ...row,
    downloadUrl: `/api/inventory/documents/${row.inventoryDocumentId}`,
  })))
}

export async function POST(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const formData = await req.formData()
  const inventoryId = Number(formData.get('inventoryId'))
  const documentType = String(formData.get('documentType') || 'Other')
  const files = formData.getAll('files').filter((value): value is File => value instanceof File)
  if (!Number.isInteger(inventoryId) || inventoryId <= 0) return NextResponse.json({ error: 'A valid inventory id is required.' }, { status: 400 })
  if (!DOCUMENT_TYPES.has(documentType)) return NextResponse.json({ error: 'Select a valid document type.' }, { status: 400 })
  if (!files.length) return NextResponse.json({ error: 'Select at least one document.' }, { status: 400 })

  const inventory = await prisma.inventoryManagement.findUnique({ where: { inventoryId }, select: { inventoryId: true } })
  if (!inventory) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })

  const results: Array<{ name: string; success: boolean; error?: string; document?: unknown }> = []
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      results.push({ name: file.name, success: false, error: 'Only PDF, JPG, PNG, and WEBP files are allowed.' })
      continue
    }
    if (!file.size || file.size > MAX_FILE_SIZE) {
      results.push({ name: file.name, success: false, error: 'Each document must be no larger than 15 MB.' })
      continue
    }
    try {
      const bytes = Buffer.from(await file.arrayBuffer())
      if (!isAllowedContent(bytes, file.type)) {
        results.push({ name: file.name, success: false, error: 'File content does not match its allowed type.' })
        continue
      }
      const originalName = path.basename(file.name).slice(0, 255) || `document${safeExt(file.name, file.type)}`
      const fileName = `${Date.now()}-${randomUUID()}${safeExt(file.name, file.type)}`
      const storagePath = await uploadToFirebaseStorage(`inventory/${inventoryId}/internal-documents/${fileName}`, bytes, file.type)
      const document = await prisma.inventoryDocument.create({ data: { inventoryId, documentType, originalName, storagePath, contentType: file.type, sizeBytes: file.size } })
      results.push({ name: file.name, success: true, document: { ...document, downloadUrl: `/api/inventory/documents/${document.inventoryDocumentId}` } })
    } catch {
      results.push({ name: file.name, success: false, error: 'Upload failed.' })
    }
  }
  return NextResponse.json({ success: results.some(result => result.success), results })
}

export async function DELETE(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const inventoryDocumentId = Number(body?.inventoryDocumentId)
  if (!Number.isInteger(inventoryDocumentId) || inventoryDocumentId <= 0) return NextResponse.json({ error: 'Document id is required.' }, { status: 400 })
  const document = await prisma.inventoryDocument.findUnique({ where: { inventoryDocumentId } })
  if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  try {
    await deleteFromFirebaseStorage(document.storagePath)
  } catch {
    return NextResponse.json({ error: 'Could not delete the stored document.' }, { status: 500 })
  }
  await prisma.inventoryDocument.delete({ where: { inventoryDocumentId } })
  return NextResponse.json({ success: true })
}
