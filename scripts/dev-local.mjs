import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

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
