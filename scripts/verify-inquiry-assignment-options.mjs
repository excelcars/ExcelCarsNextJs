import fs from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { PrismaClient } from '@prisma/client'

// Read-only verification using the actual dropdown service. Print aggregate
// results only: no credentials, account names, or customer records.
const source = ts.transpileModule(fs.readFileSync('src/features/inquiry/queries.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

for (const environment of ['staging', 'production']) {
  const file = `.env.${environment}.local`
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find(value => value.startsWith('DATABASE_URL='))
  if (!line) throw new Error(`DATABASE_URL missing in ${file}`)
  const datasourceUrl = line.slice('DATABASE_URL='.length).trim().replace(/^(["'])(.*)\1$/, '$2')
  const db = new PrismaClient({ datasourceUrl })
  try {
    const compiledModule = { exports: {} }
    runInNewContext(source, { module: compiledModule, exports: compiledModule.exports, require(name) {
      if (name === '@/lib/db/prisma') return { prisma: db }
      if (['@/lib/access/inquiryOwnership', './sourceMaster.server', './locationMaster.server'].includes(name)) return {}
      throw new Error(`Unexpected dependency: ${name}`)
    } })
    const [options, legacyOptions] = await Promise.all([
      compiledModule.exports.getInquiryAssistants(),
      db.userTable.count({ where: { status: 'Active', roleName: 'InquiryAssistant', empId: { not: null } } }),
    ])
    console.log(JSON.stringify({
      environment,
      legacyOptions,
      fixedOptions: options.length,
      withoutEmployeeLink: options.filter(user => !user.employee).length,
      namesResolved: options.filter(user => user.displayName?.trim() || user.userName?.trim()
        || `${user.employee?.empFirstName ?? ''} ${user.employee?.empLastName ?? ''}`.trim()).length,
    }))
  } finally {
    await db.$disconnect()
  }
}
