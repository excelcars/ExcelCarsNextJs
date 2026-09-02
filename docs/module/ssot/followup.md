# SSOT - Follow-up Module
## Status: Next.js implemented; current-state business logic documented

**Module:** `followup`  
**Project:** `ExcelCarsNextJs`  
**Primary route:** `/followup`  
**Depends on:** inquiry module, `followupInquiry` history table, auth/session, vehicle catalog masters, user table, dashboard links  
**Source of truth for this document:** `D:\projects\ExcelCarsNextJs\app\(dashboard)\followup\page.tsx`, `D:\projects\ExcelCarsNextJs\src\features\followup\FollowupClient.tsx`, `D:\projects\ExcelCarsNextJs\src\features\followup\queries.ts`, `D:\projects\ExcelCarsNextJs\src\features\followup\actions.ts`, `D:\projects\ExcelCarsNextJs\app\api\followup\history\route.ts`, `D:\projects\ExcelCarsNextJs\app\api\followup\export\route.ts`, `D:\projects\ExcelCarsNextJs\src\features\inquiry\actions.ts`, `D:\projects\ExcelCarsNextJs\src\features\dashboard\queries.ts`, `D:\projects\ExcelCarsNextJs\src\components\Layout.tsx`, `D:\projects\ExcelCarsNextJs\middleware.ts`, `D:\projects\ExcelCarsNextJs\auth.ts`

## 1. Purpose
This module is the current follow-up queue for inquiry records in the Next.js admin dashboard.

It owns:

- authenticated follow-up queue listing at `/followup`
- filterable and paginated inquiry follow-up browsing
- inline follow-up logging through a modal
- recent follow-up history lookup from `followupInquiry`
- CSV export of the current filtered follow-up result set
- navigation from follow-up rows into inquiry view and inquiry edit flows

It depends on, but does not own:

- inquiry record creation and editing
- customer linking logic
- vehicle master data
- dashboard metric cards
- user role policy beyond “must be logged in”

## 2. Locked Current Scope
- `/followup` is available inside the authenticated dashboard shell
- route access is protected by `canCurrentUserAccessRoute('/followup')`
- unauthorized route access is redirected to `/dashboard`
- middleware redirects unauthenticated browser access to `/login`
- the page is server-rendered from URL search params, then hydrated into a client filter and modal workflow
- the queue is built from `inquiry` rows, not directly from `followupInquiry`
- the list shows all vehicle-interest rows inline inside each inquiry row
- follow-up logging creates a new `followupInquiry` history row and updates the parent `inquiry`
- quick log modal loads the five most recent follow-up records
- follow-up history view can load the full inquiry history
- CSV export returns all matching rows, not just the current page
- current screen supports browsing and logging only; it does not create or delete inquiries itself
- queue queries can be ownership-restricted through `getInquiryOwnershipScopeForRoute('/followup')`

## 3. Data Ownership

Primary tables read:

- `inquiry`
- `inquiryCarDetails`
- `customer`
- `carVariantMaster`
- `carModelMaster`
- `carMakeMaster`
- `userTable`

Primary tables written by this module directly:

- `followupInquiry`
- `inquiry`

Important indirect writer outside this route:

- `src/features/inquiry/actions.ts` also writes `followupInquiry` when inquiry create/update contains meaningful follow-up state

Minimum `inquiry` fields used here:

- `inquiryId`
- `inquiryNo`
- `dateOfInquiry`
- `website`
- `customerId`
- `customerNameLegacy`
- `mobileno`
- `email`
- `budgetOfCustomer`
- `classification`
- `status`
- `subStatus`
- `followUpDate`
- `visitedDateOfCustomer`
- `remark`
- `createdBy`
- `updatedDt`

Minimum `followupInquiry` fields used here:

- `pkFollowupId`
- `fkInquiryId`
- `followupDate`
- `followupStatus`
- `followupSubStatus`
- `followupClassification`
- `comments`
- `createdDt`
- `createdBy`
- `updatedDt`
- `updatedBy`

## 4. Interface Contracts

Required page surface:

