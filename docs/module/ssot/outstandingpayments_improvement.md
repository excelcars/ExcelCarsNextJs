# SSOT - Outstanding Payments Improvements
## Status: Gap analysis for current Next.js module vs existing system; not yet merged into current-state SSOT

**Module:** `reports/outstanding`  
**Project:** `ExcelCarsNextJs`  
**Base current-state SSOT:** `C:\KhizarShaikh\Project\ExcelCarsNextJs\docs\module\ssot\outstandingpayments.md`  
**Existing-system reference:** `C:\KhizarShaikh\Project\ExcelCarsNextJs\docs\module\existing_ssot\outstandingpayments.md`  
**Purpose of this file:** Track missing functionality and business logic separately until explicitly approved for implementation and SSOT merge.

## 1. Scope Of This Improvement Document
This document lists functionality and business logic that is present, implied, or evidenced in the legacy/existing Outstanding Payment Report module but is not fully represented in the current Next.js implementation.

This document does not change the current-state SSOT.

Until explicit approval is given:
- `outstandingpayments.md` remains the current implemented truth
- this file remains a separate improvement/gap document
- no gap listed here should be treated as already implemented

## 2. Missing Items

### 2.1 Separate Customer Filter With Legacy Semantics
1. Feature / Business Logic Name  
   Separate customer filter with exact-match legacy search behavior

2. Existing System Behavior  
   The legacy report accepted a dedicated customer-name filter through `Form_Customer_Name`. The surviving model applied exact-match filtering in each source query branch:
   - `RTO.Customer_Name == Form_Customer_Name`
   - `Insurance.Customer_Name == Form_Customer_Name`
   - `Loan.Customer_Name == Form_Customer_Name`

3. Current Next.js Status  
   The current page has only one shared free-text search box. It performs client-side case-insensitive substring matching across both registration number and customer name.

4. Missing Functionality or Logic  
   - no dedicated customer filter control
   - no exact-match customer filter semantics
   - no server-side customer filter in data loading

5. Required Improvement  
   - add a dedicated customer filter input
   - decide whether to preserve exact-match legacy behavior or intentionally replace it
   - if preserving legacy semantics, move customer filtering into the server-side query layer

6. Relevant Existing Code Location, where possible  
   - Legacy: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Outstanding_Payment_Report\Outstanding_Payment_Report.cs`
   - Current: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\OutstandingClient.tsx`
   - Current: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\queries.ts`

7. Priority / Impact, where possible  
   High. This changes how users target a specific customer and is part of the original report contract.

### 2.2 Separate Registration Filter With Legacy Semantics
1. Feature / Business Logic Name  
   Separate registration-number filter with exact-match legacy behavior

2. Existing System Behavior  
   The legacy report accepted a dedicated registration-number filter through `Form_Car_Registration_No` and applied exact-match filtering:
   - `RTO.Car_Registration_No == Form_Car_Registration_No`
   - `Insurance.Car_Registration_No == Form_Car_Registration_No`
   - `Loan.Registration_No == Form_Car_Registration_No`

3. Current Next.js Status  
   Registration number is only part of the shared free-text search and is matched with case-insensitive substring search in the browser.

4. Missing Functionality or Logic  
   - no dedicated registration field
   - no exact-match registration behavior
   - no server-side registration filter

5. Required Improvement  
   - add dedicated registration filter support
   - preserve or explicitly replace legacy exact-match semantics
   - ideally push registration filtering to server-side query logic

6. Relevant Existing Code Location, where possible  
   - Legacy: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Outstanding_Payment_Report\Outstanding_Payment_Report.cs`
   - Current: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\OutstandingClient.tsx`
   - Current: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\queries.ts`

7. Priority / Impact, where possible  
   High. Registration search is a primary report lookup path.

### 2.3 Customer Autocomplete
1. Feature / Business Logic Name  
   Customer autocomplete for report filters

2. Existing System Behavior  
   The legacy report contract included `Autocomplete_Customer_Name(term)`. The closest surviving implementation evidence shows a union of:
   - `Inquiries.Customer`
   - `Customers.Cust_Name`
   with prefix matching via `StartsWith(term)`.

3. Current Next.js Status  
   No customer autocomplete exists in the Outstanding Payments page.

4. Missing Functionality or Logic  
   - no autocomplete UI
   - no customer lookup endpoint or loader for this report
   - no prefix-based selection experience

5. Required Improvement  
   - add a customer autocomplete control
   - define whether it should query customer master only or preserve the inquiry/customer union behavior
   - add supporting server/API/query logic

6. Relevant Existing Code Location, where possible  
   - Legacy helper: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Common\CommonFor_Model_Color_Variant.cs`
   - Current candidate pattern: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\api\customers\search\route.ts`

