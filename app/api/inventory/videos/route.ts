import { randomUUID } from 'crypto'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createFirebaseUploadUrl, deleteFromFirebaseStorage, firebasePublicUrl, firebaseStoragePath, getFirebaseStorageMetadata, isFirebaseStoragePath, uploadToFirebaseStorage } from '@/lib/firebase/storage'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024
type UploadFile = { name?: unknown; size?: unknown; type?: unknown; storagePath?: unknown }
type SupportedVideo = { extension: '.mp4' | '.mov'; contentType: 'video/mp4' | 'video/quicktime' }

function supportedVideo(name: unknown, type: unknown): SupportedVideo | null {
  if (typeof name !== 'string') return null
  const extension = path.extname(name).toLowerCase()
  if (extension !== '.mp4' && extension !== '.mov') return null
  const fallbackContentType = extension === '.mov' ? 'video/quicktime' : 'video/mp4'
  if (typeof type === 'string' && type && type !== fallbackContentType) return null
  return { extension, contentType: fallbackContentType }
}

function publicPath(storagePath: string | null) {
  if (!storagePath) return null
  return isFirebaseStoragePath(storagePath) ? firebasePublicUrl(storagePath.slice('firebase://'.length)) : storagePath
}

function toResponse(video: { inventoryVideoId: number; sourceType: string; youtubeUrl: string | null; youtubeVideoId: string | null; storagePath: string | null; fileName: string | null; isFeatured: boolean; sortOrder: number }) {
  return { ...video, url: video.sourceType === 'YOUTUBE' ? video.youtubeUrl : publicPath(video.storagePath) }
}

function youtubeDetails(value: string) {
  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    let videoId = ''
    if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] ?? ''
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      videoId = url.searchParams.get('v') ?? ''
      if (!videoId) {
        const segments = url.pathname.split('/').filter(Boolean)
        if (['shorts', 'embed', 'live'].includes(segments[0] ?? '')) videoId = segments[1] ?? ''
      }
    }
    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? { url: `https://www.youtube.com/watch?v=${videoId}`, videoId } : null
  } catch {
    return null
  }
}

function isSupportedVideo(file: File, bytes: Buffer) {
  return !!supportedVideo(file.name, file.type)
    && bytes.length >= 12
    && bytes.subarray(4, 8).toString('ascii') === 'ftyp'
}

async function setFeatured(inventoryId: number, inventoryVideoId: number) {
  await prisma.$transaction([
    prisma.inventoryVideo.updateMany({ where: { fkInventoryId: inventoryId }, data: { isFeatured: false } }),
    prisma.inventoryVideo.update({ where: { inventoryVideoId, fkInventoryId: inventoryId }, data: { isFeatured: true } }),
  ])
}

function errorResponse(operation: string, error: unknown) {
  console.error(`Inventory video ${operation} failed:`, error)
  const message = error instanceof Error ? error.message : 'Unexpected server error.'
  return NextResponse.json({ error: `Could not ${operation}: ${message}` }, { status: 500 })
}

async function getVideos(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const inventoryId = Number(req.nextUrl.searchParams.get('inventoryId'))
  if (!inventoryId) return NextResponse.json({ error: 'Inventory id is required.' }, { status: 400 })
  const videos = await prisma.inventoryVideo.findMany({ where: { fkInventoryId: inventoryId }, orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { inventoryVideoId: 'desc' }] })
  return NextResponse.json(videos.map(toResponse))
}

async function createVideo(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => null)
    const inventoryId = Number(body?.inventoryId)
    if (body?.action === 'prepareUpload') return prepareUploads(inventoryId, body?.files)
    if (body?.action === 'completeUpload') return completeUploads(inventoryId, body?.files)
    const details = typeof body?.youtubeUrl === 'string' ? youtubeDetails(body.youtubeUrl) : null
    if (!inventoryId || !details) return NextResponse.json({ error: 'Enter a valid YouTube video link.' }, { status: 400 })
    const exists = await prisma.inventoryManagement.findUnique({ where: { inventoryId }, select: { inventoryId: true } })
    if (!exists) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })
    const count = await prisma.inventoryVideo.count({ where: { fkInventoryId: inventoryId } })
    const video = await prisma.inventoryVideo.create({ data: { fkInventoryId: inventoryId, sourceType: 'YOUTUBE', youtubeUrl: details.url, youtubeVideoId: details.videoId, isFeatured: count === 0, sortOrder: count } })
    return NextResponse.json({ video: toResponse(video) })
  }

  const formData = await req.formData()
  const inventoryId = Number(formData.get('inventoryId'))
  const files = formData.getAll('files').filter((value): value is File => value instanceof File)
  if (!inventoryId || files.length === 0) return NextResponse.json({ error: 'Select at least one MP4 or MOV video.' }, { status: 400 })
  const exists = await prisma.inventoryManagement.findUnique({ where: { inventoryId }, select: { inventoryId: true } })
  if (!exists) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })

  let nextOrder = await prisma.inventoryVideo.count({ where: { fkInventoryId: inventoryId } })
  const results: Array<{ name: string; success: boolean; error?: string; video?: unknown }> = []
  for (const file of files) {
    if (file.size > MAX_VIDEO_SIZE) { results.push({ name: file.name, success: false, error: 'File exceeds the 100 MB limit.' }); continue }
    const bytes = Buffer.from(await file.arrayBuffer())
    const videoDetails = supportedVideo(file.name, file.type)
    if (!isSupportedVideo(file, bytes) || !videoDetails) { results.push({ name: file.name, success: false, error: 'Only valid MP4 or MOV videos are allowed.' }); continue }
    try {
      const fileName = `${Date.now()}-${randomUUID()}${videoDetails.extension}`
      const storagePath = await uploadToFirebaseStorage(`inventory/${inventoryId}/videos/${fileName}`, bytes, videoDetails.contentType)
      const video = await prisma.inventoryVideo.create({ data: { fkInventoryId: inventoryId, sourceType: 'UPLOAD', storagePath, fileName: file.name, isFeatured: nextOrder === 0, sortOrder: nextOrder++ } })
      results.push({ name: file.name, success: true, video: toResponse(video) })
    } catch (error) {
      results.push({ name: file.name, success: false, error: error instanceof Error ? error.message : 'Upload failed.' })
    }
  }
  return NextResponse.json({ success: results.some(result => result.success), results })
}

