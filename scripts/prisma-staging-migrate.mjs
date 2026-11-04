import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'
import { spawn } from 'node:child_process'
import { stagingMigrationEnvironment } from './staging-database.mjs'

try {
  const args = process.argv.slice(2)
  if (args.some(arg => arg !== '--check')) throw new Error('Only --check is supported.')
  // Explicit staging configuration must override inherited local environment values.
  const staging = stagingMigrationEnvironment(parseEnv(readFileSync(join(process.cwd(), '.env.staging.local'), 'utf8')))
  const url = new URL(staging.DATABASE_URL)
  console.log(`Using .env.staging.local — migration database host: ${url.hostname}`)
  if (!args.includes('--check')) {
    const child = spawn(process.execPath, [join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], {
      stdio: 'inherit', env: { ...process.env, ...staging },
    })
    child.once('error', () => { console.error('Unable to start Prisma migration.'); process.exitCode = 1 })
    child.once('exit', code => { process.exitCode = code ?? 1 })
  }
} catch (error) {
  console.error(error?.code === 'ENOENT' ? 'Missing .env.staging.local. Add the staging DATABASE_URL first.' : error.message)
  process.exitCode = 1
}
