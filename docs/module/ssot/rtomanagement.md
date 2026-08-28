# SSOT - RTO Management Module
## Status: Next.js implemented; current-state behavior documented

This document describes the behavior implemented in the Next.js application. It is implementation-backed documentation, not a redesign proposal. The legacy reference remains separate at `docs/module/existing_ssot/RTO_Management.md`.

## 1. Purpose And Scope

RTO Management tracks registration-transfer jobs, the associated customer, RTO agent, vehicle context, charges, payment status, RC status, transfer status, follow-up date, and remarks.

The current module supports:

- listing all RTO records
- client-side free-text and structured filtering
- adding and editing a job
- optional linking to an inventory vehicle
- selecting or creating a customer and RTO agent
- seeding an initial payment and optional initial follow-up during RTO creation
- viewing the complete main-record snapshot and audit metadata
- logging payment and optional follow-up history
- deleting a record and its child histories
- browser-generated CSV export

It does not implement server-side search, pagination, table sorting controls, a dedicated RTO detail route, direct customer upsert during RTO save, or legacy MVC endpoints.

RTO-specific user access control is also not yet implemented. For the current phase, the module is treated as authenticated-only, and finer-grained user/role/function access is deferred to a later implementation.

## 2. Source Evidence

- `app/(dashboard)/rto/page.tsx`
- `src/features/rto/RtoClient.tsx`
- `src/features/rto/queries.ts`
- `src/features/rto/actions.ts`
- `app/api/rto/history/route.ts`
- `src/components/CustomerPicker.tsx`
- `src/components/PartnerPicker.tsx`
- `src/features/customers/actions.ts`
- `src/features/partners/actions.ts`
- `src/features/partners/queries.ts`
- `app/api/customers/search/route.ts`
- `app/api/partners/search/route.ts`
- `src/features/dashboard/queries.ts`
- `src/features/reports/tracking/queries.ts`
- `src/features/reports/tracking/TrackingClient.tsx`
- `src/features/reports/outstanding/OutstandingClient.tsx`
- `src/components/Layout.tsx`
- `prisma/schema.prisma`
- `auth.ts`, `auth.config.ts`, `middleware.ts`

## 3. Navigation, Routes, And Access Control

| Path/endpoint | Behavior |
|---|---|
| `/rto` | Authenticated dashboard page; accepts `search` and `registrationNo` query parameters for initial filters. |
| `/api/rto/history?rtoAgentMainId=...` | Authenticated GET endpoint returning payment and follow-up history. |
| `/api/customers/search?q=...` | Used by the shared customer picker. |
| `/api/partners/search?partnerType=RTO%20Agent&q=...` | Used by the shared RTO-agent picker. |
| Server actions in `src/features/rto/actions.ts` | Create, update, delete, and payment logging. |

The Operations menu always renders an `RTO Management` link to `/rto`; it has no RTO-specific role/function-list check. The dashboard group layout and middleware require an authenticated NextAuth session. The RTO server actions and history API do not independently perform a role check; the actions obtain the current user only for audit fields. A user who can invoke the authenticated application surface is therefore not further restricted by an RTO permission in this implementation.

This is an intentional current-phase limitation, not an undocumented omission: module-specific user access rules for RTO are planned for a later phase. Until that is implemented, the effective rule is:

- any authenticated user who can access the dashboard can reach and use `/rto`
- there is no separate RTO permission gate at menu, route, API, or server-action level
- audit user IDs are still captured when a session user ID is available

Related links:

- Stock Tracking opens `/rto?registrationNo=...` with a registration filter and labels the action `Edit RTO Job`.
- Outstanding Payments opens the same registration-filtered RTO URL for RTO rows.
- The dashboard only displays an aggregate `Pending RTO` count; it does not link to the RTO page from the count in the inspected page.
- The customer and partner search endpoints require a session. The shared customer quick-create action also requires a session, but the shared partner quick-create action does not perform its own authentication check; it writes a `PartnerMaster` row if its input checks pass.

## 4. Data Ownership And Relationships

The aggregate root is Prisma model `RtoAgent`, mapped to `rto_agent`. It contains legacy snapshot fields plus nullable foreign keys to:

- `Customer` through `customerId`
- `PartnerMaster` through `fkPartnerId`
- `InventoryManagement` through `inventoryId`
- `CarVariantMaster` through `fkVariantId`
- `UserTable` through created/updated audit IDs

