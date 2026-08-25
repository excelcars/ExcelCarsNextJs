# Local Development Setup

This guide is the default local setup for ExcelCars: the web app runs natively on your machine (fast reload, no container rebuilds), while PostgreSQL and Redis run in Docker.

## Why Docker for the database and Redis (but not the web app)

- **PostgreSQL and Redis are not something you install and maintain by hand.** Docker gives everyone the exact same versions (`postgres:17-alpine`, `redis:7-alpine`) with zero manual setup — no installing, configuring, or upgrading a database engine on your own machine.
- **Disposable and resettable.** `docker compose down -v` wipes the data volumes and gets you a clean database in seconds — useful after a bad migration or seed run, without touching a real install.
- **Matches what runs in every other environment.** The same images back local dev, and the same PostgreSQL/Redis versions are what the app is actually tested against — no "works on my machine because I have a newer Postgres" drift.
- **The web app is different: it's the thing you're actively editing.** Running it natively means instant hot reload and no container rebuild on every save. Running the *database* natively would just add setup work for no benefit, since you rarely edit the database engine itself. If you do need to validate the web app inside a container (e.g. before deploying), see [Verifying a production build](#verifying-a-production-build) below.

## Ports

- Web app: `3000` (local, `npm run dev`)
- PostgreSQL: `5432` (Docker)
- Redis: `6379` (Docker)

## Files used

- Compose file: [docker-compose.yml](../docker-compose.yml)
- Local app / Prisma env: [.env](../.env)
- Optional personal override env: `.env.local` (not committed)
- Docker-only service env: [.env.docker](../.env.docker)

## First-time setup

1. Install dependencies:

```bash
npm install
```

2. Start Docker Desktop. Enable **Start Docker Desktop when you log in** in its settings so the supporting services can restart automatically.

3. Start the web app:

```bash
npm run dev
```

This starts PostgreSQL, Redis, and Adminer; waits for PostgreSQL and Redis; generates Prisma Client; and syncs the local development schema before Next.js starts. Docker Desktop must be running first.

## Daily commands

Start PostgreSQL, Redis, and Adminer without starting the web app:

```bash
npm run infra:up
```

Stop and remove the local Docker containers (data volumes are retained):

```bash
npm run infra:down
```

Check supporting container status:

```bash
npm run infra:ps
```

Manually regenerate Prisma Client or sync the local schema only when needed:

```bash
npm run db:generate
npm run db:push
```

Adminer is available at `http://localhost:8080`. Sign in with server `db`, username `excelcars`, database `excelcars`, and the password from `POSTGRES_PASSWORD` in `docker-compose.yml`.

Start the web app:

```bash
npm run dev
```

Watch database/Redis logs:

```bash
docker compose logs -f db redis
```

Check running containers:

```bash
docker compose ps
```

## Prisma migration workflow

Use Prisma migrations as the default workflow for schema changes.

Create and apply a new migration locally:

```bash
npm run db:migrate:dev -- --name your_change_name
```

Examples:

```bash
npm run db:migrate:dev -- --name add_customer_notes
npm run db:migrate:dev -- --name create_message_template_table
```

Check migration state:

```bash
npm run db:migrate:status
```

Important:

- use `migrate dev` on local development only
- do not use `migrate dev` on staging or production
- use `db push` only for local prototyping or exceptional/manual recovery

## Validation

Health check:

```bash
curl http://localhost:3000/api/health
```

Expected result:

```json
{"ok":true,"service":"excelcars-web","timestamp":"..."}
```

## Local environment strategy

- `.env` is the source of truth for host-local commands like `npx prisma db push` and `npm run dev`
- `.env` should use `localhost` for `DATABASE_URL` and `REDIS_*`
- `.env.local` is optional for personal overrides and is gitignored
- `.env.docker` is only for app processes that run inside Docker and therefore need `db` / `redis` hostnames

## Database notes

From the host machine (web app, Prisma CLI, migrations):

```text
postgresql://excelcars:excelcars@localhost:5432/excelcars
```

Inside Docker app containers:

```text
postgresql://excelcars:excelcars@db:5432/excelcars
```

## Recommended startup path

1. Start Docker Desktop.
2. `npm install`
3. `npm run dev`
4. open `http://localhost:3000`
5. verify `http://localhost:3000/api/health`

## Schema change flow

When you add a table or update columns:

1. Edit [schema.prisma](../prisma/schema.prisma)
2. Create a local migration:

```bash
npm run db:migrate:dev -- --name your_change_name
```

3. Test locally
4. Commit:
   - `prisma/schema.prisma`
   - `prisma/migrations/...`
5. Apply the committed migration to staging and production with deploy commands

## When to use this mode

Use this mode for day-to-day feature development — it's the default. Native local dev gives the fastest reload and avoids container rebuilds for code changes, while Docker still gives you a real, consistent PostgreSQL and Redis.

## Verifying a production build

The web app also ships as a Docker image (see [Dockerfile](../Dockerfile)) for actual deployment. Before shipping a change, verify it builds in that image rather than only locally:

```bash
docker build --target builder -t excelcars-build-check .
```

## Manual database operations

These are exceptional/manual operations, not the default schema workflow:

Push schema directly to staging:

```bash
npm run db:push:staging
```

Copy local schema and data to staging:

```bash
npm run db:copy-data:staging -- --force
```

Push schema directly to production:

```bash
npm run db:push:production -- --force --confirm-production
```

Copy local schema and data to production:

```bash
npm run db:copy-data:production -- --force --confirm-production
```

Use these only when you intentionally want direct push/restore behavior outside the normal migration process.
