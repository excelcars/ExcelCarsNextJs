import { createHash, randomBytes } from 'crypto'

const BOT_USER_AGENT_PATTERNS = [
  /googleimageproxy/i,
  /google-inspectiontool/i,
  /googleother/i,
  /bingpreview/i,
  /outlook/i,
  /microsoft office/i,
  /microsoft.*preview/i,
  /safelinks/i,
  /proofpoint/i,
  /barracuda/i,
  /mimecast/i,
  /symantec/i,
  /trend micro/i,
  /urlscan/i,
  /virus/i,
  /crawler/i,
  /spider/i,
  /bot/i,
  /slurp/i,
  /headless/i,
]

export type VehicleEmailVisitKind = 'human' | 'bot' | 'unknown'

export interface VehiclePublicDetails {
  make: string
  model: string
  variant: string
  year: number | null
}

export function generateVehicleEmailToken() {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashVehicleEmailToken(rawToken)
  return { rawToken, tokenHash }
}

export function hashVehicleEmailToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function buildVehicleSlug(details: VehiclePublicDetails) {
  const base = [
    details.make,
    details.model,
    details.variant,
    details.year ? String(details.year) : '',
  ]
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return base || 'vehicle-details'
}

export function getVehiclePublicBaseUrl() {
  return (
    process.env.PUBLIC_APP_URL
    || process.env.APP_URL
    || process.env.NEXTAUTH_URL
    || 'http://localhost:3000'
  ).replace(/\/+$/, '')
}

export function buildTrackedVehicleUrl(slug: string, rawToken: string) {
  const url = new URL(`${getVehiclePublicBaseUrl()}/vehicle/${slug}`)
  url.searchParams.set('t', rawToken)
  return url.toString()
}

export function buildLegacyInventoryPhotoUrl(photoPath: string) {
  const url = new URL(`${getVehiclePublicBaseUrl()}/api/public/legacy-inventory-photo`)
  url.searchParams.set('path', photoPath)
  return `${url.pathname}${url.search}`
}

export function getInventoryPhotoPublicUrl(photoPath: string | null | undefined) {
  const trimmedPath = photoPath?.trim()
  if (!trimmedPath) return null
  if (trimmedPath.startsWith('/uploads/')) return trimmedPath
  if (trimmedPath.startsWith('firebase://')) {
    const objectKey = trimmedPath.slice('firebase://'.length)
    const bucket = process.env.FIREBASE_STORAGE_BUCKET
    if (!objectKey || !bucket) return null
    return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectKey)}?alt=media`
  }
  if (/fileupload\/inventory_car_photo/i.test(trimmedPath.replace(/\\/g, '/'))) {
    return buildLegacyInventoryPhotoUrl(trimmedPath)
  }
  return null
}

export function maskRegistrationNumber(registrationNo: string | null | undefined) {
  const clean = registrationNo?.trim().replace(/\s+/g, ' ') ?? ''
  if (!clean) return '—'
  const compact = clean.replace(/\s+/g, '')
  if (compact.length <= 4) return `${compact.slice(0, 2)}****`
  return `${compact.slice(0, Math.min(6, compact.length - 4))}****`
}

export function classifyVehicleEmailVisit(userAgent: string | null | undefined): VehicleEmailVisitKind {
  if (!userAgent?.trim()) return 'unknown'
  const normalized = userAgent.trim()
  if (BOT_USER_AGENT_PATTERNS.some(pattern => pattern.test(normalized))) return 'bot'
  return 'human'
}

export function getPublicVehiclePhoneNumber() {
  return process.env.PUBLIC_EXCEL_CARS_PHONE || '+91 98208 88808'
}

export function getPublicVehicleWhatsAppNumber() {
  return process.env.PUBLIC_EXCEL_CARS_WHATSAPP || '919820888808'
}

export function getPublicVehicleContactEmail() {
  return process.env.PUBLIC_EXCEL_CARS_EMAIL || process.env.EMAIL_FROM_ADDRESS || 'info@excelcars.com'
}
