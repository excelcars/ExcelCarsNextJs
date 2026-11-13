import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

async function main() {
  const localStagingEnv = join(process.cwd(), '.env.staging.local')
  const stagingEnvFile = join(process.cwd(), '.env.staging')
  const exampleStagingEnv = join(process.cwd(), '.env.staging.example')
  const stagingEnv = existsSync(localStagingEnv)
    ? localStagingEnv
    : existsSync(stagingEnvFile)
      ? stagingEnvFile
      : exampleStagingEnv

  if (!existsSync(stagingEnv)) {
    throw new Error('Missing .env.staging.local. Copy .env.staging.example to .env.staging.local and set the staging values.')
  }

  if (stagingEnv === exampleStagingEnv) {
    console.warn('\nUsing .env.staging.example. Move these values to .env.staging.local before committing changes.')
  }
  process.loadEnvFile(stagingEnv)

  // This is a local Next.js development server, even though it talks to staging services.
  process.env.NODE_ENV = 'development'
  // Local and staging dev servers can run together without overwriting each
  // other's route manifests or redirecting local sign-in to hosted UAT.
  process.env.NEXT_DIST_DIR = '.next-staging-dev'
  const args = process.argv.slice(2)
  const portIndex = args.findIndex(arg => arg === '--port' || arg === '-p')
  const port = args.find(arg => arg.startsWith('--port='))?.slice(7) ?? (portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || '3000')
  if (!port || !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Specify a valid local staging port.')
  process.env.AUTH_URL = `http://localhost:${port}`
  process.env.NEXTAUTH_URL = process.env.AUTH_URL

  const next = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
  if (!existsSync(next)) throw new Error('Dependencies are missing. Run npm install first.')

  console.log('Starting Next.js against staging services. No Docker services or Prisma schema commands will run.\n')
  const nextProcess = spawn(process.execPath, [next, 'dev', ...args], { stdio: 'inherit', env: process.env })
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => nextProcess.kill(signal))
  }
  nextProcess.once('exit', (code) => process.exit(code ?? 0))
}

main().catch((error) => {
  console.error(`\nUnable to start staging development: ${error.message}`)
  process.exit(1)
})