It has one-to-many relations to `RtoPaymentDetails` and `RtoFollowupDetails`. The main row stores `amtPaid` as a denormalized total. Payment rows store their own charges, amount, statuses, payment date, and audit fields. Follow-up rows store date, remark, and audit fields.

The initial page query includes customer, partner, created-by user, and updated-by user. It does not include payment or follow-up children.

## 5. Page Load And Listing Query

`RtoPage` reads the two supported URL parameters, then runs `listRtoAgents()` and `getVehicles()` in parallel. `listRtoAgents()` performs `findMany` over all RTO rows, includes the relations described above, and orders by `rtoAgentMainId` descending. `getVehicles()` loads all inventory vehicles ordered by `inventoryId` descending, with registration/SKU/year and make/model/variant relation data.

Decimal values are converted to strings before being passed to the client. There is no server-side filter, page size, pagination, or query-level sorting other than descending ID order.

After an add, edit, or payment save, the client reloads the browser, causing the full page query to run again. After deletion, the client removes the row from local state without a full reload.

## 6. Main Record Fields And Defaults

The add/edit modal exposes:

| Field | Current behavior |
|---|---|
| RTO Agent | Shared `PartnerPicker` restricted by `partnerType = "RTO Agent"`; required by client and server. |
| Customer | Shared `CustomerPicker`; selection is optional in the UI but save requires a linked customer or nonblank legacy name. The RTO form itself has no free-text customer input. |
| Vehicle | Optional inventory link; selecting a vehicle copies inventory ID, variant ID, make, model, variant, year, and registration when present. |
| Car Type | `New` or `PreOwned`; add defaults to `PreOwned`. |
| Make / Model / Variant | Editable text fields with browser autocomplete suggestions sourced from car master data; they may also be populated from the selected vehicle. |
| Year | Optional numeric field, validated as 1900 through current year + 1. |
| Registration No | Required by client either directly or through a selected vehicle. |
| Entry Date | Defaults to the browser's current date in `YYYY-MM-DD`. |
| Transfer Charges | Optional numeric value; client rejects negative values but does not require a value. |
| Amount Paid | Visible only while creating a new RTO job; optional numeric value used to seed the first payment-history row. |
| Payment Status | `Pending`, `Partially Paid`, or `Fully Paid`; add defaults to `Pending`. |
| Payment Date | Optional date input. |
| RC Status | `Pending` or `Received`; add defaults to `Pending`. |
| Transfer Status | `Pending` or `Done`; add defaults to `Pending`. |
| Follow-up Date | Optional date input. |
| Remark | Optional text area. |

When creating a new record, a positive `Amount Paid` seeds the first payment-history row. When editing an existing record, the modal does not expose an amount-paid input; subsequent payment changes continue through `Log Payment`.

## 7. Main Form Interactions

### 7.1 Add

`Add RTO Job` resets the form, selected customer, selected agent, selected vehicle, edit ID, errors, and lookup message, then opens the add modal.

### 7.2 Vehicle selection

The inventory picker filters the already-loaded vehicle list by case-insensitive substring matching against registration/SKU and make/model/variant, and shows at most 20 matches. `Find by Registration` normalizes both values by cleaning junk values, uppercasing, and removing non-alphanumeric characters. A match is linked; no match shows a message and permits manual continuation. Clearing the selected vehicle removes only the inventory and variant IDs; manually entered vehicle text remains.

### 7.3 Make, model, and variant assistance

The add/edit modal now provides browser autocomplete suggestions for make, model, and variant using shared car master data. Make suggestions are loaded with the page. Model suggestions are loaded once the typed make exactly matches a known make, and variant suggestions are loaded once the typed model exactly matches a known model for the selected make. When the typed variant exactly matches a known variant for the selected model, the form stores that `variantId`; otherwise the user can still continue with manual text values.

### 7.4 Customer and agent selection

Customer search starts after at least two characters, waits 300 ms, and uses `/api/customers/search`. It handles stale requests and displays loading, error, and no-match states. It also offers quick customer creation, requiring a name and at least mobile or email according to the shared picker UI/action. Selecting a customer copies ID, name, mobile, and email into the RTO form. Clearing the selection sets the ID to null but leaves the legacy text values unchanged.

The partner picker queries the partner endpoint after a 300 ms delay and offers quick creation with name plus mobile or email. Selecting an agent copies partner ID and contact snapshot fields into the form. Clearing sets the partner ID to null but leaves legacy contact values unchanged. The server action still requires `partnerId`, so manually retained legacy agent text cannot satisfy a save without a selected partner.

