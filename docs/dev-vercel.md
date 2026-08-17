# Vercel Development And Deployment Setup

This guide is for linking the project to Vercel, pulling environment variables, and deploying preview and production builds.

Current Vercel CLI behavior is based on the official docs for `vercel pull`, `vercel env`, and CLI deployment as of January-March 2026:
- [vercel pull](https://vercel.com/docs/cli/pull)
- [vercel env](https://vercel.com/docs/cli/env)
- [Deploying from the CLI](https://vercel.com/docs/projects/deploy-from-cli)
- [Environment variables](https://vercel.com/docs/environment-variables)

## Vercel environments

Vercel defaults:

- `development`
- `preview`
- `production`

Optional extra stage:

- `staging`

`staging` is typically handled as a custom environment or a separate preview/staging project, depending on your team workflow.

## Files in this repo

- Development env template: [.env.development.example](/D:/projects/ExcelCarsNextJs/.env.development.example)
- Preview env template: [.env.preview.example](/D:/projects/ExcelCarsNextJs/.env.preview.example)
- Staging env template: [.env.staging.example](/D:/projects/ExcelCarsNextJs/.env.staging.example)
- Production env template: [.env.production.example](/D:/projects/ExcelCarsNextJs/.env.production.example)

## Install Vercel CLI

One-time global install:

```bash
npm i -g vercel
```

Or use `npx` on demand:

```bash
npx vercel --version
```

## First-time Vercel setup

1. Link the local project:

```bash
npm run vercel:link
```

2. Pull development variables into `.env.local`:

```bash
npm run vercel:pull:dev
```

3. Start local development using Vercel-managed env vars:

```bash
npm run vercel:dev
```

## Preview workflow

Pull preview variables:

```bash
npm run vercel:pull:preview
```

Create a preview deployment:

```bash
npm run vercel:deploy:preview
```

## Production workflow

Pull production variables for local verification:

```bash
npm run vercel:pull:production
```

Run a production-style build:

```bash
npm run vercel:build
```

Deploy to production:

```bash
npm run vercel:deploy:production
```

## Environment-variable rules

- local development should use `.env.local`
- Docker local development should use `.env.docker`
- preview values should live in Vercel `Preview`
- production values should live in Vercel `Production`
- staging values should live in a custom Vercel environment if your plan supports it, or in a dedicated staging project

## Suggested variable ownership by stage

Development:

- local database
- local Redis or Docker Redis
- test email/SMS credentials
- sandbox storage bucket

Preview:

- preview database
- preview queue/Redis
- preview bucket
- non-production API keys

Staging:

- stable pre-release database
- stable pre-release queue
- staging bucket
- near-production integrations

Production:

- production database
- production queue
- production bucket
- live email/SMS credentials

## Common commands

Run local dev with Vercel env:

```bash
npm run vercel:dev
```

Pull dev env:

```bash
npm run vercel:pull:dev
```

Pull preview env:

```bash
npm run vercel:pull:preview
```

Pull production env:

```bash
npm run vercel:pull:production
```

Deploy preview:

```bash
npm run vercel:deploy:preview
```

Deploy production:

```bash
npm run vercel:deploy:production
```

## Recommended project flow from the beginning

1. Start local feature work with Docker using [dev-docker.md](/D:/projects/ExcelCarsNextJs/docs/dev-docker.md)
2. Link Vercel once
3. Keep real secrets in Vercel, not in committed env files
4. Use preview deployments for QA
5. Promote only tested builds to production
