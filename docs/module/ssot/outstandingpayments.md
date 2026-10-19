# SSOT - Outstanding Payments Module
## Status: Next.js implemented; current-state behavior documented

**Module:** `reports/outstanding`  
**Project:** `ExcelCarsNextJs`  
**Depends On:** authenticated dashboard session, shared dashboard navigation/layout, Prisma read access to payout source tables, downstream `rto` / `insurance` / `loan` modules for drill-through links  
**Source of truth for this document:** `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\reports\outstanding\page.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\queries.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\OutstandingClient.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\api\reports\outstanding\export\route.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\api\reports\outstanding\registrations\route.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\api\customers\search\route.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\components\ui.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\layout.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\middleware.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\auth.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\auth.config.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\prisma\schema.prisma`

## 1. Purpose
This module presents a consolidated dashboard report of partner-payment balances across operational payout flows.

It owns:
- the dashboard page at `/reports/outstanding`
- consolidated read-only reporting for:
  - `RTO`
  - `Insurance`
  - `Loan`
- server-side filtering by:
  - customer name
  - customer mobile
  - car registration number
  - payout type
  - payment status
- URL-backed filter state
- paginated report rendering
- visible total balance for the current filtered result set
- CSV export of the current filtered result set
- customer autocomplete
- registration autocomplete
- drill-through links from report rows into the corresponding operational modules

It does not own:
- editing or settling RTO payouts
- editing or settling insurance payouts
- editing or settling loan payouts
- saved filters, report presets, or report snapshots

## 2. Locked Current Scope
- the page is served at `/reports/outstanding`
- the page is inside the authenticated dashboard route group
- current implementation supports only:
  - `RTO`
  - `Insurance`
  - `Loan`
- the report is read-only
- the UI supports:
  - separate customer-name filter
  - separate customer-mobile filter
  - separate registration-number filter
  - type filter
  - payment-status filter
  - customer autocomplete
  - registration autocomplete
  - CSV export
  - row drill-through navigation
  - pagination
  - visible loading state during route-refresh filtering/pagination
- the page uses URL search params as its report-state contract

Not in current locked scope:
- `Financial`
- `DSA`
- additional report behavior beyond the `Outstanding_Payments_Report` route permission

## 3. Data Ownership

Primary read sources used directly by this module:
- `rtoAgent`
- `insuranceMain`
- `loanManagement`
- related `customer` rows

Current report row shape:
- `key`
- `type`
- `paymentStatus`
- `followupDate`
- `remark`
- `registrationNo`
- `customerName`
- `customerMobile`
- `customerEmail`
- `paymentStatus`
- `totalAmount`
- `percentageOfPayout`
- `payoutAmount`
- `amountPaid`
- `balance`

## 4. Interface Contracts

Required page surface:
- `GET /reports/outstanding` through `app/(dashboard)/reports/outstanding/page.tsx`

Current query-string contract:
- `customerName`
- `customerMobile`
- `registrationNo`
- `type`
- `page`
- `pageSize`

Required query functions:
- `listOutstanding(filters)`
- `listOutstandingForExport(filters)`

Required API routes:
- `GET /api/reports/outstanding/export`
- `GET /api/reports/outstanding/registrations`
- `GET /api/customers/search`

Required client surface:
- `OutstandingClient`

Required UI behaviors:
- load report rows on initial page render
- preserve filters in URL/search params
- filter rows by:
  - customer name
  - customer mobile
  - registration number
  - type:
    - `All`
    - `RTO`
    - `Insurance`
    - `Loan`
- export the current filtered result set as CSV
- show a grand-total summary row in the CSV export
- show a visible total-balance row in the table
- drill through from registration number to:
  - `/rto?registrationNo=...`
  - `/insurance?search=...`
  - `/loan?search=...`

## 5. Business Rules
- authenticated session is required to reach the dashboard route group
- the page requires `Outstanding_Payments_Report` through `canCurrentUserAccessRoute('/reports/outstanding')`
- the report includes all matching rows:
  - positive-balance rows
  - zero-balance rows
  - negative-balance rows
  - paid rows
  - fully paid rows
- customer display name resolves in this priority order:
  - linked `customer.custName`
  - legacy denormalized customer name field on the source row
- customer mobile resolves in this priority order:
  - linked `customer.custMobile`
  - legacy denormalized customer mobile field on the source row
