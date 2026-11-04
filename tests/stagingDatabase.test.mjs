import test from 'node:test'
import assert from 'node:assert/strict'
import { stagingMigrationEnvironment } from '../scripts/staging-database.mjs'

test('Neon migrations use a direct connection, preserving the branch, database and credentials', () => {
  const source = { DATABASE_URL: 'postgresql://user:test-password@ep-test-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true', CUSTOM: 'staging' }
  const result = stagingMigrationEnvironment(source)
  const url = new URL(result.DATABASE_URL)
  assert.equal(url.hostname, 'ep-test.c-3.ap-southeast-1.aws.neon.tech')
  assert.equal(url.password, 'test-password')
  assert.equal(url.pathname, '/neondb')
  assert.equal(url.searchParams.get('sslmode'), 'require')
  assert.equal(url.searchParams.has('pgbouncer'), false)
  assert.equal(result.CUSTOM, 'staging')
  assert.ok(source.DATABASE_URL.includes('-pooler.'))
})

test('explicit staging direct URLs take precedence and other hosts are preserved', () => {
  const direct = 'postgresql://user:password@direct.example.com/staging?sslmode=require'
  for (const key of ['DATABASE_URL_UNPOOLED', 'DIRECT_URL', 'DIRECT_DATABASE_URL']) {
    assert.equal(stagingMigrationEnvironment({ DATABASE_URL: 'postgresql://u:p@pooled.example.com/db', [key]: direct }).DATABASE_URL, direct)
  }
})

test('missing, local and non-PostgreSQL migration destinations are rejected', () => {
  for (const DATABASE_URL of [undefined, 'postgresql://u:p@localhost/db', 'postgresql://u:p@127.0.0.1/db', 'postgresql://u:p@db/db', 'https://example.com/db']) assert.throws(() => stagingMigrationEnvironment({ DATABASE_URL }))
})
