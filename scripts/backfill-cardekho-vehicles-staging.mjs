import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { dirname } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { matchPartnerVehicle, partnerVehicleKey, partnerVehicleSelection } from '../src/features/inquiry/partnerVehicleCatalog.ts'

const staging = parseEnv(readFileSync('.env.staging.local', 'utf8'))
const production = parseEnv(readFileSync('.env.production.local', 'utf8'))
const identity = value => { const url = new URL(value); return url.hostname.replace('-pooler.', '.') + url.pathname }
if (identity(staging.DATABASE_URL) === identity(production.DATABASE_URL)) throw new Error('Staging and production targets match. Stopped.')
const apply = process.argv.includes('--apply')
const backup = process.argv.find(arg => arg.startsWith('--backup='))?.slice(9)
if (apply && !backup) throw new Error('Specify --backup=<new-file.json> to apply.')
const db = new PrismaClient({ datasourceUrl: staging.DATABASE_URL })
try {
  const leads = await db.partnerWebhookLead.findMany({ where: { partner: 'CARDEKHO', inquiryId: { not: null } }, select: { inquiryId: true } })
  const rows = await db.inquiryCarDetails.findMany({ where: {
    fkInquiryId: { in: leads.map(lead => lead.inquiryId) }, fkVariantId: null,
    makeLegacy: null, modelLegacy: null, variantLegacy: null, subVariant: { not: null },
  }, select: { inquiryCarDetailsId: true, fkInquiryId: true, subVariant: true, fkVariantId: true, makeLegacy: true, modelLegacy: true, variantLegacy: true, updatedDt: true } })
  const catalog = await db.carVariantMaster.findMany({ include: { carMakeMaster: true, carModelMaster: true } })
  const mappings = await db.partnerVehicleMapping.findMany({ where: { partner: 'CARDEKHO' }, include: { variant: { include: { carMakeMaster: true, carModelMaster: true } } } })
  const byKey = new Map(mappings.map(mapping => [mapping.descriptionKey, partnerVehicleSelection(mapping.variant)]))
  const plan = rows.map(before => ({ before, match: byKey.get(partnerVehicleKey(before.subVariant)) ?? matchPartnerVehicle(before.subVariant, catalog) }))
  const matched = plan.filter(row => row.match)
  console.log(JSON.stringify({ environment: 'staging', mode: apply ? 'apply' : 'dry-run', eligible: rows.length, matched: matched.length, unresolved: plan.filter(row => !row.match).map(row => ({ inquiryId: row.before.fkInquiryId, vehicle: row.before.subVariant })) }, null, 2))
  if (apply) {
    mkdirSync(dirname(backup), { recursive: true })
    writeFileSync(backup, JSON.stringify({ createdAt: new Date().toISOString(), changes: matched }, null, 2), { flag: 'wx' })
    await db.$transaction(async tx => {
      for (const { before, match } of matched) {
        const result = await tx.inquiryCarDetails.updateMany({ where: before, data: match })
        if (result.count !== 1) throw new Error(`Vehicle row ${before.inquiryCarDetailsId} changed during repair. Rolled back.`)
      }
    }, { timeout: 30_000 })
    console.log(`Repaired ${matched.length} staging vehicle rows; original text preserved.`)
  }
} catch (error) {
  console.error(error.code ? `Database operation failed (${error.code}).` : error.message)
  process.exitCode = 1
} finally { await db.$disconnect() }