- customer email resolves in this priority order:
  - linked `customer.custEmail`
  - legacy denormalized customer email field on the source row
- row balance formulas are source-specific:
  - `RTO: transferCharges - amtPaid`
  - `Insurance: payoutAmount - totalAmountReceived`
  - `Loan: payoutAmount - totalAmountReceived`
- `Total Amount` is source-specific:
  - `RTO: transferCharges`
  - `Insurance: oDPremium`
  - `Loan: loanAmount`
- `% of Payout` is source-specific:
  - `RTO: null / not populated`
  - `Insurance: payoutPercentageOdPremium`
  - `Loan: percentagePayoutAmount`
- `Amount Paid` is source-specific:
  - `RTO: amtPaid`
  - `Insurance: totalAmountReceived`
  - `Loan: totalAmountReceived`
- `RTO` displays the payout amount using the same monetary value as `transferCharges`
- the UI clarifies this in the payout cell with a muted `Transfer Charges` note for `RTO` rows
- filtered totals are computed across the full filtered result set, not only the visible page slice

## 6. Query And Calculation Logic

### 6.1 Server data-loading flow
- `page.tsx` reads `searchParams`
- `page.tsx` calls `listOutstanding(...)`
- the query layer normalizes `RTO`, `Insurance`, and `Loan` rows into one shared result shape
- the query layer returns:
  - paged rows
  - filtered total row count
  - filtered total balance
  - page metadata

### 6.2 Current filter semantics
- customer, mobile, and registration filters use case-insensitive substring matching
- `type` and `paymentStatus` use exact matching
- current filters are:
  - `customerName`
  - `customerMobile`
  - `registrationNo`
  - `type`
  - `paymentStatus` (exact match; `All`, `Pending`, `Partial`, `Paid`, `Partially Paid`, or `Fully Paid`)

### 6.3 Row normalization rules
RTO:
- `key = rto-{rtoAgentMainId}`
- `type = 'RTO'`
- `registrationNo = carRegistrationNo`
- `customerName = customer?.custName ?? customerNameLegacy`
- `customerMobile = customer?.custMobile ?? customerMobLegacy`
- `customerEmail = customer?.custEmail ?? customerEmailLegacy`
- `paymentStatus = paymentStatus`
- `totalAmount = transferCharges`
- `percentageOfPayout = null`
- `payoutAmount = transferCharges`
- `amountPaid = amtPaid`
- `balance = payoutAmount - amountPaid`

Insurance:
- `key = insurance-{insuranceMainId}`
- `type = 'Insurance'`
- `registrationNo = carRegistrationNo`
- `customerName = customer?.custName ?? customerNameLegacy`
- `customerMobile = customer?.custMobile ?? customerMobileLegacy`
- `customerEmail = customer?.custEmail ?? customerEmailLegacy`
- `paymentStatus = payoutPaymentStatus`
- `totalAmount = oDPremium`
- `percentageOfPayout = payoutPercentageOdPremium`
- `payoutAmount = payoutAmount`
- `amountPaid = totalAmountReceived`
- `balance = payoutAmount - amountPaid`

Loan:
- `key = loan-{loanManagementId}`
- `type = 'Loan'`
- `registrationNo = registrationNo`
- `customerName = customer?.custName ?? customerNameLegacy`
- `customerMobile = customer?.custMobile ?? customerMobileLegacy`
- `customerEmail = customer?.custEmail ?? customerEmailLegacy`
- `paymentStatus = paymentStatus`
- `totalAmount = loanAmount`
- `percentageOfPayout = percentagePayoutAmount`
- `payoutAmount = payoutAmount`
- `amountPaid = totalAmountReceived`
- `balance = payoutAmount - amountPaid`

### 6.4 Sorting and pagination rules
- rows are ordered by:
  - `balance DESC`
  - `type ASC`
  - `registrationNo ASC NULLS LAST`
  - `customerName ASC NULLS LAST`
  - `key ASC`
- the report supports page-size options:
  - `25`
  - `50`
  - `100`

### 6.5 Visible total rules
- the total row shown below the current page uses the full filtered total balance returned by the server
- the total is not limited to the visible page rows only
- negative balances reduce the grand total

## 7. Current UI And User Interactions

### 7.1 Page header
- title: `Outstanding Payments`
- subtitle shows:
  - filtered row count
  - current page
  - page count
  - page size
