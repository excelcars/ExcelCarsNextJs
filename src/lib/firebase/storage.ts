import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import fs from 'node:fs'

const FIREBASE_PATH_PREFIX = 'firebase://'

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
