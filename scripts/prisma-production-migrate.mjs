import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'
import { spawn } from 'node:child_process'

try {
  const args = process.argv.slice(2)
  if (args.some(arg => !['--check', '--status', '--confirm-production'].includes(arg))) {
    throw new Error('Supported arguments: --check, --status, --confirm-production.')
  }
  if (args.includes('--check') && args.includes('--status')) throw new Error('Use either --check or --status.')
  if (!args.includes('--check') && !args.includes('--status') && !args.includes('--confirm-production')) {
    throw new Error('Refusing to apply production migrations without --confirm-production. Use --check to verify the target first.')
  }

  // Explicit production configuration overrides inherited/local DATABASE_URL values.
  const production = parseEnv(readFileSync(join(process.cwd(), '.env.production.local'), 'utf8'))
  const value = production.DATABASE_URL_UNPOOLED || production.DIRECT_URL || production.DIRECT_DATABASE_URL || production.DATABASE_URL
  if (!value) throw new Error('DATABASE_URL is missing in .env.production.local.')
  const url = new URL(value)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Production DATABASE_URL must be a PostgreSQL URL.')
  if (['localhost', '127.0.0.1', '[::1]', 'db'].includes(url.hostname)) throw new Error('Refusing to run production migrations against a local database.')
  // Use Neon's direct endpoint for schema migrations, matching the staging workflow.
  if (url.hostname.endsWith('.neon.tech')) url.hostname = url.hostname.replace('-pooler.', '.')
  url.searchParams.delete('pgbouncer')

  console.log(`Using .env.production.local — database host: ${url.hostname}, database: ${url.pathname.slice(1)}`)
  if (!args.includes('--check')) {
    const command = args.includes('--status') ? 'status' : 'deploy'
    const child = spawn(process.execPath, [join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', command], {
      stdio: 'inherit', env: { ...process.env, ...production, DATABASE_URL: url.toString() },
    })
    child.once('error', () => { console.error('Unable to start Prisma migration command.'); process.exitCode = 1 })
    child.once('exit', code => { process.exitCode = code ?? 1 })
  }
} catch (error) {
  console.error(error?.code === 'ENOENT' ? 'Missing .env.production.local. Add the production connection configuration first.' : error.message)
  process.exitCode = 1
}
