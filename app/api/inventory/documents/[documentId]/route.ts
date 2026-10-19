import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { downloadFromFirebaseStorage } from '@/lib/firebase/storage'

function attachmentName(value: string) {
  return value.replace(/[\\/\r\n"]/g, '_').slice(0, 255) || 'inventory-document'
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const inventoryDocumentId = Number((await params).documentId)
  if (!Number.isInteger(inventoryDocumentId) || inventoryDocumentId <= 0) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  const document = await prisma.inventoryDocument.findUnique({ where: { inventoryDocumentId } })
  if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  try {
    const bytes = await downloadFromFirebaseStorage(document.storagePath)
    const disposition = req.nextUrl.searchParams.get('view') === '1' ? 'inline' : 'attachment'
    return new NextResponse(Uint8Array.from(bytes), { headers: { 'Content-Type': document.contentType, 'Content-Disposition': `${disposition}; filename="${attachmentName(document.originalName)}"`, 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'The stored document is unavailable.' }, { status: 404 })
  }
}
