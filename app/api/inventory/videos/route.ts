import { randomUUID } from 'crypto'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { deleteFromFirebaseStorage, firebasePublicUrl, isFirebaseStoragePath, uploadToFirebaseStorage } from '@/lib/firebase/storage'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024

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

function isMp4(file: File, bytes: Buffer) {
  return (file.type === 'video/mp4' || path.extname(file.name).toLowerCase() === '.mp4')
    && bytes.length >= 12
    && bytes.subarray(4, 8).toString('ascii') === 'ftyp'
}

async function setFeatured(inventoryId: number, inventoryVideoId: number) {
  await prisma.$transaction([
    prisma.inventoryVideo.updateMany({ where: { fkInventoryId: inventoryId }, data: { isFeatured: false } }),
    prisma.inventoryVideo.update({ where: { inventoryVideoId, fkInventoryId: inventoryId }, data: { isFeatured: true } }),
  ])
}

export async function GET(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const inventoryId = Number(req.nextUrl.searchParams.get('inventoryId'))
  if (!inventoryId) return NextResponse.json({ error: 'Inventory id is required.' }, { status: 400 })
  const videos = await prisma.inventoryVideo.findMany({ where: { fkInventoryId: inventoryId }, orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { inventoryVideoId: 'desc' }] })
  return NextResponse.json(videos.map(toResponse))
}

export async function POST(req: NextRequest) {
  if (!(await getAuthorizedUserIdForRoute('/inventory'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => null)
    const inventoryId = Number(body?.inventoryId)
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
  if (!inventoryId || files.length === 0) return NextResponse.json({ error: 'Select at least one MP4 video.' }, { status: 400 })
  const exists = await prisma.inventoryManagement.findUnique({ where: { inventoryId }, select: { inventoryId: true } })
  if (!exists) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })

  let nextOrder = await prisma.inventoryVideo.count({ where: { fkInventoryId: inventoryId } })
  const results: Array<{ name: string; success: boolean; error?: string; video?: unknown }> = []
  for (const file of files) {
    if (file.size > MAX_VIDEO_SIZE) { results.push({ name: file.name, success: false, error: 'File exceeds the 100 MB limit.' }); continue }
    const bytes = Buffer.from(await file.arrayBuffer())
    if (!isMp4(file, bytes)) { results.push({ name: file.name, success: false, error: 'Only valid MP4 videos are allowed.' }); continue }
    try {
      const fileName = `${Date.now()}-${randomUUID()}.mp4`
      const storagePath = await uploadToFirebaseStorage(`inventory/${inventoryId}/videos/${fileName}`, bytes, 'video/mp4')
      const video = await prisma.inventoryVideo.create({ data: { fkInventoryId: inventoryId, sourceType: 'UPLOAD', storagePath, fileName: file.name, isFeatured: nextOrder === 0, sortOrder: nextOrder++ } })
      results.push({ name: file.name, success: true, video: toResponse(video) })
    } catch {
      results.push({ name: file.name, success: false, error: 'Upload failed.' })
    }
  }
  return NextResponse.json({ success: results.some(result => result.success), results })
}

export async function PATCH(req: NextRequest) {
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

export async function DELETE(req: NextRequest) {
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