The picker endpoints return HTTP 401 when unauthenticated. Customer quick creation rejects a blank name or the absence of both mobile and email and then requires a session. Partner quick creation applies the same name/contact presence checks but does not require a session in `quickCreatePartner`; this is a shared-action access-control gap used by the RTO form.

### 7.5 Edit

Edit copies the row into the form, preferring related partner contact values for the agent and related customer values for the displayed picker. It restores the linked inventory vehicle only when that vehicle exists in the page's loaded inventory list. The current row ID is retained as the edit ID, and the modal title changes to `Edit RTO Job`.

### 7.6 Unsaved-change protection

Closing or cancelling the add/edit modal checks snapshots of the form, selected customer, selected agent, and selected vehicle. If changed, a discard confirmation is shown. Closing while a save transition is pending is ignored. The payment modal has no equivalent unsaved-change confirmation.

## 8. Search, Filters, Sorting, And Export

All filtering is performed in `useMemo` over the complete `data` array in the browser. Filters are combined with logical AND. The search box is always visible. The primary filter row always shows RC Status, Transfer Status, Payment Status, From Entry Date, To Entry Date, Reset Filters, and a `Load More Filter` toggle. The toggle expands the remaining existing filters—Registration No, customer fields, agent fields, Car Type, Year, Make, Model, and Variant—and changes to `Hide Filters` while expanded. It does not load additional records.

The global search box is a case-insensitive substring search across registration number, customer name, agent name, make, model, and variant. It does not search mobile, email, year, statuses, dates, charges, or remarks.

Structured filters are:

- registration number, customer name/mobile/email, and agent name/mobile/email: case-insensitive substring matching
- car type: exact match, with `All` meaning no filter
- year: exact string equality after trimming
- make/model/variant: case-insensitive substring matching
- payment, RC, and transfer status: exact match, with `All` meaning no filter
- from/to entry date: inclusive lexical comparison against normalized `YYYY-MM-DD` entry dates

`Reset Filters` restores the global and structured filters to their defaults. URL-provided `search` and `registrationNo` initialize/update only those two filters; changes to filters are not written back to the URL.

There is no user-controlled sorting. The displayed order is the server query's descending RTO ID order, preserved by client filtering.

The export button is disabled when no filtered rows exist. Otherwise it builds a CSV entirely in the browser from the filtered rows. Every value is quoted and embedded quotes are doubled. The CSV contains 26 columns: RTO ID, linked inventory/customer/agent/variant IDs, entry date, customer contact fields, agent contact fields, registration, car type/make/model/variant/year, transfer charges, total amount paid, payment status/date, RC status, transfer status, follow-up date, and remark. Related customer/partner values are preferred over legacy snapshots. The filename is `rto-filtered-YYYY-MM-DD.csv` when any filter is active, otherwise `rto-N-rows-YYYY-MM-DD.csv`.

If browser-side export throws, the page shows a top-level red error banner with the thrown message or `Could not export RTO records.`.

## 9. Listing And View Modal

The page header displays `RTO Management`, the current filtered row count as transfer jobs, an export control, and `Add RTO Job`.

The table columns are Registration No, Customer, Agent, Charges, Paid, Payment, RC, Transfer, Follow-up, and Actions. Customer display uses the related customer name but the table's mobile line uses the legacy mobile field. Agent display uses the related partner name only. Missing values display `—`; monetary zero/null values also display `—` because of the current formatter.

When the filtered result set is empty, the shared table component renders a single-row empty state reading `No records found`.

Each row has:

- View Details: opens the read-only view modal
- Log Payment: opens the payment modal and loads child history
- Edit: opens the populated add/edit modal
- Delete: opens a confirmation dialog stating deletion cannot be undone

The view modal displays registration, vehicle identity, car type/year, customer name/mobile/email, agent name/mobile/email, entry date, transfer charges, amount paid, payment/RC/transfer statuses, follow-up date, the latest main remark, created-by/date, and last-updated-by/date. It also loads and displays all payment entries and all follow-up/remark history from the history API. It has only a Close button; it does not edit, pay, export, or link from inside the modal.

## 10. Create And Update Business Logic

The client validates before invoking a server action:

