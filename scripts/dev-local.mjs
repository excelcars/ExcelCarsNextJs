import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ensureInquiryNumberUnique } from './ensure-inquiry-number-unique.mjs'
import { ensureVehicleEmailLinkInquiry } from './ensure-vehicle-email-link-inquiry.mjs'

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options })

    child.once('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error(`Could not find ${command}. Install Docker Desktop and make sure it is running.`))
        return
      }
      reject(error)
    })
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} ${signal ? `was stopped by ${signal}` : `exited with code ${code}`}`))
    })
  })
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function waitFor(service, command) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await run('docker', ['compose', 'exec', '-T', service, ...command], { stdio: 'ignore' })
      return
    } catch {
      if (attempt === 30) break
      await wait(1000)
    }
  }

  throw new Error(`${service} did not become ready. Open Docker Desktop and check its container logs.`)
}

async function main() {
  const envDockerPath = join(process.cwd(), '.env.docker')
  if (!existsSync(envDockerPath)) {
    console.log('Creating missing .env.docker file…')
    writeFileSync(
      envDockerPath,
      `# Docker Environment Variables (for web and worker services when run inside Docker)
NODE_ENV=development
APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=replace-with-a-long-random-string

DATABASE_URL=postgresql://excelcars:excelcars@db:5432/excelcars
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
`
    )
  }

  console.log('\nStarting local PostgreSQL, Redis, and Adminer…')
  try {
    await run('docker', ['compose', 'up', '-d', 'db', 'redis', 'adminer'])
  } catch (error) {
    console.error('\nDocker Desktop must be running before npm run dev.')
    throw error
  }

  await Promise.all([
    waitFor('db', ['pg_isready', '-U', 'excelcars', '-d', 'excelcars']),
    waitFor('redis', ['redis-cli', 'ping']),
  ])

  console.log('Local services are ready. Syncing the Prisma schema…')
  const prisma = join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
  if (!existsSync(prisma)) throw new Error('Dependencies are missing. Run npm install first.')

  await run(process.execPath, [prisma, 'generate'])
  await run(process.execPath, [prisma, 'db', 'push', '--skip-generate'])
  await ensureInquiryNumberUnique(process.env)
  await ensureVehicleEmailLinkInquiry(process.env)

  const next = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
  if (!existsSync(next)) throw new Error('Dependencies are missing. Run npm install first.')

  const nextProcess = spawn(process.execPath, [next, 'dev', ...process.argv.slice(2)], { stdio: 'inherit' })
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => nextProcess.kill(signal))
  }
  nextProcess.once('exit', (code) => process.exit(code ?? 0))
}

main().catch((error) => {
  console.error(`\nUnable to start local development: ${error.message}`)
  process.exit(1)
})
