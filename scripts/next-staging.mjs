import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const stagingLocalEnv = join(process.cwd(), '.env.staging.local')
const stagingEnv = join(process.cwd(), '.env.staging')
const envFile = existsSync(stagingLocalEnv) ? stagingLocalEnv : stagingEnv

if (!existsSync(envFile)) {
  throw new Error('Missing .env.staging or .env.staging.local')
}

process.loadEnvFile(envFile)
// Run the same production runtime mode used by Vercel, while loading staging services.
process.env.NODE_ENV = 'production'

const command = process.argv[2]
if (!command || !['build', 'start'].includes(command)) {
  throw new Error('Usage: node scripts/next-staging.mjs <build|start>')
}

const next = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
const nextProcess = spawn(process.execPath, [next, command, ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: process.env,
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => nextProcess.kill(signal))
}

nextProcess.once('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0))
})
