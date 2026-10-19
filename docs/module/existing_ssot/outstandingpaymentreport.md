# SSOT - Outstanding Payment Report Module
## Status: Legacy reporting logic partially recoverable from codebase; current Next.js rewrite implemented with functional gaps

**Legacy Module:** `Report/Outstanding_Payment_Report`  
**Legacy Project:** `ExcelCars` ASP.NET MVC / EF  
**Current Module:** `app/(dashboard)/reports/outstanding` in `ExcelCarsNextJs`  
**Source of truth for this document:** `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Outstanding_Payment_Report\Outstanding_Payment_Report.cs`, `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Common\CommonFor_Model_Color_Variant.cs`, `C:\KhizarShaikh\Project\ExcelCars\db\ExcelCars_merged.sql`, `C:\KhizarShaikh\Project\ExcelCars\docs\module\ssot\05_SSOT_reporting-analytics.md`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\reports\outstanding\page.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\queries.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\outstanding\OutstandingClient.tsx`

## 1. Purpose
This module is the reporting surface for unpaid or partially paid third-party payouts tied to vehicle transactions.

It owns:
- cross-process visibility of outstanding payout balances for:
  - `RTO`
  - `Insurance`
  - `Loan`
- filtering by customer, registration number, and payout type in the legacy system
- registration and customer autocomplete in the legacy system
- row-level payout balance calculation
- grand total outstanding balance calculation
- report export

It does not own:
- creation or editing of RTO, insurance, or loan records
- payment receipt workflows
- settlement actions
- inventory master maintenance
- customer master maintenance
- authentication/session ownership

## 2. Evidence And Recovery Limits
The repository snapshot contains the legacy report model, the stored procedure definition, access metadata, and high-level module SSOT notes, but it does not contain the original MVC controller or Razor view files for this report.

Because of that:
- legacy search and calculation logic is recoverable directly from code
- legacy autocomplete behavior is recoverable directly from model/common code
- legacy access intent is recoverable from `Access_Function` seed data and the reporting SSOT
- exact legacy UI markup, button IDs, client-side validation messages, and export column ordering are not fully recoverable from this snapshot
- any controller/view behavior listed below is treated as inferred only when it is supported by:
  - the legacy reporting SSOT
  - surviving model methods
  - stored procedure contract

Second-review additions verified after re-tracing the module:
- current report row drill-through links are valid and intentionally use different query parameter names per destination page
- current Next.js operational pages accept those params as initial filters:
  - `RTO` accepts `registrationNo`
  - `Insurance` accepts `search`
  - `Loan` accepts `search`
- legacy permission evidence has drift across schema generations:
  - legacy `Access_Function.Role_ID_legacy` shows `,1,2,`
  - hardened `Access_Function_Role` data also includes role `3`

## 3. Locked Legacy Scope
- the report is exposed from the legacy reporting area as `Outstanding_Payment_Report()`
- the report supports:
  - open
  - customer autocomplete
  - car registration autocomplete
  - search
  - export with summary total
- the report is read-only
- the report combines data from multiple business modules into one flat result set
- type filtering is optional; blank type means show all supported types
- blank customer name means do not filter by customer
- blank registration number means do not filter by registration

Legacy-supported types based on surviving application code:
- `RTO`
- `Insurance`
- `Loan`

Types referenced by the legacy stored procedure but not by the surviving model:
- `Financial`
- `DSA`

This mismatch is a real legacy inconsistency and must be treated carefully during migration.

## 4. Data Ownership
This module is read-model oriented. It does not own transactional records, but it defines how outstanding payout reporting is projected from operational tables.

Legacy tables read directly by the surviving model code:
- `RTO_Agent`
- `Insurance_Main`
- `Loan_Management`
- `Inventory_Management` for registration autocomplete only

Legacy tables referenced by the stored procedure:
- `RTO_Agent`
- `Insurance_Main`
- `Financial_Management`
- `DSA_Management`
- `Customer`

Current Next.js data sources:
- `rtoAgent`
- `insuranceMain`
- `loanManagement`
- `customer` relation when linked

Minimum legacy filter fields:
- `Form_Customer_Name`
- `Form_Car_Registration_No`
- `Form_Type`

Minimum legacy display fields:
- `Pk_id`
- `Type_Value`
- `Inventory_ID`
- `Customer_ID`
- `Customer_Name`
- `Customer_Mobile`
- `Customer_Email`
- `Car_Registration_No`
- `Remark`
- `Payment_Status`
- `Total_Amount`
- `Percentage_of_Payout`
- `Payout_Amount`
- `Amount_Paid`
- `Bal_Amount`
- `Total_Bal_Amount`

Current Next.js display fields:
- `type`
- `registrationNo`
- `customerName`
- `payoutAmount`
- `amountReceived`
- `balance`

## 5. Interface Contracts

Legacy contracts documented by the old reporting module SSOT:
- `Outstanding_Payment_Report()`
- `Autocomplete_Customer_Name(term)`
- `Autocomplete_Car_Registration_No(term)`
- `Search_Outstanding_Payment_Report(objvm)`
- `ExportToExcel_Outstanding_Payment_Report(objvm)`

Legacy model methods still present in code:
- `Outstanding_Payment_Report.Search_OutStanding_Payment()`
- `Outstanding_Payment_Report.Auto_Car_Registration_No(string term)`
- `CommonFor_Model_Color_Variant.CustName_Inquiry_Master_Autocomplete(string term)`

Current Next.js contracts:
- page loader:
  - `listOutstanding()`
- client view:
  - `OutstandingClient`
- route:
  - `/reports/outstanding`

Current UI interactions:
- free-text search over:
  - registration number
  - customer name
- type quick filters:
  - `All`
  - `RTO`
  - `Insurance`
  - `Loan`
- CSV export of the currently filtered client-side result set
- link from registration number to the owning operational module:
  - `RTO -> /rto?registrationNo=...`
  - `Insurance -> /insurance?search=...`
  - `Loan -> /loan?search=...`
- report state is not encoded in the browser URL:
  - search text is local component state
  - type selection is local component state
  - page reload resets the user-entered report filters

## 6. Legacy Business Logic

### 6.1 Search behavior
- `Search_OutStanding_Payment()` resets `Total_Bal_Amount` to `0` before building results
- `lst_search_main_list` is an instance field and results are appended into it during search execution
- if `Form_Type` is blank, the search executes all supported type branches and merges them into one list
- if `Form_Type` is specified, only the matching branch is executed
- customer filtering is exact-match, not contains-match:
  - `t.Customer_Name == Form_Customer_Name` for RTO, Insurance, and Loan
- registration filtering is exact-match, not contains-match:
  - `t.Car_Registration_No == Form_Car_Registration_No` for RTO and Insurance
  - `t.Registration_No == Form_Car_Registration_No` for Loan
- the surviving model does not filter out fully settled rows
- the surviving model does not sort the final result set
- the surviving model constructs the result set by materializing each type branch separately and normalizing them into one common row shape

### 6.2 Type-specific calculation rules

RTO:
- source table: `RTO_Agent`
- displayed `Type_Value` is `RTO`
- `Total_Amount = Transfer_Charges`
- `Amount_Paid = Amt_Paid`
- `Bal_Amount = Total_Amount - Amount_Paid`
- `Percentage_of_Payout` is not populated
- `Payout_Amount` is not populated

Insurance:
- source table: `Insurance_Main`
- displayed `Type_Value` is `Insurance`
- `Total_Amount = O_D_Premium`
- `Percentage_of_Payout = Payout_percentage_OD_Premium`
- `Payout_Amount = Payout_Amount`
- `Amount_Paid = Total_Amount_Received`
- `Bal_Amount = Payout_Amount - Amount_Paid`
- `Payment_Status = Payout_payment_Status`

Loan:
- source table: `Loan_Management`
- displayed `Type_Value` is `Loan`
- `Total_Amount = Loan_Amount`
- `Percentage_of_Payout = Percentage_Payout_Amount`
- `Payout_Amount = Payout_Amount`
- `Amount_Paid = Total_Amount_Received`
- `Bal_Amount = Payout_Amount - Amount_Paid`

### 6.3 Summary total logic
- every row contributes its `Bal_Amount` into `Total_Bal_Amount`
- the legacy summary total is the sum of all row balances in the current result set
- negative balances are not blocked by code, so overpayments would reduce the total
- because the surviving model does not exclude zero or negative balances, the summary could theoretically include:
  - open positive balances
  - zero balances
  - overpaid negative balances

### 6.4 Autocomplete behavior
Customer autocomplete:
- the old reporting SSOT says `Autocomplete_Customer_Name(term)` exists
- the surviving common helper shows the likely behavior:
  - values are drawn from both `Inquiries.Customer` and `Customers.Cust_Name`
  - values are combined with `Union`
  - search is prefix-based using `StartsWith(term)`

Registration autocomplete:
- `Auto_Car_Registration_No(term)` reads distinct registration numbers from `Inventory_Management`
- matching is prefix-based using `StartsWith(term)`

### 6.5 Legacy stored procedure drift
The stored procedure `SP_Get_Outstanding_Payment_Report` does not match the surviving model behavior exactly.

Stored procedure behavior:
- includes `RTO`, `Insurance`, `Financial`, and `DSA`
- excludes rows already marked paid:
  - `RTO.Payment_Status != 'Fully Paid'`
  - `Insurance.Payout_payment_Status != 'Paid'`
  - `Financial.Payment_Status != 'Paid'`
  - `DSA.Payment_Status != 'Paid'`
- orders final output by `Inventory_ID`

Surviving model behavior:
- includes only `RTO`, `Insurance`, and `Loan`
- does not filter out paid rows before computing balances
- does not order the final list
- comments out the stored procedure invocation

For migration purposes, the surviving model code is the strongest executable evidence in this repository, but the SP mismatch should be logged as a legacy ambiguity requiring explicit business confirmation.

## 7. Legacy Access And Permissions
- the module is part of the protected reporting area according to the reporting SSOT
- access metadata exists in `Access_Function` as `Outstanding_Payment_Report`
- seeded allowed legacy roles are `,1,2,`
- a later hardened bridge-table snapshot also contains:
  - `Access_Function_Role(17, 1)`
  - `Access_Function_Role(17, 2)`
  - `Access_Function_Role(17, 3)`

Interpretation:
- role `3` access appears to be a later migration-side expansion, not part of the original `Role_ID_legacy` text list
- the SSOT should preserve both facts until business owners confirm which permission model is authoritative

What is not recoverable from this snapshot:
- the exact legacy controller authorization attribute usage for this page
- whether any additional role-based row filtering existed in the controller/view layer

## 8. Legacy UI Behavior Recoverable From Evidence
Recoverable user-facing behaviors:
- a report page exists in the Reports navigation area
- the page exposes customer and registration lookup affordances through autocomplete endpoints
- the page accepts a type selector
- the page can search and render a result grid
- the page can export the same search basis with a summary total

Not recoverable from this snapshot:
- exact field layout
- exact button labels beyond the documented actions
- exact empty-state text
- exact export filename
- any client-side sorting or pagination behavior

Best evidence suggests the legacy report was a simple filter form plus read-only summary grid with export.

## 9. Current Next.js Implementation

### 9.1 Current behavior
- the page is server-rendered by loading all outstanding rows through `listOutstanding()`
- all searching and type filtering happens client-side in memory
- the page exports a CSV generated in the browser
- the page displays:
  - type badge
  - registration number
  - customer name
  - payout amount
  - received amount
  - balance
- the page displays a footer total for the currently filtered rows
- rows with `balance === 0` are excluded before render
- rows are sorted descending by `balance`
- customer display value prefers the linked normalized customer record, then falls back to the legacy denormalized customer-name field
- each report row is keyed by a composite type-prefixed identifier:
  - `rto-{id}`
  - `insurance-{id}`
  - `loan-{id}`

### 9.2 Current type-specific rules
RTO:
- `payoutAmount = transferCharges`
- `amountReceived = amtPaid`
- `balance = transferCharges - amtPaid`

Insurance:
- `payoutAmount = payoutAmount`
- `amountReceived = totalAmountReceived`
- `balance = payoutAmount - totalAmountReceived`

Loan:
- `payoutAmount = payoutAmount`
- `amountReceived = totalAmountReceived`
- `balance = payoutAmount - totalAmountReceived`

### 9.3 Current search and filter rules
- text search is case-insensitive
- text search uses `includes`, not exact match
- text search matches:
  - registration number
  - customer name
- type filter is an in-memory segmented toggle
- there is no server-side query parameter support for filtering
- there is no dedicated customer filter control separate from the shared text search
- there is no registration-only filter control separate from the shared text search

### 9.4 Current export behavior
- export is client-side only
- export format is CSV
- exported columns are:
  - `Type`
  - `Reg No`
  - `Customer`
  - `Payout Amount`
  - `Received`
  - `Balance`
- the footer summary total is not exported as a separate summary row in the CSV

## 10. Gap Analysis: Legacy vs Next.js

Implemented in Next.js:
- dedicated route for outstanding payments
- combined reporting of RTO, Insurance, and Loan rows
- row-level balance calculation
- total outstanding summary on screen
- type-based filtering
- search by registration and customer
- export capability
- navigation links from report rows into owning operational modules

Missing or behaviorally different from legacy:
- no customer autocomplete endpoint or UI
- no registration autocomplete endpoint or UI
- no explicit server-side search action equivalent to `Search_Outstanding_Payment_Report`
- no explicit server-side export action equivalent to `ExportToExcel_Outstanding_Payment_Report`
- filtering semantics differ:
  - legacy used exact match
  - Next.js uses contains match
- result acquisition differs:
  - legacy evaluated requested filters in the query itself
  - Next.js loads a broad dataset first, then filters in the browser
- filter persistence differs:
  - legacy likely submitted filters through server endpoints/actions
  - Next.js filter state is transient and not URL-backed
- row inclusion differs:
  - surviving legacy model could include zero-balance rows
  - Next.js suppresses zero-balance rows
- sorting differs:
  - legacy surviving model preserved natural query order
  - Next.js sorts by descending balance
- displayed fields are reduced in Next.js:
  - missing `Customer_Mobile`
  - missing `Customer_Email`
  - missing `Remark`
  - missing `Payment_Status`
  - missing `Total_Amount`
  - missing `Percentage_of_Payout`
  - missing `Inventory_ID`
  - missing `Customer_ID`
- the legacy/common customer autocomplete likely searched both inquiry-entered names and customer-master names, while Next.js display/search is based only on row data already loaded into the report
- export payload is reduced in Next.js
- summary export behavior differs:
  - legacy SSOT says export includes summary total
  - current CSV export omits a dedicated summary row
- permission evidence differs:
  - original legacy seed suggests only roles `1` and `2`
  - hardened bridge-table output also grants role `3`

Legacy ambiguity not yet resolved in Next.js:
- whether `Financial` and `DSA` should appear in this report
- whether paid rows should be excluded by payment status or only by computed zero balance
- whether exact-match filters are a business requirement or just a legacy implementation detail

## 11. Migration Rules For SSOT Compliance
Any rewrite intended to be legacy-faithful should preserve or explicitly replace these rules:
- the report is read-only
- the report aggregates multiple operational modules into one projection
- per-row balance is type-specific and not globally uniform in source columns
- the report supports customer, registration, and type filtering
- the report has a grand total outstanding summary
- export must be based on the same effective result set as the on-screen report

These decisions require explicit product sign-off because the legacy evidence conflicts:
- whether to include `Financial` and `DSA`
- whether to exclude already paid rows by status
- whether exact-match search should be preserved
- whether zero-balance rows should remain visible

## 12. Tests Required
- report route loads successfully for authenticated users
- merged result set contains RTO, Insurance, and Loan rows with correct type labels
- RTO balance equals `transferCharges - amtPaid`
- Insurance balance equals `payoutAmount - totalAmountReceived`
- Loan balance equals `payoutAmount - totalAmountReceived`
- on-screen total equals the sum of visible row balances
- customer name uses linked customer record when present and falls back to legacy customer-name text otherwise
- type filter restricts rows correctly
- text search matches registration number correctly
- text search matches customer name correctly
- drill-through links open the intended downstream pages with compatible query parameters:
  - `RTO.registrationNo`
  - `Insurance.search`
  - `Loan.search`
- export contains exactly the currently filtered rows
- export column order matches the client table export contract
- registration link routes to the correct downstream module by type
- negative balances, if present in source data, render and total consistently

## 13. SSOT Rule
Until product decisions resolve the legacy drift, the safest SSOT position is:
- current Next.js `/reports/outstanding` is a partial functional port, not a complete legacy-equivalent port
- the surviving legacy model is the primary executable source of truth for row construction and balance calculations
- the stored procedure is secondary evidence that exposes unresolved scope drift around `Financial`, `DSA`, and paid-row filtering
