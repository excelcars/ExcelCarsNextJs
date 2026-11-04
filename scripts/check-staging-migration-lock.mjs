import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { PrismaClient } from '@prisma/client'
import { stagingMigrationEnvironment } from './staging-database.mjs'

const env = stagingMigrationEnvironment(parseEnv(readFileSync('.env.staging.local', 'utf8')))
const url = new URL(env.DATABASE_URL)
const db = new PrismaClient({ datasourceUrl: url.toString() })
try {
  console.log(`Inspecting staging migration locks on ${url.hostname}`)
  const locks = await db.$queryRaw`
    SELECT l.pid, l.granted, a.state, a.application_name,
      EXTRACT(EPOCH FROM (now() - a.query_start))::float8 AS query_age_seconds,
      EXTRACT(EPOCH FROM (now() - a.xact_start))::float8 AS transaction_age_seconds,
      a.wait_event_type, a.wait_event, pg_blocking_pids(l.pid) AS blocking_pids,
      CASE WHEN a.query ILIKE '%pg_advisory_lock%' THEN 'migration advisory lock'
        WHEN a.query ILIKE 'CREATE %' THEN 'create schema object'
        WHEN a.query ILIKE 'ALTER %' THEN 'alter schema object'
        ELSE 'other' END AS operation
    FROM pg_locks l LEFT JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE l.locktype = 'advisory' AND l.classid = 0 AND l.objid = 72707369 AND l.objsubid = 1
      AND l.database = (SELECT oid FROM pg_database WHERE datname = current_database())
    ORDER BY l.granted DESC, l.pid
  `
  const migrations = await db.$queryRaw`
    SELECT migration_name, started_at, finished_at, rolled_back_at
    FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5
  `
  console.log(JSON.stringify({ locks, migrations }, null, 2))
  if (process.argv.includes('--release-idle-lock')) {
    const unfinished = await db.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL`
    if (unfinished.length) throw new Error('Refusing to release a lock while migrations are unfinished.')
    const released = await db.$queryRaw`
      SELECT a.pid, pg_terminate_backend(a.pid) AS released
      FROM pg_stat_activity a WHERE a.pid <> pg_backend_pid()
        AND a.datname = current_database() AND a.state = 'idle' AND a.xact_start IS NULL
        AND a.application_name = 'pgbouncer'
        AND EXISTS (SELECT 1 FROM pg_locks l WHERE l.pid = a.pid AND l.locktype = 'advisory'
          AND l.classid = 0 AND l.objid = 72707369 AND l.objsubid = 1 AND l.granted
          AND l.database = (SELECT oid FROM pg_database WHERE datname = current_database()))
    `
    console.log(JSON.stringify({ releasedIdleMigrationSessions: released }, null, 2))
  }
} catch (error) {
  console.error('Unable to inspect staging migration locks:', error.code || error.name)
  process.exitCode = 1
} finally { await db.$disconnect() }
