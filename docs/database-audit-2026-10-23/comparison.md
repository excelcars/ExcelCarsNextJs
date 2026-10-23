# Staging and live production database comparison

Audit date: 23 October 2026 (Asia/Kolkata).

Staging capture: 2026-10-23T05:42:49.994Z. Production capture: 2026-10-23T05:42:49.785Z.

## Result

The public schema has no missing tables, columns, indexes, constraints, sequences, routines, or extensions in either database. All 171 index definitions match exactly. Two metadata differences remain: nine column ordinal positions in one table and two production-only migration records. This is functional schema parity for the checked definitions, not byte-for-byte database identity.

| Section | Staging | Production | Only staging | Only production | Changed |
| --- | --- | --- | --- | --- | --- |
| tables | 62 | 62 | 0 | 0 | 0 |
| columns | 711 | 711 | 0 | 0 | 9 |
| indexes | 171 | 171 | 0 | 0 | 0 |
| constraints | 206 | 206 | 0 | 0 | 0 |
| sequences | 57 | 57 | 0 | 0 | 0 |
| enums | 0 | 0 | 0 | 0 | 0 |
| views | 0 | 0 | 0 | 0 | 0 |
| triggers | 0 | 0 | 0 | 0 | 0 |
| routines | 36 | 36 | 0 | 0 | 0 |
| policies | 0 | 0 | 0 | 0 | 0 |
| extensions | 2 | 2 | 0 | 0 | 0 |
| migrations | 32 | 34 | 0 | 2 | 0 |
| settings | 9 | 9 | 0 | 0 | 0 |

## Index comparison

All 171 indexes match by table, name, access method, uniqueness, primary-key status, validity, readiness, full SQL definition, and partial-index predicate. Both databases have 0 invalid/not-ready indexes.

No index exists only in staging or only in production.

The shared inquiry indexes `idx_inquiry_status_followup_date` and `idx_inquiry_date_of_inquiry` are present in both. The normalized inventory registration unique index and descending notification index also match. Index equality does not imply identical table contents, statistics, cache warmth, load, storage sizes, or application response times.

## Difference 1: column order in insurance_reminder_delivery

| Column | Staging position | Production position |
| --- | --- | --- |
| email_subject | 10 | 11 |
| email_html | 11 | 12 |
| whatsapp_message | 12 | 13 |
| error_message | 13 | 14 |
| provider_message_id | 14 | 15 |
| retry_count | 15 | 16 |
| next_retry_at | 16 | 17 |
| attempted_at | 17 | 18 |
| scheduled_expiry_date | 18 | 10 |

Only physical column ordinal positions differ. For these columns, every other inspected attribute matches, including data type, nullability, default, precision, identity, generation, and collation. Prisma reads/writes by named columns, so this difference is not a plausible explanation for the observed multi-second latency. Positional `SELECT *` exports or inserts without named column lists can expose this ordering difference. Reordering would require additional schema work and is not recommended solely to fix performance.

## Difference 2: migration history

Staging has 32 recorded migrations; production has 34. Production-only records:

- 20261023090000_align_production_schema_with_uat
- 20261023091000_align_inquiry_activity_default_with_uat

All 32 common records match in name, checksum, completion/rollback status, and applied-step count. The extra production records are the earlier schema convergence operations. Matching migration history is a separate action; this audit did not apply or mark migrations.

## Identical items checked

Table names and kinds; row-security flags; column names/types/defaults/nullability and other inspected column attributes except the ordinal positions above; all 206 constraints with their validation/deferral flags; all 57 sequence definitions; all 36 routine definition fingerprints; both extension names/versions/schemas; and nine PostgreSQL runtime settings. Both contain no public enums, views, user-defined triggers, or RLS policies in this audit.

## Relation to the live slowdown

The index catalogs do not explain a live-versus-staging difference because they match. The separately verified Vercel region mismatch was US East (`iad1`) for live versus Singapore (`sin1`) for UAT, while both databases are in Singapore. Production was redeployed in `sin1` in the preceding task. Deployment regions are outside these database snapshots. Logged-in post-change timings are still required to quantify the speed improvement.

## Inventory notes and reproducibility

- [Staging inventory](staging-inventory.md)
- [Production inventory](production-inventory.md)
- [Staging raw catalog](staging-catalog.json)
- [Production raw catalog](production-catalog.json)

Re-run from the repository root with `node scripts/compare-database-catalogs.mjs`. The script reads the two environment files and emits a compact JSON snapshot; it never prints connection credentials or reads application records. Use the `fields` arrays to decode each section's rows. Captures use independent read-only repeatable-read transactions. Estimated relation row counts and storage bytes in the inventories are descriptive only and are excluded from structural equality. No exact record comparison, database-user/grant audit, other-schema audit, or Neon platform configuration comparison was performed.

