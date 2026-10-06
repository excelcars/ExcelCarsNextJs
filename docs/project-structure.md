# ExcelCars Next.js Project Structure

This is the recommended starter structure for the ExcelCars migration.

```text
ExcelCarsNextJs/
|- app/
|  |- (auth)/
|  |  |- login/
|  |- (dashboard)/
|  |  |- inventory/
|  |  |- inquiry/
|  |  |- follow-up/
|  |  |- loan/
|  |  |- insurance/
|  |  |- rto/
|  |  |- configuration/
|  |  |- reports/
|  |- api/
|  |  |- auth/
|  |  |- inventory/
|  |  |- inquiry/
|  |  |- uploads/
|  |  |- exports/
|  |- layout.tsx
|  |- page.tsx
|- src/
|  |- components/
|  |  |- ui/
|  |  |- layout/
|  |  |- forms/
|  |  |- tables/
|  |- features/
|  |  |- auth/
|  |  |- inventory/
|  |  |- inquiry/
|  |  |- follow-up/
|  |  |- loan/
|  |  |- insurance/
|  |  |- rto/
|  |  |- configuration/
|  |  |- reports/
|  |- lib/
|  |  |- auth/
|  |  |- db/
|  |  |- queue/
|  |  |- storage/
|  |  |- email/
|  |  |- sms/
|  |  |- excel/
|  |  |- validations/
|  |- worker/
|  |  |- jobs/
|  |  |- processors/
|  |  |- index.js
|- prisma/
|  |- schema.prisma
|  |- migrations/
|- public/
|  |- uploads-placeholder/
|- docs/
|- Dockerfile
|- docker-compose.yml
|- .env.example
```

## Module mapping

- `auth`: login, session bootstrap, logout, permissions
- `inventory`: stock, photos, dealer/customer sharing
- `inquiry`: inquiry entry, matching inventory, prior inquiry checks
- `follow-up`: dashboard drill-through and follow-up tracking
- `loan`, `insurance`, `rto`: operational financial-adjacent modules
- `configuration`: users, dealer/customer masters, templates, notifications
- `reports`: stock, outstanding payment, tracking, and exports

## Docker usage

- `web` container runs the Next.js app
- `worker` container runs BullMQ consumers
- `db` container runs PostgreSQL for local development
- `redis` container runs local Redis for local queues

## Production note

For production, keep the same logical split but replace local Redis with Upstash Redis and local file storage with Cloudflare R2.