7. Priority / Impact, where possible  
   Medium-High. This is part of legacy usability and improves accurate report targeting.

### 2.4 Registration Autocomplete
1. Feature / Business Logic Name  
   Registration-number autocomplete for report filters

2. Existing System Behavior  
   The legacy model exposed `Auto_Car_Registration_No(term)` and returned distinct inventory registration numbers using prefix matching from `Inventory_Management`.

3. Current Next.js Status  
   No registration autocomplete exists in the Outstanding Payments page.

4. Missing Functionality or Logic  
   - no registration autocomplete UI
   - no supporting endpoint/query
   - no prefix-based selection flow

5. Required Improvement  
   - add registration autocomplete support
   - implement a server-side lookup source equivalent to the legacy inventory-backed search

6. Relevant Existing Code Location, where possible  
   - Legacy: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Outstanding_Payment_Report\Outstanding_Payment_Report.cs`
   - Potential data source pattern: `InventoryManagement` usage in current Prisma schema

7. Priority / Impact, where possible  
   Medium-High. This is part of the original report interaction model.

### 2.5 Server-Side Filtered Search Contract
1. Feature / Business Logic Name  
   Dedicated server-side report search behavior

2. Existing System Behavior  
   The legacy report exposed `Search_Outstanding_Payment_Report(objvm)` and filtered during query execution rather than after loading a broad dataset into the UI.

3. Current Next.js Status  
   The page loads all candidate rows and filters only on the client.

4. Missing Functionality or Logic  
   - no report-specific search action or API
   - no query-parameter based filtering
   - no server-side report filter contract

5. Required Improvement  
   - add a real report search contract
   - move filter evaluation into server-side query logic
   - decide whether to use page search params, a route handler, or a server action

6. Relevant Existing Code Location, where possible  
   - Legacy contract reference: `C:\KhizarShaikh\Project\ExcelCars\docs\module\ssot\05_SSOT_reporting-analytics.md`
   - Current page: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\reports\outstanding\page.tsx`
   - Current data load: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\queries.ts`

7. Priority / Impact, where possible  
   High. This affects correctness, scalability, and parity with legacy search behavior.

### 2.6 Legacy Export Contract With Summary Total
1. Feature / Business Logic Name  
   Summary-aware report export

2. Existing System Behavior  
   The legacy reporting SSOT states that outstanding payment export included a summary total and used a summary-report export helper.

3. Current Next.js Status  
   Export is a client-generated CSV containing only row data and no dedicated summary row.

4. Missing Functionality or Logic  
   - no summary row in export
   - no server-generated export
   - no legacy-style summary export contract

5. Required Improvement  
   - add export summary row support
   - decide whether export remains CSV or is upgraded to a richer server-generated format
   - ensure exported totals reflect the same filtered result set as the visible report

6. Relevant Existing Code Location, where possible  
   - Legacy SSOT reference: `C:\KhizarShaikh\Project\ExcelCarsNextJs\docs\module\existing_ssot\outstandingpayments.md`
   - Current export code: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\OutstandingClient.tsx`

7. Priority / Impact, where possible  
   Medium-High. Export completeness is a business/reporting concern, especially for finance workflows.

### 2.7 Legacy Display Fields Missing From Report Grid
1. Feature / Business Logic Name  
   Complete legacy column coverage

2. Existing System Behavior  
   The legacy report output included at least:
   - `Customer Mobile`
   - `Customer Email`
   - `Payment Status`
   - `Total Amount`
   - `% of Payout`
   - `Payout Amount`
   - `Amount Paid`
   - `Bal Amt`
   and likely exposed other normalized fields from the model.

3. Current Next.js Status  
   The current table shows only:
   - `Type`
   - `Customer`
   - `Reg No`
   - `Payout Amount`
   - `Received`
   - `Balance`

4. Missing Functionality or Logic  
   - missing legacy contact fields
   - missing payment-status visibility
   - missing `Total Amount`
   - missing `% of Payout`
   - no remark field

5. Required Improvement  
   - decide which legacy columns are mandatory for parity
   - expand the normalized row shape and table rendering accordingly
   - verify column behavior per type, since some fields are not populated uniformly in legacy

