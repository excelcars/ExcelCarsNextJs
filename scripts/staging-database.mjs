export function stagingMigrationEnvironment(staging) {
  const value = staging.DATABASE_URL_UNPOOLED || staging.DIRECT_URL || staging.DIRECT_DATABASE_URL || staging.DATABASE_URL
  if (!value) throw new Error('DATABASE_URL is missing in .env.staging.local')
  const url = new URL(value)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Staging DATABASE_URL must be a PostgreSQL URL.')
  if (['localhost', '127.0.0.1', '[::1]', 'db'].includes(url.hostname)) throw new Error('Staging DATABASE_URL points to a local database. Set the hosted staging connection URL in .env.staging.local.')
  // Neon uses the same endpoint/credentials for its direct host without the -pooler suffix.
  if (url.hostname.endsWith('.neon.tech')) url.hostname = url.hostname.replace('-pooler.', '.')
  url.searchParams.delete('pgbouncer')
  return { ...staging, DATABASE_URL: url.toString() }
}
