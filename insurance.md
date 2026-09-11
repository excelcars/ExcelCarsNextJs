# SSOT — Current Next.js Insurance Implementation

## Status and scope

Implemented `/insurance` module; two code-review passes completed. Evidence: `app/(dashboard)/insurance/page.tsx`, `src/features/insurance/InsuranceClient.tsx`, `actions.ts`, `queries.ts`, `app/api/insurance/{export,history}/route.ts`, `prisma/schema.prisma`, and `src/lib/access/accessControl.ts`.

## Access, navigation, and data model

The page calls `canCurrentUserAccessRoute('/insurance')`; an unauthorised visitor is redirected to `/dashboard`. The route is catalogued as `Insurance_Management`, and layout/dashboard/tracking/outstanding-report links navigate to `/insurance?search=<registration>`. Mutating server actions call `getAuthorizedUserIdForRoute('/insurance')`, requiring an active signed-in user with that function grant.

PostgreSQL/Prisma models `InsuranceMain`, `InsurancePaymentDetails`, and `InsuranceFollowupDetails` retain the legacy parent/detail design and audit/user/inventory/customer/partner/variant relations. The feature displays linked `Customer` and `PartnerMaster` records, while retaining legacy snapshot fields. The agent picker is restricted to partner type `Insurance Agent`; the customer picker is used for existing customers. Stock vehicle choices come from all `InventoryManagement` rows. A partial unique migration protects a normalized (uppercase/whitespace-free) registration plus expiry-date pair, while allowing renewal policies for the same vehicle. `InsuranceReminderDelivery` and `InsuranceReminderAttempt` provide a separate, auditable renewal-notification ledger.

## Listing, filtering, navigation, and export

- Server listing is newest ID first, 25 rows per page, with Previous/Next paging and page/total counters.
- Search is debounced (350 ms) and case-insensitive partial matching across registration, legacy and linked customer/agent name/mobile/email, and legacy make/model/variant. From/To entry-date filters are debounced (250 ms), independently optional, and inclusive as implemented by `new Date(date)` bounds. Reset clears all filters.
- The table shows registration; customer; agent; insurance/OD premiums; payout; total received; payout/policy badges; renewal/expiry; and Log Payment, View, Edit, Delete actions. There is no user-selected sort.
- Export calls authenticated `GET /api/insurance/export`, retrieves the complete current filter result (not only the page), and generates a browser CSV with 29 IDs, links, dates, snapshots, financial/status, follow-up, and remark columns. The API requires authentication but only checks for a session, not the `Insurance_Management` grant.

## Form, links, and operations

**Add/Edit** opens a modal. It supports linked customer and required linked insurance agent pickers; agent/customer snapshot values are populated from selections. A vehicle chooser searches the first 20 matching stock vehicles by registration/SKU/make/model/variant and fills inventory, variant, vehicle fields, year, and (when empty) registration. `Find by Registration` normalizes alphanumerics and either links the matching stock record or allows manual continuation.

Form fields: car type (`New`/`PreOwned`), make/model/variant, year, registration, entry date, insurance/OD premium, payout percentage, auto-calculated/read-only payout amount, required initial received amount when creating, read-only total received on edit, statuses (`Pending`/`Paid`, `Pending`/`Received`/`Renewed`), renewal/expiry/follow-up dates, and remark. A close with changed form/customer/agent/vehicle state asks to discard.

Client and server save validation require linked customer and insurance agent, registration, valid car type/make/model/variant/year, all four dates, positive insurance/OD premiums, OD not exceeding insurance premium, payout percentage 0–100, allowed statuses, and valid supplied phone/email. The server derives payout from OD premium × payout percentage and normalizes registration before rejecting only a matching registration-and-expiry policy; it does not trust the browser's readonly payout field. Create also requires a positive initial received amount not above payout, then transactionally creates the parent, initial payment detail, initial follow-up detail, audit data, and matching total. Update overwrites parent fields/links and preserves payment history. Both revalidate and reload.

**View** opens a detail modal displaying all parent vehicle, customer, agent, date, premium, payout, status, follow-up and remark fields. **Delete** uses a confirmation dialog, then atomically deletes payment rows, follow-up rows, and parent; errors are returned generically.

**Log Payment** fetches `GET /api/insurance/history?insuranceMainId=...`, then displays payment history (created date, amount, statuses) and up to three follow-ups. Client and server require a positive amount plus valid payout/policy statuses; a `Pending` payout also requires a current/future next-follow-up date and a remark. A serializable transaction appends payment, conditionally appends follow-up, aggregates the parent total, rejects an over-payout total, and updates parent statuses/audit data. A paid payment without a next follow-up preserves the parent’s current follow-up and remark rather than erasing them.

## Renewal communications

The worker checks India-calendar expiry dates daily and queues reminders at exactly 30, 15, 7, and 1 days before expiry. Each eligible policy sends separately to the linked/snapshotted customer and assigned insurance agent through both Email and the existing `global_temp` WhatsApp template. Duplicate recipient/channel/schedule combinations are suppressed. Each initial send, retry, failure, provider ID, and cancellation is captured in the reminder delivery and attempt ledger. A retry runs after five minutes (maximum two total attempts). Policies marked `Received` or `Renewed` are excluded before queueing and cancel any unsent retry. Sending is deliberately disabled until deployment sets `INSURANCE_REMINDER_ENABLED=true`; no expired-policy reminders are sent.

## Error handling and implementation boundaries

- Page access redirects; server actions return `{ success, error }`. Prisma foreign-key errors receive a specific message; other create/update/delete errors are generic. History/export require the `Insurance_Management` permission and return 403 otherwise; history returns 400 for invalid IDs and 404 for absent parents.
- Form/payment validation is duplicated on the server for integrity. Date parsing rejects invalid dates; allowed status vocabularies, contacts, range rules, payment positivity, follow-up rule, server-derived payout, and total payout cap are all enforced.
- Delete is an atomic transaction over child payments, child follow-ups, and parent. Database constraints and Prisma relations remain the final persistence guard.
- `payoutPaymentStatus` values are `Pending`/`Paid`; the pending follow-up rule correctly tests `Pending`, so paid payments may complete without a next follow-up.

## Current implementation rule

This document records actual code, including stronger client UX controls and outstanding server/API gaps. It must not be read as a statement that legacy behavior has been preserved.