6. Relevant Existing Code Location, where possible  
   - Legacy model fields: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Outstanding_Payment_Report\Outstanding_Payment_Report.cs`
   - Current row model: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\queries.ts`
   - Current table: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\OutstandingClient.tsx`

7. Priority / Impact, where possible  
   High. Missing columns can hide business meaning and change how finance/admin users interpret the report.

### 2.8 Payment-Status Visibility And Filter Policy
1. Feature / Business Logic Name  
   Explicit paid/pending status handling

2. Existing System Behavior  
   Legacy artifacts conflict:
   - stored procedure excludes paid rows by payment-status field
   - surviving model includes paid rows and computes balances
   - supplied live legacy output shows `Fully Paid` and `Paid` rows in the report

3. Current Next.js Status  
   The current implementation does not show payment-status values and does not filter by them.

4. Missing Functionality or Logic  
   - no visible payment-status field
   - no status filter
   - no explicit business decision encoded in the current module about whether this report is:
     - outstanding-only, or
     - computed balance report including paid/overpaid rows

5. Required Improvement  
   - decide and document the intended business interpretation
   - if needed, add payment-status display and filtering
   - align inclusion rules with approved business behavior

6. Relevant Existing Code Location, where possible  
   - Legacy model: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Outstanding_Payment_Report\Outstanding_Payment_Report.cs`
   - Legacy SP: `C:\KhizarShaikh\Project\ExcelCars\db\excelCarsFinal.sql`
   - Current query logic: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\queries.ts`

7. Priority / Impact, where possible  
   Critical. This is one of the most important business-logic conflicts in the module.

### 2.9 Zero-Balance Inclusion Policy
1. Feature / Business Logic Name  
   Zero-balance row inclusion policy

2. Existing System Behavior  
   The surviving legacy model did not explicitly exclude zero-balance rows. The supplied legacy live output showed many rows with `Bal Amt = 0.00`.

3. Current Next.js Status  
   The current implementation explicitly drops any row with `balance === 0`.

4. Missing Functionality or Logic  
   - no parity with the observed live legacy page behavior for zero-balance rows
   - no user control to include/exclude settled rows

5. Required Improvement  
   - decide whether zero-balance rows should:
     - be included by default
     - be excluded by default
     - be controlled by a filter toggle
   - align implementation with the approved rule

6. Relevant Existing Code Location, where possible  
   - Current exclusion logic: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\queries.ts`
   - Existing-system evidence: `C:\KhizarShaikh\Project\ExcelCarsNextJs\docs\module\existing_ssot\outstandingpayments.md`

7. Priority / Impact, where possible  
   High. This changes what users believe the report is showing.

### 2.10 Type Scope Conflict Resolution
1. Feature / Business Logic Name  
   Final report type scope definition

2. Existing System Behavior  
   Legacy evidence conflicts:
   - surviving model: `RTO`, `Insurance`, `Loan`
   - stored procedure: `RTO`, `Insurance`, `Financial`, `DSA`
   - supplied live output: `RTO` and `Insurance` are proven; `Financial` and `DSA` are not evidenced in that sample

3. Current Next.js Status  
   The current report only includes `RTO`, `Insurance`, and `Loan`.

4. Missing Functionality or Logic  
   - no explicit decision record explaining why `Financial` and `DSA` are excluded
   - no implementation for those additional types if they are still required

5. Required Improvement  
   - confirm final business scope
   - either:
     - document `Financial` and `DSA` as intentionally out of scope, or
     - implement them as additional report branches

6. Relevant Existing Code Location, where possible  
   - Legacy SP: `C:\KhizarShaikh\Project\ExcelCars\db\excelCarsFinal.sql`
   - Legacy model: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Outstanding_Payment_Report\Outstanding_Payment_Report.cs`
   - Current query scope: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\queries.ts`

7. Priority / Impact, where possible  
   Critical. This defines what the report is supposed to cover.

### 2.11 Legacy Permission Scope Clarification
1. Feature / Business Logic Name  
   Report-specific permission enforcement

2. Existing System Behavior  
   Legacy access-function artifacts indicate the report had its own access-function entry and role mapping, even though the exact runtime authorization wiring is not fully recoverable.

3. Current Next.js Status  
   The current module only requires a logged-in session. No role-based or report-specific access check is enforced in this page.

4. Missing Functionality or Logic  
   - no Outstanding Payments-specific permission check
   - no use of `roleName` for this report
   - no equivalent of legacy access-function-based gating

5. Required Improvement  
   - decide whether report-specific access restriction is required in the Next.js app
   - if yes, add explicit role/permission enforcement
   - align permission behavior with the approved target model rather than relying only on authentication

