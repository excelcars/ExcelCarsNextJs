# SSOT - Stock Tracking Module
## Status: Next.js implemented; current-state behavior documented

> Update 2026-10-01: `/reports/tracking` now uses URL-backed, server-side filters and pagination; supports authorized XLSX summary and vehicle-detail exports; and exposes the canonical vehicle detail route `/reports/tracking/[inventoryId]`. The API enforces `Stock_Tracking_Report` access and preserves multiple downstream records per vehicle.

**Module:** `reports/tracking`  
**Project:** `ExcelCarsNextJs`  
**Depends On:** authenticated dashboard session, shared dashboard navigation/layout, Prisma read access to inventory/checklist/insurance/RTO/loan tables, downstream `rto` / `insurance` / `loan` modules for drill-through links  
**Source of truth for this document:** `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\reports\tracking\page.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\queries.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\api\reports\tracking-details\route.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\components\ui.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\components\Layout.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\layout.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\middleware.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\auth.config.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\prisma\schema.prisma`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\rto\page.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\insurance\page.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\loan\page.tsx`

## 1. Purpose
This module presents a stock-centered tracking view that lets users start from inventory rows and inspect linked downstream records for the same vehicle registration number.

It owns:
- the current dashboard page at `/reports/tracking`
- server-side loading of stock rows from `inventoryManagement`
- client-side free-text filtering of the loaded stock list
- modal-based drill-down into linked:
  - checklist/documents
  - insurance
  - RTO
  - loan
- authenticated detail retrieval through `/api/reports/tracking-details`
- drill-through links from the detail modal into downstream operational pages

It does not own:
- editing inventory from the report page
- creating or editing checklist records directly inside the report page
- creating or editing insurance records directly inside the report page
- creating or editing RTO records directly inside the report page
- creating or editing loan records directly inside the report page
- export
- pagination
- API-level duplication of the report route permission check

## 2. Locked Current Scope
- the page is served at `/reports/tracking`
- the page is inside the authenticated dashboard route group
- server rendering loads the full stock list before client filtering
- the UI supports:
  - free-text search
  - row-level `View` action
  - modal detail inspection
  - drill-through navigation into:
    - `/insurance`
    - `/rto`
    - `/loan`
- the UI is read-only from the report surface:
  - no inline edits
  - no save action
  - no create action
  - no delete action
- no pagination is implemented
- no server-side report filter contract is implemented
- no report export is implemented

## 3. Data Ownership

Primary read sources used directly by this module:
- `inventoryManagement`
- `carVariantMaster`
- `carMakeMaster`
- `carModelMaster`
- `checkListDocMain`
- `checklistDocDetails`
- `insuranceMain`
- `rtoAgent`
- `loanManagement`
- `partnerMaster`

Minimum `inventoryManagement` fields used:
- `inventoryId`
- `registrationNo`
- `sku`
- `year`
- `status`
- `fkVariantId` relation path via `carVariantMaster`

Minimum `carVariantMaster` relation fields used:
- `variant`
- `carMakeMaster.make`
- `carModelMaster.model`

Minimum `checkListDocMain` fields used in detail loading:
- `documentId`
- `registrationNo`
- relation `checklistDocDetails`

Minimum `checklistDocDetails` fields used:
- `documentName`
- `applicable`
- `received`
- `originalCopy`

Minimum `insuranceMain` fields used:
- `insuranceMainId`
- `carRegistrationNo`
- `payoutAmount`
- `totalAmountReceived`
- `payoutPaymentStatus`
- `policyStatus`
- relation `partnerMaster.name`

Minimum `rtoAgent` fields used:
- `rtoAgentMainId`
- `carRegistrationNo`
- `transferCharges`
- `amtPaid`
- `paymentStatus`
- `rcStatus`
- `transferStatus`
- relation `partnerMaster.name`

Minimum `loanManagement` fields used:
- `loanManagementId`
- `registrationNo`
- `bankName`
- `payoutAmount`
- `totalAmountReceived`
- `paymentStatus`
- relation `partnerMaster.name`

Current page row shape:
- `inventoryId`
- `registrationNo`
- `sku`
- `year`
- `status`
- `carVariantMaster`

Current row-shape note:
- `sku` is loaded and passed to the client but is not currently rendered, searched, or used in any action

Current detail payload shape:
- `checklist`
- `insurance`
- `rto`
- `loan`

## 4. Interface Contracts

Required page surface:
- `GET /reports/tracking` through `app/(dashboard)/reports/tracking/page.tsx`

Required query functions:
- `listTrackingStock()`
- `getVehicleDetails(registrationNo)`

Required client surface:
- `TrackingClient`

Required API route:
- `GET /api/reports/tracking-details?registrationNo=...`

Required UI behaviors:
- load stock rows on initial page render
- show page title and subtitle
- search rows by registration number, make, or model
- show table rows with a `View` action
- open a modal for the selected row
- fetch detail JSON lazily when a row is opened
- show checklist, insurance, RTO, and loan sections in the modal
- show downstream edit links when a downstream record exists
- show empty state when no stock rows match the current search

No current contracts exist for:
- report query-string filter state
- report server actions
- report mutation endpoints
- report export routes
- report pagination endpoints

## 5. Business Rules
- authenticated session is required to reach the dashboard route group
- the detail API route also enforces its own session check because middleware excludes `/api/*`
- the page requires `Stock_Tracking_Report` through `canCurrentUserAccessRoute('/reports/tracking')`
- the page loads all inventory rows, not only rows with downstream linked records
- the search box filters only the already loaded client dataset
- the search is case-insensitive
- the search uses substring `includes` matching
- the search checks:
  - `registrationNo`
  - make
  - model
- variant is displayed but is not part of the current search match logic
- the `View` action is rendered for every row
- if a row has no `registrationNo`, `View` does nothing because detail loading returns early
- detail loading is lazy and happens only after the user clicks `View`
- each downstream area currently returns at most one record because the data loader uses `findFirst`
- decimal fields returned by Prisma are stringified before JSON response for safe serialization
- display cleanup treats literal strings `null`, `na`, and `n/a` as empty for vehicle naming
- money formatting uses `Number(...).toLocaleString('en-IN')`
- money formatting treats falsy values as empty, so `0`, `'0'`, and `null` all render as `—` in the current detail UI

## 6. Current Relationship Model
- one report page reads many `inventoryManagement` rows
- one visible table row corresponds to exactly one inventory record
- one inventory row may have one related `carVariantMaster`
- one `carVariantMaster` may have one related `carMakeMaster`
- one `carVariantMaster` may have one related `carModelMaster`
- one opened detail request may resolve:
  - one checklist main record
  - one insurance record
  - one RTO record
  - one loan record
- the page does not persist any report snapshot or derived tracking table
- the page does not create or update any linked operational record

## 7. Query And Data-Loading Logic

### 7.1 Server page-load flow
- `TrackingReportPage()` calls `listTrackingStock()` during server rendering
- `listTrackingStock()` executes `prisma.inventoryManagement.findMany(...)`
- the query includes:
  - `carVariantMaster`
  - nested `carMakeMaster`
  - nested `carModelMaster`
- the query orders rows by `inventoryId` descending
- `page.tsx` maps the Prisma rows down to the client row shape and passes them to `TrackingClient` as `initialData`

### 7.2 Main stock query rules
- there is no `where` clause in `listTrackingStock()`
- all inventory rows are included
- there is no status-based filter
- there is no registration-number filter at the database layer
- there is no make/model filter at the database layer
- there is no pagination or limit

### 7.3 Detail API flow
- `GET /api/reports/tracking-details` calls `auth()`
- if the session is missing:
  - returns `401`
  - payload: `{ error: 'Unauthorized' }`
- it reads `registrationNo` from the query string
- if `registrationNo` is missing:
  - returns `200`
  - payload: `{ checklist: null, insurance: null, rto: null, loan: null }`
- otherwise it calls `getVehicleDetails(registrationNo)` and returns the result as JSON

### 7.4 Detail query rules
`getVehicleDetails(registrationNo)` runs four Prisma lookups in parallel using `Promise.all`.

Checklist lookup:
- `prisma.checkListDocMain.findFirst(...)`
- `where: { registrationNo }`
- includes `checklistDocDetails`
- returns only the first matching checklist main record

Insurance lookup:
- `prisma.insuranceMain.findFirst(...)`
- `where: { carRegistrationNo: registrationNo }`
- includes `partnerMaster`
- returns only the first matching insurance record

RTO lookup:
- `prisma.rtoAgent.findFirst(...)`
- `where: { carRegistrationNo: registrationNo }`
- includes `partnerMaster`
- returns only the first matching RTO record

Loan lookup:
- `prisma.loanManagement.findFirst(...)`
- `where: { registrationNo }`
- includes `partnerMaster`
- returns only the first matching loan record

### 7.5 Detail payload normalization rules
Checklist:
- returned as the Prisma object plus:
  - `documentId`
  - `checklistDocDetails`
- if no record exists, returns `null`

Insurance:
- returned as the Prisma object plus decimal stringification for:
  - `insurancePremium`
  - `oDPremium`
  - `payoutAmount`
  - `totalAmountReceived`
- if no record exists, returns `null`

RTO:
- returned as the Prisma object plus decimal stringification for:
  - `transferCharges`
  - `amtPaid`
- if no record exists, returns `null`

Loan:
- returned as the Prisma object plus decimal stringification for:
  - `loanAmount`
  - `payoutAmount`
  - `totalAmountReceived`
- if no record exists, returns `null`

## 8. Current UI And User Interactions

### 8.1 Navigation
- the report is linked in the dashboard sidebar under `Reports`
- sidebar label: `Stock Tracking`
- active route highlighting is handled by the shared `Layout` component

### 8.2 Page header
- title: `Stock Tracking`
- subtitle shows:
  - filtered vehicle count
  - static instructional text: `click a row to see linked checklist, insurance, RTO & loan records`
- there is no header action button

### 8.3 Search/filter behavior
Free-text search:
- implemented with the shared `SearchBar`
- placeholder: `Reg no, make, model...`
- local state variable: `search`
- case-insensitive
- matches via substring `includes`
- checks:
  - `registrationNo`
  - make
  - model

Not implemented:
- dedicated make filter
- dedicated model filter
- variant filter
- colour filter
- fuel-type filter
- status filter
- year filter
- customer filter
- pagination
- sorting controls
- URL-backed filters

### 8.4 Table/listing behavior
Displayed columns:
- `Reg No`
- `Vehicle`
- `Year`
- `Status`
- `Actions`

Row rendering rules:
- `Reg No` is plain text, not a link
- `Reg No` falls back to `—` when null
- `Vehicle` is assembled from:
  - cleaned make
  - cleaned model
  - cleaned variant
- `Vehicle` suppresses junk strings:
  - `null`
  - `na`
  - `n/a`
- `Year` falls back to `—` when null
- `Status` falls back to `—` when null
- `Status` uses the shared `Badge` component
- the `View` button always appears in the `Actions` column
- rows have a hover background style, but there is no row-click action; only the `View` button triggers detail loading
- `sku` is not shown anywhere in the table even though it is present in `initialData`

Empty-state behavior:
- the shared `Table` component shows `No records found` when no filtered rows remain

### 8.5 Detail modal behavior
Modal open rules:
- modal open state is `!!detailRow`
- clicking `View` with a valid `registrationNo`:
  - sets `detailRow`
  - clears prior `details`
  - sets `loading = true`
  - fetches detail JSON
  - sets `details`
  - sets `loading = false`
- clicking `View` with no `registrationNo` returns immediately and does not open the modal
- closing the modal clears `detailRow` only; `details` is not cleared on close and is instead reset the next time `openDetails()` runs

Modal close rules:
- closing the modal clears `detailRow`
- the shared `Modal` also supports close by:
  - close button click
  - outside click
  - `Escape` key

Modal title:
- `Tracking — {registrationNo}`

Loading state:
- while fetching, the modal body shows `Loading...`

No custom error state:
- if the request fails, there is no explicit inline error UI in this component
- because `openDetails()` has no `try/catch/finally`, a rejected fetch or JSON parse error can leave `loading` stuck at `true`
- because `openDetails()` does not check `res.ok`, any non-OK JSON payload is still passed into `details` state

### 8.6 Detail sections
Checklist / Documents:
- section title: `Checklist / Documents`
- if a checklist record exists:
  - renders each `checklistDocDetails` row
  - shows:
    - `documentName`
    - `Applicable`
    - `Received`
- `originalCopy` is present in the payload but not rendered
- if the checklist record exists but has zero detail rows, shows `No documents logged.`
- if no checklist record exists, shows `No checklist record.`
- no checklist drill-through link exists

Insurance:
- section title: `Insurance`
- if a record exists, shows:
  - `Agent`
  - `Payout`
  - `Received`
  - combined `Status` as `payoutPaymentStatus / policyStatus`
- if no record exists, shows `No insurance record.`
- when a record exists and the selected row has a registration number, shows:
  - link label: `Edit Insurance →`
  - href: `/insurance?search={registrationNo}`

RTO:
- section title: `RTO`
- if a record exists, shows:
  - `Agent`
  - `Charges`
  - `Paid`
  - combined `Status` as `paymentStatus / rcStatus / transferStatus`
- if no record exists, shows `No RTO record.`
- when a record exists and the selected row has a registration number, shows:
  - link label: `Edit RTO Job →`
  - href: `/rto?registrationNo={registrationNo}`

Loan:
- section title: `Loan`
- if a record exists, shows:
  - `Bank`
  - `Payout`
  - `Received`
  - `Status`
- bank display priority:
  - `bankName`
  - `partnerMaster.name`
  - `—`
- if no record exists, shows `No loan record.`
- when a record exists and the selected row has a registration number, shows:
  - link label: `Edit Loan →`
  - href: `/loan?search={registrationNo}`

### 8.7 Drill-through link compatibility
Verified destination page contracts:
- `/rto` accepts:
  - `registrationNo`
  - `search`
- `/insurance` accepts:
  - `search`
  - additional own filters such as `page`, `fromDate`, `toDate`
- `/loan` accepts:
  - `search`

This report passes only registration-driven search context, not downstream row IDs.

## 9. Validation And Error Handling

Validation:
- there is no form submission in this module
- there are no user-editable report forms
- the only input is the search box, which has no validation constraints beyond string handling

Error handling:
- `listTrackingStock()` does not wrap Prisma calls in a local `try/catch`
- `TrackingReportPage()` does not wrap the loader in a local `try/catch`
- `getVehicleDetails()` does not wrap Prisma calls in a local `try/catch`
- `TrackingClient` does not handle non-OK fetch responses explicitly
- `openDetails()` always calls `res.json()` without checking `res.ok`
- network or server failures will bubble into Next.js error handling or client runtime failure behavior

Defensive behavior present:
- null `registrationNo`, `year`, and `status` values render safely in the list
- detail API returns all-null detail sections when `registrationNo` is absent
- decimal values are stringified before JSON response
- money rendering falls back to `—` for falsy values

Current failure-mode note:
- if `/api/reports/tracking-details` returns a non-success JSON shape such as `{ error: 'Unauthorized' }`, the client does not branch on that contract explicitly

## 10. Permissions And Access Control
- all non-API dashboard routes are protected by `middleware.ts`
- unauthenticated users are redirected to `/login`
- authenticated users visiting `/login` are redirected to `/dashboard`
- the dashboard layout also checks `auth()` server-side and redirects to `/login` when the session is missing
- session uses NextAuth JWT strategy
- session includes:
  - `user.id`
  - `user.username`
  - `user.roleName`
- the detail API route performs its own `auth()` check and returns `401` when unauthorized

Current report-specific access reality:
- the dashboard route group requires an authenticated session
- the page requires the `Stock_Tracking_Report` access-catalog function through `canCurrentUserAccessRoute('/reports/tracking')`; unauthorized users are redirected to `/dashboard`
- the detail API currently requires an authenticated session but does not repeat the page-level access-function check

## 11. Known Current Constraints
- there is no dedicated report export
- all inventory rows are loaded before filtering, which may not scale well as inventory grows
- there is no pagination or virtualized rendering
- there are no dedicated report filters beyond one free-text search box
- `sku` is loaded but unused in the current report UI
- variant is displayed but not searchable
- checklist, insurance, RTO, and loan detail loading returns only the first matching record in each domain
- checklist `originalCopy` is not shown in the UI even though it is in the payload
- there is no checklist drill-through link
- the list does not show many stock-tracking attributes that exist in the underlying tables, such as:
  - colour
  - fuel type
  - ownership
  - tax
  - kms driven
  - price
- there is no explicit client error UI for detail fetch failures
- failed detail fetches are not handled with `try/finally`, so loading state recovery is not guaranteed
- zero-valued monetary fields display as `—` rather than `₹0`
- the detail API does not repeat the page-level `Stock_Tracking_Report` permission check

## 12. Tests Required
- unauthenticated access to `/reports/tracking` redirects to `/login`
- authenticated access renders the page successfully
- unauthenticated access to `/api/reports/tracking-details` returns `401`
- `listTrackingStock()` returns inventory rows ordered by descending `inventoryId`
- free-text search matches registration number case-insensitively
- free-text search matches make case-insensitively
- free-text search matches model case-insensitively
- variant text is displayed but does not affect filtering
- junk values `null`, `na`, and `n/a` are suppressed in the vehicle display
- clicking `View` on a row with a registration number opens the modal and loads details
- clicking `View` on a row without a registration number does not open the modal
- closing and reopening the modal resets detail payload through `openDetails()`
- missing `registrationNo` in the API returns all detail sections as `null`
- checklist detail rows render correctly when present
- checklist zero-detail case shows `No documents logged.`
- missing checklist record shows `No checklist record.`
- insurance section shows correct link to `/insurance?search=...`
- RTO section shows correct link to `/rto?registrationNo=...`
- loan section shows correct link to `/loan?search=...`
- decimal values in the API payload are safely stringified
- zero-valued monetary fields are rendered as `—` in the current detail UI
- detail fetch failures are either handled intentionally later or recorded as a known current limitation

## 13. SSOT Rule
Stock Tracking in the current Next.js app is an authenticated, read-only, server-loaded and client-filtered stock report with lazy modal detail retrieval for checklist, insurance, RTO, and loan data. Any change to:
- stock row loading scope
- search semantics
- detail payload shape
- first-record vs multi-record detail behavior
- drill-through navigation
- access-control behavior
- modal section content

must update this SSOT in the same change.
