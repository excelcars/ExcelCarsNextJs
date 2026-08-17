# Docker Development Setup

This guide is the default local setup for ExcelCars when we want the web app, worker, PostgreSQL, and Redis to run together.

## Ports

- Web app: `3000`
- PostgreSQL: `5432`
- Redis: `6379`

## Files used

- Docker config: [Dockerfile](/D:/projects/ExcelCarsNextJs/Dockerfile)
- Compose file: [docker-compose.yml](/D:/projects/ExcelCarsNextJs/docker-compose.yml)
- Docker env: [.env.docker](/D:/projects/ExcelCarsNextJs/.env.docker)

## First-time setup

1. Install dependencies:

```bash
npm install
```

2. Review Docker env values:

```bash
copy .env.docker .env
```

3. Start all local services:

```bash
npm run docker:up
```

## Daily commands

Start the stack:

```bash
npm run docker:up
```

Stop the stack:

```bash
npm run docker:down
```

Watch container logs:

```bash
npm run docker:logs
```

Check running containers:

```bash
npm run docker:ps
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

- `docker-compose` reads [.env.docker](/D:/projects/ExcelCarsNextJs/.env.docker)
- the `web` container uses service names like `db` and `redis`
- local non-Docker app runs should use `.env.local` or `.env.development.local`

## Database notes

Inside Docker:

```text
postgresql://excelcars:excelcars@db:5432/excelcars
```

From the host machine:

```text
postgresql://excelcars:excelcars@localhost:5432/excelcars
```

## Recommended startup path

1. `npm install`
2. `npm run docker:up`
3. open `http://localhost:3000`
4. verify `http://localhost:3000/api/health`

## When to use this mode

Use Docker development when:

- you want a predictable shared environment
- you need PostgreSQL and Redis running together
- you are testing worker flows or queue-backed features

Use plain `npm run dev` only when:

- Docker is not needed
- you already have database and Redis running separately
