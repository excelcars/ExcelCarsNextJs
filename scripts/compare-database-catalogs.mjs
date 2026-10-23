import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

// Reads PostgreSQL catalogs only. Application records and credentials are never printed.
function databaseUrl(file) {
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find(value => /^DATABASE_URL=/.test(value))
  if (!line) throw new Error(`DATABASE_URL missing in ${file}`)
  return line.slice('DATABASE_URL='.length).trim().replace(/^(["'])(.*)\1$/, '$2')
}

const queries = {
  tables: `SELECT c.relname AS name, c.relkind::text AS kind,
    c.relrowsecurity AS row_security, c.relforcerowsecurity AS force_row_security,
    c.reltuples::bigint::text AS estimated_rows,
    pg_total_relation_size(c.oid)::text AS total_bytes
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f') ORDER BY c.relname`,
  columns: `SELECT table_name, column_name, ordinal_position, data_type, udt_name,
    is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale,
    datetime_precision, is_identity, identity_generation, is_generated, generation_expression,
    collation_name FROM information_schema.columns WHERE table_schema='public'
    ORDER BY table_name, ordinal_position`,
  indexes: `SELECT t.relname AS table_name, ci.relname AS name, am.amname AS method,
    i.indisunique AS unique_index, i.indisprimary AS primary_index,
    i.indisvalid AS valid, i.indisready AS ready,
    pg_get_indexdef(i.indexrelid) AS definition,
    pg_get_expr(i.indpred,i.indrelid) AS predicate
    FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_class ci ON ci.oid=i.indexrelid
    JOIN pg_am am ON am.oid=ci.relam WHERE n.nspname='public'
    ORDER BY t.relname,ci.relname`,
  constraints: `SELECT c.relname AS table_name, x.conname AS name, x.contype::text AS type,
    x.convalidated AS validated, x.condeferrable AS deferrable, x.condeferred AS initially_deferred,
    pg_get_constraintdef(x.oid) AS definition FROM pg_constraint x
    JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' ORDER BY c.relname,x.conname`,
  sequences: `SELECT sequencename AS name, data_type::text, start_value::text, min_value::text,
    max_value::text, increment_by::text, cycle, cache_size::text
    FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename`,
  enums: `SELECT t.typname AS name, e.enumlabel AS label, e.enumsortorder
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`,
  views: `SELECT viewname AS name, definition FROM pg_views WHERE schemaname='public' ORDER BY viewname`,
  triggers: `SELECT c.relname AS table_name,t.tgname AS name,t.tgenabled::text AS enabled,
    pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal
    ORDER BY c.relname,t.tgname`,
  routines: `SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS arguments,
    p.prokind::text AS kind, p.prosecdef AS security_definer,
    md5(pg_get_functiondef(p.oid)) AS definition_hash
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind IN ('f','p') ORDER BY p.proname,arguments`,
  policies: `SELECT tablename AS table_name,policyname AS name,permissive,roles::text,cmd,qual,with_check
    FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname`,
  extensions: `SELECT e.extname AS name,e.extversion AS version,n.nspname AS schema
    FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY e.extname`,
  migrations: `SELECT migration_name AS name,checksum,finished_at IS NOT NULL AS finished,
    rolled_back_at IS NOT NULL AS rolled_back,applied_steps_count
    FROM public._prisma_migrations ORDER BY migration_name`,
  settings: `SELECT name,setting,unit FROM pg_settings
    WHERE name IN ('server_version','TimeZone','max_connections','shared_buffers','work_mem',
      'statement_timeout','lock_timeout','idle_in_transaction_session_timeout','default_transaction_isolation')
    ORDER BY name`,
}

async function snapshot(environment, file) {
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl(file) } } })
  try {
    const catalog = await client.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      const result = {}
      for (const [section, sql] of Object.entries(queries)) result[section] = await tx.$queryRawUnsafe(sql)
      return result
    }, { isolationLevel: 'RepeatableRead', maxWait: 15000, timeout: 90000 })
    return { environment, capturedAt: new Date().toISOString(), ...catalog }
  } finally {
    await client.$disconnect()
  }
}

const [staging, production] = await Promise.all([
  snapshot('staging', '.env.staging.local'),
  snapshot('production', '.env.production.local'),
])
// Compact transport avoids repeating hundreds of column property names.
const fields = Object.fromEntries(Object.keys(queries).map(section => [
  section, Object.keys(staging[section][0] ?? production[section][0] ?? {}),
]))
function compact(snapshot) {
  return Object.fromEntries(Object.entries(snapshot).map(([section, value]) => [section,
    Array.isArray(value) ? value.map(row => fields[section].map(field => row[field])) : value,
  ]))
}
console.log(JSON.stringify({ fields, staging: compact(staging), production: compact(production) }))
