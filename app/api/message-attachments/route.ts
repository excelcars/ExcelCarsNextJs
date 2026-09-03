import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { ALLOWED_MESSAGE_ATTACHMENT_TYPES, attachmentExtension, isSafeStoredAttachmentPath, MAX_MESSAGE_ATTACHMENT_SIZE, MESSAGE_ATTACHMENT_ROOT, MESSAGE_ATTACHMENT_SCOPES } from '@/features/messagetemplates/attachments'

export const runtime = 'nodejs'

async function currentUserId() { return getAuthorizedUserIdForRoute('/config/sms-email') }

export async function GET(req: NextRequest) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const templateId = Number(req.nextUrl.searchParams.get('templateId'))
  if (!templateId) return NextResponse.json({ error: 'Template is required.' }, { status: 400 })
  const rows = await prisma.messageAttachmentUpload.findMany({ where: { templateId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(rows.map(row => ({ uploadId: row.uploadId, originalName: row.originalName, byteSize: row.byteSize, scope: row.scope })))
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const formData = await req.formData()
  const templateId = Number(formData.get('templateId'))
  const scope = String(formData.get('scope'))
  const files = formData.getAll('files').filter((value): value is File => value instanceof File)
  if (!templateId || !MESSAGE_ATTACHMENT_SCOPES.includes(scope as typeof MESSAGE_ATTACHMENT_SCOPES[number])) return NextResponse.json({ error: 'Invalid attachment request.' }, { status: 400 })
  const template = await prisma.messageTemplate.findFirst({ where: { typeId: templateId, messageType: 'Email' }, select: { typeId: true } })
  if (!template || files.length === 0) return NextResponse.json({ error: template ? 'Choose at least one file.' : 'Email template not found.' }, { status: 400 })
  const directory = path.join(MESSAGE_ATTACHMENT_ROOT, String(templateId))
  await mkdir(directory, { recursive: true })
  const uploads: Array<{ uploadId: string; originalName: string; byteSize: number; scope: string }> = []
  for (const file of files) {
    const extension = attachmentExtension(file.name, file.type)
    if (!extension || !ALLOWED_MESSAGE_ATTACHMENT_TYPES.has(file.type) || file.size > MAX_MESSAGE_ATTACHMENT_SIZE) continue
    const storedPath = path.join(directory, `${randomUUID()}${extension}`)
    await writeFile(storedPath, Buffer.from(await file.arrayBuffer()))
    const row = await prisma.messageAttachmentUpload.create({ data: { templateId, storedPath, originalName: path.basename(file.name), mimeType: file.type, byteSize: file.size, scope, createdBy: userId } })
    uploads.push({ uploadId: row.uploadId, originalName: row.originalName, byteSize: row.byteSize, scope: row.scope })
  }
  if (!uploads.length) return NextResponse.json({ error: 'Only PDF, JPG, PNG, and DOCX files up to 10 MB are allowed.' }, { status: 400 })
  return NextResponse.json({ uploads })
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const uploadId = String((await req.json().catch(() => null))?.uploadId || '')
  const row = await prisma.messageAttachmentUpload.findUnique({ where: { uploadId } })
  if (!row) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 })
  if (isSafeStoredAttachmentPath(row.storedPath)) await unlink(row.storedPath).catch(() => undefined)
  await prisma.messageAttachmentUpload.delete({ where: { uploadId } })
  return NextResponse.json({ success: true })
}