function validUploadFile(file: UploadFile) {
  return !!supportedVideo(file.name, file.type)
    && typeof file.size === 'number' && file.size > 11 && file.size <= MAX_VIDEO_SIZE
}

async function requireVehicle(inventoryId: number) {
  if (!inventoryId) return null
  return prisma.inventoryManagement.findUnique({ where: { inventoryId }, select: { inventoryId: true } })
}

async function prepareUploads(inventoryId: number, rawFiles: unknown) {
  const files = Array.isArray(rawFiles) ? rawFiles as UploadFile[] : []
  if (!await requireVehicle(inventoryId)) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })
  if (files.length === 0 || files.length > 10 || files.some(file => !validUploadFile(file))) {
    return NextResponse.json({ error: 'Select up to 10 MP4 or MOV videos, each no larger than 100 MB.' }, { status: 400 })
  }
  const uploads = await Promise.all(files.map(async file => {
    const videoDetails = supportedVideo(file.name, file.type)!
    const objectKey = `inventory/${inventoryId}/videos/${randomUUID()}${videoDetails.extension}`
    return { name: file.name as string, storagePath: firebaseStoragePath(objectKey), contentType: videoDetails.contentType, uploadUrl: await createFirebaseUploadUrl(objectKey, videoDetails.contentType) }
  }))
  return NextResponse.json({ uploads })
}

async function completeUploads(inventoryId: number, rawFiles: unknown) {
  const files = Array.isArray(rawFiles) ? rawFiles as UploadFile[] : []
  if (!await requireVehicle(inventoryId)) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })
  if (files.length === 0 || files.length > 10 || files.some(file => !validUploadFile(file) || typeof file.storagePath !== 'string' || !file.storagePath.startsWith(`firebase://inventory/${inventoryId}/videos/`))) {
    return NextResponse.json({ error: 'Invalid uploaded video details.' }, { status: 400 })
  }
  const results: Array<{ name: string; success: boolean; error?: string; video?: unknown }> = []
  let nextOrder = await prisma.inventoryVideo.count({ where: { fkInventoryId: inventoryId } })
  for (const file of files) {
    try {
      const metadata = await getFirebaseStorageMetadata(file.storagePath as string)
      const videoDetails = supportedVideo(file.name, file.type)
      if (!videoDetails || metadata.contentType !== videoDetails.contentType || Number(metadata.size) !== file.size) throw new Error('Uploaded file could not be verified.')
      const video = await prisma.inventoryVideo.create({ data: { fkInventoryId: inventoryId, sourceType: 'UPLOAD', storagePath: file.storagePath as string, fileName: file.name as string, isFeatured: nextOrder === 0, sortOrder: nextOrder++ } })
      results.push({ name: file.name as string, success: true, video: toResponse(video) })
    } catch (error) {
      results.push({ name: file.name as string, success: false, error: error instanceof Error ? error.message : 'Upload failed.' })
    }
  }
  return NextResponse.json({ success: results.some(result => result.success), results })
}

async function updateVideo(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const inventoryId = Number(body?.inventoryId)
  const inventoryVideoId = Number(body?.inventoryVideoId)
  if (!inventoryId || !inventoryVideoId || body?.action !== 'feature') return NextResponse.json({ error: 'Invalid video update.' }, { status: 400 })
  const video = await prisma.inventoryVideo.findFirst({ where: { inventoryVideoId, fkInventoryId: inventoryId } })
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })
  await setFeatured(inventoryId, inventoryVideoId)
  return NextResponse.json({ success: true })
}

async function deleteVideo(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const inventoryId = Number(body?.inventoryId)
  const inventoryVideoId = Number(body?.inventoryVideoId)
  if (!inventoryId || !inventoryVideoId) return NextResponse.json({ error: 'Video id is required.' }, { status: 400 })
  const video = await prisma.inventoryVideo.findFirst({ where: { inventoryVideoId, fkInventoryId: inventoryId } })
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })
  if (isFirebaseStoragePath(video.storagePath)) await deleteFromFirebaseStorage(video.storagePath)
  await prisma.inventoryVideo.delete({ where: { inventoryVideoId } })
  if (video.isFeatured) {
    const next = await prisma.inventoryVideo.findFirst({ where: { fkInventoryId: inventoryId }, orderBy: [{ sortOrder: 'asc' }, { inventoryVideoId: 'asc' }] })
    if (next) await setFeatured(inventoryId, next.inventoryVideoId)
  }
  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  try { return await getVideos(req) } catch (error) { return errorResponse('load inventory videos', error) }
}

export async function POST(req: NextRequest) {
  try { return await createVideo(req) } catch (error) { return errorResponse('save inventory video', error) }
}

export async function PATCH(req: NextRequest) {
  try { return await updateVideo(req) } catch (error) { return errorResponse('update inventory video', error) }
}

export async function DELETE(req: NextRequest) {
  try { return await deleteVideo(req) } catch (error) { return errorResponse('delete inventory video', error) }
}
