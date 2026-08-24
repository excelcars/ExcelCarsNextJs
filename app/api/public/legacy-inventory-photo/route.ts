import { access, readFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

const LEGACY_PHOTO_SUBDIR = path.join('Fileupload', 'Inventory_Car_Photo')
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function getLegacyPhotoRoots() {
  const configuredRoots = (process.env.LEGACY_INVENTORY_PHOTO_ROOTS || process.env.LEGACY_INVENTORY_PHOTO_ROOT || '')
    .split(';')
    .map(value => value.trim())
    .filter(Boolean)

  const workspaceRoot = process.cwd()
  const workspaceParent = path.dirname(workspaceRoot)

  return Array.from(
    new Set([
      ...configuredRoots,
      path.join(workspaceRoot, 'Fileupload', 'Inventory_Car_Photo'),
      path.join(workspaceParent, 'Fileupload', 'Inventory_Car_Photo'),
      path.join(workspaceParent, 'ExcelCars', 'Fileupload', 'Inventory_Car_Photo'),
    ]),
  )
}

function extractLegacyFileName(rawPath: string) {
  const normalized = rawPath.replace(/\\/g, '/').trim()
  const marker = '/fileupload/inventory_car_photo/'
  const lower = normalized.toLowerCase()
  const markerIndex = lower.lastIndexOf(marker)
  const trailingPath = markerIndex >= 0
    ? normalized.slice(markerIndex + marker.length)
    : normalized.split('/').pop() || ''

  const fileName = path.basename(trailingPath)
  if (!fileName || fileName === '.' || fileName === '..') return null
  return fileName
}

async function resolveLegacyPhotoPath(fileName: string) {
  for (const root of getLegacyPhotoRoots()) {
    const candidate = path.resolve(root, fileName)
    const expectedParent = path.resolve(root)
    if (!candidate.startsWith(expectedParent)) continue

    try {
      await access(candidate)
      return candidate
    } catch {
      continue
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.searchParams.get('path')?.trim()
  if (!rawPath) {
    return NextResponse.json({ error: 'Photo path is required.' }, { status: 400 })
  }

  const fileName = extractLegacyFileName(rawPath)
  if (!fileName) {
    return NextResponse.json({ error: 'Invalid legacy photo path.' }, { status: 400 })
  }

  const absolutePath = await resolveLegacyPhotoPath(fileName)
  if (!absolutePath) {
    return NextResponse.json({
      error: 'Legacy photo file not found.',
      searchedRoots: getLegacyPhotoRoots(),
      expectedSubdirectory: LEGACY_PHOTO_SUBDIR,
      fileName,
    }, { status: 404 })
  }

  const ext = path.extname(absolutePath).toLowerCase()
  const contentType = IMAGE_CONTENT_TYPES[ext] || 'application/octet-stream'
  const file = await readFile(absolutePath)

  return new NextResponse(file, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