- header action:
  - one `Export` button

### 7.2 Filters
Current visible filters:
- `Customer Name`
- `Customer Mobile`
- `Car Registration No`
- `Type`
- `Payment Status`
- `Next Follow-up`
- `Remark`
- `Rows Per Page`

Autocomplete behaviors:
- customer autocomplete uses the authenticated customer search route
- registration autocomplete searches matching RTO, Insurance, and Loan source registrations

### 7.3 Table/listing behavior
Displayed columns:
- `Sr. No.`
- `Type`
- `Customer Name`
- `Customer Mobile`
- `Customer Email`
- `Car Registration No`
- `Payment Status`
- `Next Follow-up`
- `Remark`
- `Total Amount`
- `% of Payout`
- `Payout Amount`
- `Amount Paid`
- `Bal Amt`

Row rendering rules:
- `Type` is shown as a shared `Badge`
- `Payment Status` is shown as a `Badge` when present
- null display values fall back to `—`
- remarks are truncated in the table and included in full in CSV export
- registration is a drill-through link when present
- money values are formatted as INR
- positive balances render in red
- negative balances render in green
- zero balances render in neutral gray text

### 7.4 Loading behavior
- route-refresh actions such as apply filter, clear filter, page change, and page-size change use a visible client-side loading state
- controls are disabled while the route transition is pending
- the report body dims and shows `Loading outstanding payment results...`

### 7.5 Export behavior
- export is server-generated through `/api/reports/outstanding/export`
- export uses the same filter basis as the visible report
- export filename is `outstanding-payments.csv`
- export column order matches the visible table column order
- export includes a final `Grand Total` row

## 8. Validation And Error Handling
- unauthenticated export and autocomplete routes return `401 Unauthorized`
- authenticated callers without `Outstanding_Payments_Report` receive `403 Forbidden` from the export and report-registration autocomplete routes
- the shared customer autocomplete route accepts `Outstanding_Payments_Report` as an authorized caller
- null numeric values are normalized to `0` for calculation
- null text values are normalized safely for display
- export route returns a JSON error payload when unauthorized
- client export displays an error banner if the export request fails
- initial page/database failures still bubble to Next.js route error handling

## 9. Permissions And Access Control
- all non-API dashboard routes are protected by `middleware.ts`
- unauthenticated users are redirected to `/login`
- the dashboard layout also checks `auth()` server-side
- session includes:
  - `user.id`
  - `user.username`
  - `user.roleName`

Current report-specific access reality:
- the dashboard route group requires an authenticated session
- the page requires the `Outstanding_Payments_Report` access-catalog function through `canCurrentUserAccessRoute('/reports/outstanding')`; unauthorized users are redirected to `/dashboard`
- the export and report-registration autocomplete APIs require the same `Outstanding_Payments_Report` route access as the page; the shared customer autocomplete route also recognizes that grant

## 10. Known Current Constraints
- no explicit type-scope expansion beyond `RTO`, `Insurance`, and `Loan`
- no saved report presets or snapshots

## 11. Tests Required
- unauthenticated access to `/reports/outstanding` redirects to `/login`
- authenticated access renders the page successfully
- `listOutstanding()` returns normalized rows across `RTO`, `Insurance`, and `Loan`
- `RTO` balance equals `transferCharges - amtPaid`
- `Insurance` balance equals `payoutAmount - totalAmountReceived`
- `Loan` balance equals `payoutAmount - totalAmountReceived`
- paid rows remain included
- zero-balance rows remain included
- negative-balance rows remain included
- customer-name filter works server-side
- customer-mobile filter works server-side
- registration filter works server-side
- type filter works server-side
- payment-status filter works server-side
- URL-backed filters restore state on reload
- export uses the current filtered result set
- export includes the grand total row
- customer autocomplete returns matching customer suggestions
- registration autocomplete returns matching registration suggestions
- drill-through links open the correct destination path for each type

## 12. SSOT Rule
Outstanding Payments in the current Next.js app is an authenticated, read-only, URL-backed, server-filtered, paginated report over `RTO`, `Insurance`, and `Loan` payout data. Any change to:
- source-table scope
- filter semantics
- zero-balance inclusion rules
- export contract
- drill-through navigation
- role-based access behavior

must update this SSOT in the same change.