- `GET /followup` via `app/(dashboard)/followup/page.tsx`

Required query functions:

- `listFollowupQueue(filters)`
- `listFollowupsForExport(filters)`
- `getRecentFollowups(inquiryId, limit?)`
- `getUsersForFollowupFilter()`

Required server action:

- `logFollowup(inquiryId, input)`

Required API routes:

- `GET /api/followup/history`
- `GET /api/followup/export`

Required UI actions:

- filter the queue
- reset filters
- open log-follow-up modal
- open inquiry view
- open inquiry edit
- export matching follow-up rows
- move between pages

## 5. Authentication And Access Control
- middleware protects all non-API dashboard routes and redirects unauthenticated users to `/login`
- `/followup` is therefore route-protected at the browser layer
- `/followup` also checks `canCurrentUserAccessRoute('/followup')` and redirects unauthorized users to `/dashboard`
- `GET /api/followup/history` and `GET /api/followup/export` explicitly require `auth()`
- `logFollowup()` checks route authorization through `getAuthorizedUserIdForRoute('/followup')` and ownership access through `canAccessInquiryByOwnership(...)`
- follow-up route/API access is permission-gated through the app access catalog, which is the current RBAC equivalent of legacy function-level authorization
- creator/ownership restriction can be applied through shared inquiry ownership rules

## 6. Default State And URL Contract
Search params supported by the page:

- `search`
- `classification`
- `status`
- `subStatus`
- `website`
- `customerMobile`
- `userId`
- `makeId`
- `modelId`
- `variantId`
- `page`
- `inquiryDateFrom`
- `inquiryDateTo`
- `followUpDateFrom`
- `followUpDateTo`
- `visitedDateFrom`
- `visitedDateTo`

Default values:

- `search = ""`
- `classification = "All"`
- `status = "FollowUp"`
- `subStatus = ""`
- `website = ""`
- `customerMobile = ""`
- `userId = ""`
- `makeId = ""`
- `modelId = ""`
- `variantId = ""`
- `page = 1`
- all date filters default to empty

Result paging:

- fixed page size is `25`
- invalid or missing page values fall back to page `1`

## 7. Filter And Search Behavior

Supported filters in the current UI:

- free-text search
- reached outcome
- customer name
- classification
- status
- sub-status
- source / website
- customer mobile
- inquiry made by user
- make
- model
- variant
- inquiry date from/to
- follow-up date from/to
- visited date from/to

Sub-status source:
- follow-up screen still uses a hardcoded suggestion list in `FollowupClient`
- inquiry screen uses live distinct sub-status values from the database
- this is still a cross-module consistency gap

Search matching:

- `search` matches:
  - `inquiryNo`
  - `mobileno`
  - `email`
  - `customerNameLegacy`
  - linked `customer.custName`
- `subStatus` and `customerMobile` use case-insensitive substring matching
- source filter uses the controlled source master by exact source code, including `Unknown` for historic blank Website values
- classification is exact unless `All`
- status is exact unless `All`
- date ranges are inclusive day-bounded filters
- `userId` is an exact creator filter on `inquiry.createdBy`

Vehicle filters:

- if `variantId` is provided, rows must have some `inquiryCarDetails.fkVariantId = variantId`
- else if `modelId` is provided, rows must have some variant linked to that model
- else if `makeId` is provided, rows must have some variant linked to that make
- vehicle filters rely on normalized variant relations, not legacy free-text make/model/variant fields

Sorting:

- result rows are ordered by:
  - `followUpDate` ascending
  - `inquiryId` ascending

## 8. Queue Rendering Behavior
Each row displays:

- inquiry date
- source
- inquiry made by user display name or user name
- customer name
- mobile
- all linked cars of interest
- budget
- visited date
- classification badge
- status badge
- sub-status
- follow-up date
- latest remark

Important display rules:

- queue rows render all linked `inquiryCarDetails` blocks inline
- exported follow-up rows expand by inquiry car row and follow-up history row combination
- overdue rows are computed client-side as `followUpDate < today`
- overdue rows get a red-tinted background and warning icon
- page header subtitle includes total count, overdue count on the current page, and page count when applicable