6. Relevant Existing Code Location, where possible  
   - Legacy permission evidence: `C:\KhizarShaikh\Project\ExcelCars\db\excelCarsFinal.sql`
   - Current auth shell: `C:\KhizarShaikh\Project\ExcelCarsNextJs\middleware.ts`
   - Current dashboard layout guard: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\layout.tsx`
   - Current session fields: `C:\KhizarShaikh\Project\ExcelCarsNextJs\auth.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\auth.config.ts`

7. Priority / Impact, where possible  
   High. This affects access policy and security, not just UI parity.

### 2.12 Persisted Filter State / URL Contract
1. Feature / Business Logic Name  
   URL-backed report state

2. Existing System Behavior  
   The legacy report exposed a formal search action and was likely request-driven, which made filters part of server interaction rather than transient local state.

3. Current Next.js Status  
   Search and type filter values live only in React state and reset on page reload.

4. Missing Functionality or Logic  
   - no shareable report URLs
   - no preserved browser-state/report-state continuity
   - no stable report query contract

5. Required Improvement  
   - move report filters into search params or another explicit route contract
   - ensure server load and export use the same parameter basis

6. Relevant Existing Code Location, where possible  
   - Current client-only state: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\OutstandingClient.tsx`
   - Current route entry: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\reports\outstanding\page.tsx`

7. Priority / Impact, where possible  
   Medium. Important for usability, repeatability, and future reporting workflows.

### 2.13 Server-Side Export Endpoint
1. Feature / Business Logic Name  
   Server-side export endpoint for report parity and scale

2. Existing System Behavior  
   Legacy had a dedicated export action separate from the page render/search flow.

3. Current Next.js Status  
   Export is entirely client-side and depends on the already loaded in-memory rows.

4. Missing Functionality or Logic  
   - no report export route
   - no server-generated export contract
   - no export path that can scale independently of the browser state

5. Required Improvement  
   - add a report-specific export route or server action
   - ensure it uses the same approved server-side filter basis as the page

6. Relevant Existing Code Location, where possible  
   - Legacy contract reference: `C:\KhizarShaikh\Project\ExcelCars\docs\module\ssot\05_SSOT_reporting-analytics.md`
   - Current client export: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\OutstandingClient.tsx`
   - Example export route patterns elsewhere: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\api\insurance\export\route.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\api\inventory\export\route.ts`

7. Priority / Impact, where possible  
   Medium-High. Important for scalability and consistency with other report/export patterns in the app.

### 2.14 Consistent Table And Export Column Contract
1. Feature / Business Logic Name  
   Unified visible/export column contract

2. Existing System Behavior  
   Legacy report output and export were aligned around a fuller reporting view, including summary awareness.

3. Current Next.js Status  
   The visible table order is:
   - `Type`
   - `Customer`
   - `Reg No`
   - `Payout Amount`
   - `Received`
   - `Balance`

   The CSV export order is:
   - `Type`
   - `Reg No`
   - `Customer`
   - `Payout Amount`
   - `Received`
   - `Balance`

4. Missing Functionality or Logic  
   - no clear reason documented in code for this mismatch
   - visible and exported column contracts are not aligned

5. Required Improvement  
   - decide whether table and export column order should match
   - if not, document the intentional difference
   - if yes, align one contract to the other

6. Relevant Existing Code Location, where possible  
   - Current table headers: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\OutstandingClient.tsx`
   - Current CSV headers: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\OutstandingClient.tsx`

7. Priority / Impact, where possible  
   Medium. This is not the largest business conflict, but it affects reporting clarity.

### 2.15 Table Scaling And Pagination
1. Feature / Business Logic Name  
   Large-result scalability controls

2. Existing System Behavior  
   The exact legacy pagination behavior is not recoverable from this repo snapshot, but legacy had a search-driven report flow rather than always loading everything up front.

3. Current Next.js Status  
   The current report loads all candidate rows from three tables and performs filtering entirely in memory. No pagination is implemented.

4. Missing Functionality or Logic  
   - no pagination
   - no result limiting
   - no virtualization
   - no server-side narrowing of result set before render

5. Required Improvement  
   - move filters to the server side
   - add pagination or another scaling strategy if data volume grows

6. Relevant Existing Code Location, where possible  
   - Current data load: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\queries.ts`
   - Current page: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\reports\outstanding\page.tsx`

7. Priority / Impact, where possible  
   Medium. More of a scalability and UX issue than a core legacy business-rule conflict.

## 3. Priority Summary
Critical:
- Payment-status visibility and filter policy
- Type scope conflict resolution

High:
- Separate customer filter with legacy semantics
- Separate registration filter with legacy semantics
- Server-side filtered search contract
- Legacy display fields missing from report grid
- Zero-balance inclusion policy
- Legacy permission scope clarification

Medium-High:
- Customer autocomplete
- Registration autocomplete
- Legacy export contract with summary total
- Server-side export endpoint

Medium:
- Persisted filter state / URL contract
- Consistent table and export column contract
- Table scaling and pagination

## 4. Approval Rule
This file must remain separate from:
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\docs\module\ssot\outstandingpayments.md`

Until explicit approval is given:
- do not merge these items into the current-state SSOT as implemented behavior
- do not delete this improvement document
- do not treat these items as completed work

After explicit approval:
- implement the approved missing functionality as instructed
- update `outstandingpayments.md` to reflect newly implemented truth
- remove this improvement document only when the approved scope is fully merged and documented