- an inventory link or nonblank registration is required
- a partner ID or nonblank agent legacy name is checked client-side, but the server ultimately requires a partner ID
- a customer ID or nonblank customer legacy name is required
- negative transfer charges are rejected
- negative initial amount paid is rejected
- when creating with an initial amount paid greater than zero, transfer charges, payment date, and all three statuses are required
- when creating with an initial amount paid greater than zero, amount paid cannot exceed transfer charges
- year, phone, and email values are validated when nonblank

`createRto` repeats the customer and partner requirements server-side. If a nonblank registration exactly matches any existing `carRegistrationNo`, creation is rejected. Registration comparison is trimmed but not normalized for case, spacing, or punctuation.

Creation runs inside a Prisma transaction. It writes the main row, connects selected partner/customer/inventory/variant relations when IDs are supplied, initializes `amtPaid` to zero, writes created/updated timestamps, and writes audit user IDs when a session user ID is available. Legacy snapshot fields are stored as null when their input is an empty string. If `Amount Paid` is greater than zero, creation also inserts the first payment child using the submitted amount, statuses, and payment date. If a follow-up date is supplied, creation also inserts the first follow-up child with the submitted remark. Creation then aggregates all child payment amounts and updates main `amtPaid`; main payment date is set from the seeded initial payment when present.

`updateRto` applies the same requirements and duplicate check, excluding the current ID. It overwrites the main row fields and foreign keys. Before updating, it finds the latest child payment ordered by payment date descending, then created date and payment ID descending; if found, that date takes precedence over the form's payment date. It does not recalculate `amtPaid` from child payments during a normal edit.

Both actions catch Prisma errors. A foreign-key error returns `This record references data that no longer exists.`; other errors return `Something went wrong saving this record.`. Successful actions call `revalidatePath('/rto')`, after which the client performs a full browser reload.

## 11. Payment And Follow-up Workflow

Opening `Log Payment` initializes status fields from the selected main row, clears prior modal state, and requests `/api/rto/history`. The modal shows payment history ordered newest first and at most the first three follow-ups. Each payment shows date (payment date or created date), amount, payment status, RC status, and transfer status.

The payment form contains amount paid, payment status, RC status, transfer status, next follow-up date, and remark. Client-side checks reject an amount less than or equal to zero when supplied, reject a new amount that makes the sum of displayed payment history exceed the main transfer charges, require a remark, and require a non-past next follow-up date whenever payment status is not `Received`. The status options do not include `Received`, so this conditional currently requires a next follow-up date for all selectable payment statuses. The client does not require an amount when it is null, although the label marks it with `*`.

`logRtoPayment` server-side requires all three statuses and first verifies that the main RTO row exists. It inserts a payment child with the main row's current transfer charges, the submitted amount, the submitted statuses, and the current timestamp as payment date. If a next follow-up date is supplied, it inserts a follow-up child with the submitted remark. It then aggregates all child `amountPaid` values and writes the sum to main `amtPaid`. It finds the latest payment date using payment date, created date, and payment ID ordering, then updates the main payment status, payment date, RC status, transfer status, follow-up date, remark, timestamp, and updater. If no next follow-up date is supplied, main follow-up date and remark are explicitly cleared.

The payment sequence is multiple database operations without an explicit Prisma transaction. A failure after one child write can therefore leave partial state. Successful payment logging revalidates `/rto` and the client reloads the page. Any exception in this action returns the generic `Something went wrong logging this payment.` message.

## 12. Delete Logic

After confirmation, `deleteRto` deletes all payment children, all follow-up children, and then the main RTO row, in that order. The sequence has no explicit transaction. A failure can leave partial cleanup. Successful deletion revalidates `/rto` and removes the selected row from client state; failure displays the returned error through the shared error state.

Because the shared `error` state is only rendered inside the add/edit and payment modals, a delete failure currently has no dedicated visible page-level error banner after the confirmation dialog closes.

## 13. History API And Error Handling

The history API requires a session and returns HTTP 401 with `{ error: 'Unauthorized' }` when absent. A missing or falsy numeric ID returns empty payment and follow-up arrays. Otherwise it queries both child tables in parallel, orders each by `createdDt` descending, converts Decimal values to strings, and returns the JSON payload. It does not verify that the ID belongs to an existing main row, apply an RTO-specific permission, or catch query exceptions. The client loads this API for both View Details and Log Payment, handles non-OK responses with an error message, and always clears the loading state; network/JSON failures still prevent history from being shown.

## 14. Dashboard And Reporting Integrations