## 9. Client Interaction Model
- filters are reflected into the URL
- text/select filters debounce for `400ms`
- date filters debounce for `250ms`
- changing make clears model and variant
- changing model clears variant
- reset returns the queue to:
  - `status = FollowUp`
  - `classification = All`
  - all other filters empty
  - `page = 1`
- route refresh state visually dims the table and shows a loading overlay

Navigation actions:

- `View` pushes to `/inquiry?view={inquiryId}`
- `Edit` pushes to `/inquiry?edit={inquiryId}`

## 10. Follow-up Logging Workflow
The `Log Follow-up` action opens a modal tied to one inquiry row.

Modal context shows:

- inquiry id and inquiry no
- inquiry date
- source
- budget
- visited date
- linked customer id
- customer name
- mobile
- email
- one summarized car of interest
- current follow-up date
- last remark

The modal also loads recent history from `/api/followup/history?inquiryId={id}`.

History behavior:

- latest request wins; stale async responses are ignored through `historyRequestRef`
- loading, empty, and error states are rendered
- at most five history entries are returned
- history list displays:
  - follow-up date
  - follow-up status badge when present
  - then sub-status or comments text

Form fields:

- reached outcome
- status
- classification
- sub-status
  - standard option
  - or explicit `OTHER`
- other sub-status text, required when `OTHER` is selected
- next follow-up date, only when status is `FollowUp`
- comments

Default form state when the modal opens:

- `reachedOutcome = spoke_to_customer`
- `status = FollowUp`
- `classification = current inquiry classification or Warm`
- `subStatus = ""`
- `useOtherSubStatus = false`
- `otherSubStatus = ""`
- `comments = ""`
- `nextFollowUpDate = ""`

## 11. Follow-up Logging Validation
Client validation before submit:

- comments are required
- if `OTHER` is selected, custom sub-status text is required
- if status is `FollowUp`, next follow-up date is required
- if status is `FollowUp`, next follow-up date cannot be before today

Server validation in `logFollowup()`:

- reached outcome is required
- status is required
- if `OTHER` is selected, custom sub-status text is required
- comments are required
- if status is `FollowUp`, next follow-up date is required
- if status is `FollowUp`, next follow-up date cannot be before today
- status, classification, and reached outcome are validated against allowed values

## 12. Log Save Business Logic
`logFollowup(inquiryId, input)` performs two writes:

1. insert `followupInquiry`
2. update parent `inquiry`

History row behavior:

- `followupDate` is `null` when status is `Open`
- `followupDate` stores the selected scheduled next follow-up date when status is `FollowUp`
- `followupDate` is `null` when status is `Closed`
- `contactOutcome` stores the selected reached outcome
- `followupStatus` comes from the modal status
- `followupSubStatus` stores the resolved real sub-status value
  - standard option directly when selected
  - custom text value when `OTHER` is selected
- `followupClassification` comes from the modal classification
- `comments` comes from the modal comments
- `createdDt` remains the real log-entry timestamp
- audit fields use the current logged-in user id when available

Parent inquiry update behavior:

- `status` becomes the modal status
- `subStatus` becomes the modal sub-status
- `classification` becomes the modal classification
- `remark` becomes the modal comments
- `followUpDate` becomes:
  - `null` when status is `Open`
  - selected next date when status is `FollowUp`
  - `null` when status is `Closed`
- `updatedDt` is refreshed
- `updatedByUser` is connected when session user id exists

Post-save refresh:

- revalidates `/followup`
- revalidates `/inquiry`
- the modal closes and the router refreshes the current page

## 13. Other Follow-up History Writers
The `/followup` module is not the only source of `followupInquiry` rows.

Inquiry create behavior:

- `createInquiry()` appends a `followupInquiry` row when the form contains meaningful follow-up state
- history `followupDate` is the selected inquiry `followUpDate` when status is `FollowUp`, else `null`

Inquiry update behavior:

- `updateInquiry()` appends a `followupInquiry` row only when meaningful follow-up state changed
- it compares prior and next values across:
  - status
  - sub-status
  - classification
  - remark
  - follow-up date

