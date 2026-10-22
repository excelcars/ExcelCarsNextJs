// Read-only recovery inventory: no uploads, database updates or file changes.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

for (const rawLine of readFileSync('.env.production.local', 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim()
  const separator = line.indexOf('=')
  if (!line || line.startsWith('#') || separator < 1) continue
  process.env[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, '$2')
}

const legacyRoot = path.resolve('..', 'ExcelCars')
const roots = [legacyRoot, path.resolve('public'), path.resolve('backups')]
const files = []
const archives = []
const skipped = []
function walk(root) {
  let entries
  try { entries = readdirSync(root, { withFileTypes: true }) } catch { skipped.push(root); return }
  for (const entry of entries) {
    const file = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (!['.git', '.vs', 'node_modules', '.next'].includes(entry.name)) walk(file)
    } else if (entry.isFile()) {
      if (/\.(jpe?g|png|webp)$/i.test(entry.name)) files.push(file)
      if (/\.(zip|7z|rar|tar|gz|dump|bak)$/i.test(entry.name)) archives.push({ file, bytes: statSync(file).size })
    }
  }
}
roots.forEach(walk)
const byName = new Map()
for (const file of files) {
  const name = path.basename(file).toLowerCase()
  byName.set(name, [...(byName.get(name) || []), file])
}
const prisma = new PrismaClient()
try {
  const rows = await prisma.inventoryPhotos.findMany({ select: { documentId: true, fkInventoryId: true, path: true } })
  const legacy = rows.filter(row => row.path && !row.path.startsWith('firebase://') && !row.path.startsWith('/uploads/'))
  const nameFor = value => {
    const normalized = value.replace(/\\/g, '/').split('?')[0]
    let name = normalized.split('/').pop()
    try { name = decodeURIComponent(name) } catch { /* Preserve malformed legacy filename. */ }
    return name.toLowerCase()
  }
  const matched = legacy.filter(row => byName.has(nameFor(row.path)))
  const missing = [...new Set(legacy.filter(row => !byName.has(nameFor(row.path))).map(row => nameFor(row.path)))]
  console.log(JSON.stringify({
    searchedRoots: roots,
    localImageCopies: files.length,
    localUniqueImageNames: byName.size,
    inventoryPhotoRows: rows.length,
    legacyReferenceRows: legacy.length,
    uniqueLegacyFileNames: new Set(legacy.map(row => nameFor(row.path))).size,
    matchedDatabaseRows: matched.length,
    matchedUniqueFileNames: new Set(matched.map(row => nameFor(row.path))).size,
    matchedExamples: matched.slice(0, 20).map(row => ({ documentId: row.documentId, inventoryId: row.fkInventoryId, files: byName.get(nameFor(row.path)) })),
    unmatchedUniqueFileNames: missing.length,
    missingExamples: missing.slice(0, 10),
    archives,
    skipped,
  }, null, 2))
} finally { await prisma.$disconnect() }