The dashboard's `Pending RTO` count is the number of main rows where payment status is `Pending` OR transfer status is `Pending`. It uses the main denormalized row and does not inspect payment history or RC status.

Stock Tracking looks up one RTO row by exact registration using `findFirst`, displays a compact agent/charges/paid/status summary, and links to `/rto?registrationNo=...` when a row exists. Outstanding Payments includes RTO rows using the RTO main-row balance logic and links the registration to the same filter URL. The RTO page itself does not consume a vehicle ID query parameter.

## 15. Validation And Data Normalization Boundaries

The client treats the strings `null`, `na`, and `n/a` as empty for display and filtering. Dates are converted through JavaScript `Date` and formatted as ISO calendar dates for inputs/filters; audit timestamps use `toLocaleString('en-IN')`. Money uses Indian-number formatting and a rupee prefix, with zero/null rendered as `—`.

Server actions do not independently validate email, phone, year, nonnegative charges, payment amount, date ordering, or status membership beyond the required presence of selected statuses. The Prisma schema fields are nullable. The SQL migration `20260827140000_allow_partial_paid_rto` allows `Pending`, `Partially Paid`, and `Fully Paid` in both `rto_agent.payment_status` and `rto_payment_details.payment_status`; RC and transfer constraints remain `Pending`/`Received` and `Pending`/`Done` respectively.

## 16. Known Current Constraints And Edge Cases

- All RTO and inventory rows are loaded before filtering; this may not scale to large datasets.
- Registration duplicate checks are exact and application-level; the schema has no visible unique registration constraint.
- The create flow seeds the first payment child only when the submitted initial amount paid is greater than zero; otherwise payment history can still be empty while main `amtPaid` is zero.
- Normal edits overwrite the main row but do not aggregate child amounts.
- Only the create flow can seed the first payment child from the main modal; later payment history remains in `Log Payment`.
- Payment logging does aggregate children and updates all three main statuses, unlike the legacy behavior recorded in the separate legacy SSOT.
- Payment logging can clear an existing main follow-up and remark when no next follow-up is submitted.
- Child payment/follow-up writes and main updates are not transactional.
- View Details now displays all loaded payment entries and all follow-up remarks; payment rows do not contain a remark column, so payment-related remarks are represented through follow-up history and the latest main-row remark.
- The view and table have no payment-date column in the listing, although it is visible in the view modal and export.
- The table uses legacy customer mobile and related customer name, so contact values can be mixed when snapshots and master data differ.
- The payment client compares cumulative child history with main transfer charges; if history is absent or main charges are null, the computed limit uses zero.
- The payment form's `Received` condition is unreachable with current payment-status options, making the next follow-up effectively required client-side.
- The history API has no invalid-ID error handling and the client has no fetch error handling.
- There is no RTO-specific authorization beyond authentication.
- RTO-specific user/role/function access control is intentionally deferred; this SSOT should be updated once that later access model is implemented.
- Related reporting uses `findFirst`, so multiple RTO records with the same registration are not represented there.
- Inventory deletion is blocked by the foreign-key relationship when an inventory vehicle has a related RTO record; the inventory action reports that the vehicle has related checklist, insurance, loan, RTO, or DSA entries and cannot be deleted.

## 17. Tests Required For This Current Contract

- authenticated and unauthenticated access to `/rto` and the history API
- initial URL filters and reset behavior
- all global and structured filter combinations, inclusive date bounds, and descending-ID display order
- vehicle search, normalized registration lookup, selection, and clearing
- customer/agent search, quick creation, selection, clearing, and picker failures
- client validation and server validation for create/update
- duplicate registration on create and self-edit exception
- create values, zero initial aggregate, relation connections, and audit IDs
- update field overwrite and latest child payment-date precedence
- payment overage, zero/negative/null amount, status, remark, and follow-up validation
- payment child insertion, aggregate sum, main-status synchronization, and follow-up clearing/creation
- history API unauthorized, empty-ID, valid-ID, and database-error behavior
- delete confirmation, child cleanup, partial-failure behavior, and local row removal
- CSV headers, filtered rows, escaping, date/money values, and filenames
- dashboard, Stock Tracking, and Outstanding Payments registration links

## 18. SSOT Rule

This file is the current-state SSOT for the Next.js RTO Management module. Update it whenever the route, UI controls, server actions, Prisma query behavior, integrations, validation, permissions, or error handling changes. Do not use the legacy RTO document as evidence that a capability exists in Next.js; verify the current implementation first.