Implication:

- current follow-up history is a shared concern between inquiry editing and the follow-up queue modal
- both writers now use the same follow-up-date meaning
- not every parent inquiry update creates history

## 14. Export Behavior
`GET /api/followup/export` requires auth and returns all matching filtered rows using the same `buildFollowupWhere()` logic as the queue, but without pagination.

Client-side CSV columns:

- `Inquiry ID`
- `Inquiry No`
- `Inquiry Date`
- `Source`
- `Inquiry Made By User ID`
- `Linked Customer ID`
- `Customer Name`
- `Mobile`
- `Email`
- `Make`
- `Model`
- `Variant`
- `Car Year`
- `Budget`
- `Classification`
- `Status`
- `Sub-status`
- `Follow-up Date`
- `Visited Date`
- `Remarks`

Current export characteristics:

- export uses the same single summarized car per inquiry as the queue
- follow-up history rows are not expanded into the CSV
- the `Inquiry Made By User ID` header is misleading in the current implementation:
  - exported value is `createdByUser.displayName`
  - else `createdByUser.userName`
  - else numeric `createdBy`
- file name is generated from status/classification and current date

## 15. Dashboard And Navigation Integration
- sidebar navigation exposes `Follow-up` under Operations
- dashboard links into follow-up via:
  - `/followup?status=FollowUp`
  - `/followup?status=FollowUp&followUpDateTo={yesterday}`
- dashboard summary functions provide:
  - pending follow-up count = inquiries where `status = FollowUp`
  - overdue follow-up count = inquiries where `status = FollowUp` and `followUpDate < startOfToday()`
- dashboard pending follow-up preview lists the next 8 inquiries ordered by `followUpDate asc, inquiryId asc`

Current dashboard integration is narrower than legacy:

- there are no dedicated follow-up drill-down conditions for fresh leads, appointment fixed, upcoming, closed, or all leads

## 16. Error Handling
- history modal shows a recoverable inline error if `/api/followup/history` fails or returns invalid JSON
- export shows a recoverable inline error if `/api/followup/export` fails
- `logFollowup()` returns a generic failure message on write errors
- the UI does not expose row-level retry or optimistic recovery beyond reopening the modal and saving again

## 17. Known Current Constraints
- restricted users are limited to their owned inquiries; dashboard Own drill-down presets remain future dashboard work
- queue paginates at 25 rows while export returns all matching rows
- catalog dropdowns and text Make/Model/Variant filters are both supported; text filters cover historic records without normalized vehicle links
- quick log shows recent history, while the dedicated inquiry/follow-up history view shows the full timeline
- current client and server validation share the same required outcome, status, classification, remark, custom `OTHER` sub-status, and next-date rules
- historic blank Website values are classified as `Unknown`; `Other` remains for a user-selected source that needs a detail

## 18. Tests Required
- unauthenticated route access is redirected to `/login`
- unauthenticated `/api/followup/history` and `/api/followup/export` return `401`
- queue defaults to `status = FollowUp` and page size `25`
- status filter supports `Open`, `FollowUp`, `Closed`, and `All`
- all filters map correctly into Prisma where clauses
- make/model/variant filters respect variant > model > make priority
- text make/model/variant filters match both historic text and normalized vehicle master values on the same inquiry-car row
- export returns all matching rows, not only the current page
- log modal loads recent history for the selected inquiry
- client blocks follow-up save with missing comments
- client blocks missing follow-up date when status is `FollowUp`
- server blocks missing status
- server blocks missing follow-up date for `FollowUp`
- save inserts a `followupInquiry` row and updates parent inquiry fields
- closing an inquiry from the modal nulls the parent `followUpDate`
- inquiry create/update append follow-up history only under the documented conditions
- source-master codes are unique and `Reference` / `Other` require a detail value

## 19. SSOT Rule
Any change to follow-up filtering, follow-up history writing, dashboard entry links, creator-based access behavior, or the “single visible car per inquiry” presentation rule must update this SSOT in the same change.
