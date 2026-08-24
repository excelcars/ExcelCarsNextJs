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
- Base env: [.env](../.env)
- Local override env: `.env.local` (not committed — points `DATABASE_URL`/`REDIS_*` at `localhost`)

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
docker compose up -d db redis adminer
```

Stop PostgreSQL, Redis, and Adminer:

```bash
docker compose stop db redis adminer
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

- `.env` holds shared, safe local defaults
- `.env.local` overrides `DATABASE_URL` and `REDIS_*` to point at `localhost` so the locally-running web app reaches the Dockerized database and Redis
- `.env.local` is gitignored and should never be committed

## Database notes

From the host machine (web app, Prisma CLI, migrations):

```text
postgresql://excelcars:excelcars@localhost:5432/excelcars
```

## Recommended startup path

1. Start Docker Desktop.
2. `npm install`
3. `npm run dev`
4. open `http://localhost:3000`
5. verify `http://localhost:3000/api/health`

## When to use this mode

Use this mode for day-to-day feature development — it's the default. Native local dev gives the fastest reload and avoids container rebuilds for code changes, while Docker still gives you a real, consistent PostgreSQL and Redis.

## Verifying a production build

The web app also ships as a Docker image (see [Dockerfile](../Dockerfile)) for actual deployment. Before shipping a change, verify it builds in that image rather than only locally:

```bash
docker build --target builder -t excelcars-build-check .
```
