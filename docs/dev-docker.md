# Local Development Setup

This guide is the default local setup for ExcelCars: the web app runs natively on your machine (fast reload, no container rebuilds), while PostgreSQL and Redis run in Docker.

## Ports

- Web app: `3000` (local, `npm run dev`)
- PostgreSQL: `5432` (Docker)
- Redis: `6379` (Docker)

## Files used

- Compose file: [docker-compose.yml](/D:/projects/ExcelCarsNextJs/docker-compose.yml)
- Base env: [.env](/D:/projects/ExcelCarsNextJs/.env)
- Local override env: `.env.local` (not committed — points `DATABASE_URL`/`REDIS_*` at `localhost`)

## First-time setup

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL and Redis:

```bash
docker compose up -d db redis
```

3. Create `.env.local` so the local web app reaches the Dockerized database and Redis:

```text
DATABASE_URL=postgresql://excelcars:excelcars@localhost:5432/excelcars
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379
```

4. Generate the Prisma client:

```bash
npx prisma generate
```

5. Start the web app:

```bash
npm run dev
```

## Daily commands

Start PostgreSQL and Redis:

```bash
docker compose up -d db redis
```

Stop PostgreSQL and Redis:

```bash
docker compose stop db redis
```

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

1. `npm install`
2. `docker compose up -d db redis`
3. `npx prisma generate`
4. `npm run dev`
5. open `http://localhost:3000`
6. verify `http://localhost:3000/api/health`

## When to use this mode

Use this mode for day-to-day feature development — it's the default. Native local dev gives the fastest reload and avoids container rebuilds for code changes, while Docker still gives you a real, consistent PostgreSQL and Redis.

## Verifying a production build

The web app also ships as a Docker image (see [Dockerfile](/D:/projects/ExcelCarsNextJs/Dockerfile)) for actual deployment. Before shipping a change, verify it builds in that image rather than only locally:

```bash
docker build --target builder -t excelcars-build-check .
```
