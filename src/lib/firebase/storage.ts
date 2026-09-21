import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import fs from 'node:fs'

const FIREBASE_PATH_PREFIX = 'firebase://'
const corsConfiguredOrigins = new Set<string>()

function serviceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (rawJson) return JSON.parse(rawJson)

  const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (credentialPath) return JSON.parse(fs.readFileSync(credentialPath, 'utf8'))

  throw new Error('Firebase Storage is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON.')
}

function bucketName() {
  const name = process.env.FIREBASE_STORAGE_BUCKET
  if (!name) throw new Error('Firebase Storage is not configured. Set FIREBASE_STORAGE_BUCKET.')
  return name
}

function bucket() {
  const storageBucket = bucketName()
  const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount()), storageBucket })
  return getStorage(app).bucket(storageBucket)
}

export function firebaseStoragePath(objectKey: string) {
  return `${FIREBASE_PATH_PREFIX}${objectKey.replace(/^\/+/, '')}`
}

export function firebaseObjectKey(storedPath: string | null | undefined) {
  return storedPath?.startsWith(FIREBASE_PATH_PREFIX) ? storedPath.slice(FIREBASE_PATH_PREFIX.length) : null
}

export function isFirebaseStoragePath(storedPath: string | null | undefined) {
  return Boolean(firebaseObjectKey(storedPath))
}

export function firebasePublicUrl(objectKey: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName())}/o/${encodeURIComponent(objectKey)}?alt=media`
}

export async function uploadToFirebaseStorage(objectKey: string, bytes: Buffer, contentType: string) {
  await bucket().file(objectKey).save(bytes, {
    resumable: false,
    metadata: { contentType, cacheControl: 'public,max-age=31536000,immutable' },
  })
  return firebaseStoragePath(objectKey)
}

function browserUploadOrigins() {
  return [...new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.APP_URL,
    process.env.NEXTAUTH_URL,
  ].filter((value): value is string => Boolean(value?.startsWith('http'))).map(value => value.replace(/\/$/, '')))]
}

async function ensureBrowserUploadCors() {
  const origins = browserUploadOrigins().filter(origin => !corsConfiguredOrigins.has(origin))
  if (origins.length === 0) return

  const storageBucket = bucket()
  const [metadata] = await storageBucket.getMetadata()
  const currentRules = Array.isArray(metadata.cors) ? metadata.cors : []
  const missingOrigins = origins.filter(origin => !currentRules.some(rule => rule.origin?.includes(origin) && rule.method?.includes('PUT')))
  if (missingOrigins.length > 0) {
    await storageBucket.setCorsConfiguration([
      ...currentRules,
      {
        origin: missingOrigins,
        method: ['GET', 'HEAD', 'PUT'],
        responseHeader: ['Content-Type'],
        maxAgeSeconds: 3600,
      },
    ])
  }
  origins.forEach(origin => corsConfiguredOrigins.add(origin))
}

export async function createFirebaseUploadUrl(objectKey: string, contentType: string) {
  await ensureBrowserUploadCors()
  const [uploadUrl] = await bucket().file(objectKey).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  })
  return uploadUrl
}

export async function getFirebaseStorageMetadata(storedPath: string) {
  const objectKey = firebaseObjectKey(storedPath)
  if (!objectKey) throw new Error('Invalid Firebase Storage path.')
  const [metadata] = await bucket().file(objectKey).getMetadata()
  return metadata
}

export async function deleteFromFirebaseStorage(storedPath: string | null | undefined) {
  const objectKey = firebaseObjectKey(storedPath)
  if (!objectKey) return
  await bucket().file(objectKey).delete({ ignoreNotFound: true })
}

export async function downloadFromFirebaseStorage(storedPath: string) {
  const objectKey = firebaseObjectKey(storedPath)
  if (!objectKey) throw new Error('Invalid Firebase Storage path.')
  const [bytes] = await bucket().file(objectKey).download()
  return bytes
}
