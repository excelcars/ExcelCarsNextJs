# SSOT - Stock Tracking Improvements
## Status: Gap analysis for current Next.js module vs existing system; not yet merged into current-state SSOT

**Module:** `reports/tracking`  
**Project:** `ExcelCarsNextJs`  
**Base current-state SSOT:** `C:\KhizarShaikh\Project\ExcelCarsNextJs\docs\module\ssot\stocktracking.md`  
**Existing-system reference:** `C:\KhizarShaikh\Project\ExcelCarsNextJs\docs\module\existing_ssot\stocktracking.md`  
**Purpose of this file:** Track missing functionality and business logic separately until explicitly approved for implementation and SSOT merge.

## 1. Scope Of This Improvement Document
This document lists functionality and business logic that is present, implied, or evidenced in the legacy/existing Stock Tracking Report module but is not fully represented in the current Next.js implementation.

This document does not change the current-state SSOT.

Until explicit approval is given:
- `stocktracking.md` remains the current implemented truth
- this file remains a separate improvement/gap document
- no gap listed here should be treated as already implemented

## 2. Missing Items

### 2.1 Structured Stock Filters
1. Feature / Business Logic Name  
   Structured stock filters for make, model, variant, colour, and fuel type

2. Existing System Behavior  
   The legacy report exposed dedicated filter fields:
   - `Form_Make`
   - `Form_Model`
   - `Form_Variant`
   - `Form_Colour`
   - `Form_Fuel_Type`

   The surviving model applied exact-match query-time filtering against `Inventory_Management`.

3. Current Next.js Status  
   The current page has only one client-side free-text search box. It filters already loaded rows by:
   - registration number
   - make
   - model

4. Missing Functionality or Logic  
   - no dedicated make filter
   - no dedicated model filter
   - no dedicated variant filter
   - no dedicated colour filter
   - no dedicated fuel-type filter
   - no query-time structured filtering

5. Required Improvement  
   - add dedicated filter controls for the legacy stock attributes
   - decide whether filter semantics remain exact-match or are intentionally modernized
   - move those filters into the server-side data-loading contract if parity is required

6. Relevant Existing Code Location, where possible  
   - Legacy: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`
   - Current: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\queries.ts`

7. Priority / Impact, where possible  
   High. These filters are part of the core report contract in the existing system.

### 2.2 Summary Export
1. Feature / Business Logic Name  
   Stock-tracking summary export

2. Existing System Behavior  
   The legacy reporting SSOT documents `ExportToExcel_Stock_Tracking_Report(objVM)` as part of the report contract.

3. Current Next.js Status  
   No summary export exists in the current `/reports/tracking` page.

4. Missing Functionality or Logic  
   - no export button
   - no export route
   - no client-generated export
   - no server-generated export

5. Required Improvement  
   - add a summary export flow
   - decide the file format and whether export should be server-generated
   - ensure the export uses the same effective result basis as the visible report

6. Relevant Existing Code Location, where possible  
   - Legacy contract reference: `C:\KhizarShaikh\Project\ExcelCars\docs\module\ssot\05_SSOT_reporting-analytics.md`
   - Current page: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\reports\tracking\page.tsx`
   - Current client: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`

7. Priority / Impact, where possible  
   High. Export is part of the existing report scope.

### 2.3 Detail Export
1. Feature / Business Logic Name  
   Stock-tracking detail export

2. Existing System Behavior  
   The legacy report supported `ExportToExcel_Stock_Tracking_Details_Report(objVM)` and generated a sectioned CSV through `generateexcel1()` containing:
   - stock header
   - checklist section
   - insurance section
   - RTO section
   - loan section

3. Current Next.js Status  
   The detail experience is modal-only and has no export capability.

4. Missing Functionality or Logic  
   - no detail export action
   - no sectioned CSV or equivalent
   - no checklist/insurance/RTO/loan export surface

5. Required Improvement  
   - add detail export capability
   - preserve or intentionally replace the legacy sectioned export layout
   - ensure the export uses the same detail basis as the visible detail view

6. Relevant Existing Code Location, where possible  
   - Legacy: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current detail loader: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\queries.ts`
   - Current modal UI: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`

7. Priority / Impact, where possible  
   High. Detail export is explicitly part of the legacy report contract.

### 2.4 Full Inventory Column Coverage In Summary Grid
1. Feature / Business Logic Name  
   Legacy inventory field coverage in the summary report

2. Existing System Behavior  
   The legacy report model exposed many stock fields in its main result rows, including:
   - `Colour`
   - `SKU`
   - `Month`
   - `Fuel_Type`
   - `No_of_owners`
   - `Tax`
   - `Kms_Driven`
   - `Insurance_Type`
   - `Price`
   - `Other_Remarks`
   - `Owned_Type`
   - `Owned_By`
   - `Mobile_No_Owned_By`
   - `Email_ID_Owned_By`
   - `Customer_Address`
   - `Customer_Mobile`
   - `Customer_Email`

3. Current Next.js Status  
   The current table shows only:
   - `Reg No`
   - `Vehicle`
   - `Year`
   - `Status`
   - `Actions`

4. Missing Functionality or Logic  
   - reduced visibility of stock attributes
   - no ownership/contact fields
   - no customer enrichment fields
   - `sku` is loaded but not displayed

5. Required Improvement  
   - decide which legacy columns are required for parity
   - expand the row shape and table rendering accordingly
   - make sure the UI remains usable if the grid becomes wider

6. Relevant Existing Code Location, where possible  
   - Legacy fields: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current row map: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\reports\tracking\page.tsx`
   - Current table: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`

7. Priority / Impact, where possible  
   High. The current page omits a large part of the legacy report’s informational value.

### 2.5 Customer Enrichment In Summary Grid
1. Feature / Business Logic Name  
   Customer contact enrichment on stock rows

2. Existing System Behavior  
   The legacy search path enriched each row from `Customers` when `Customer_ID != 0`, populating:
   - `Customer_Address`
   - `Customer_Mobile`
   - `Customer_Email`

3. Current Next.js Status  
   The current page does not surface any customer enrichment in the stock list.

4. Missing Functionality or Logic  
   - no customer address
   - no customer mobile
   - no customer email
   - no visible customer identity at all in the summary grid

5. Required Improvement  
   - decide whether customer enrichment is required in the stock list
   - if yes, include the needed relation/query and render the fields

6. Relevant Existing Code Location, where possible  
   - Legacy enrichment logic: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current stock query: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\queries.ts`

7. Priority / Impact, where possible  
   Medium-High. It changes how much operational context users have before opening detail.

### 2.6 Full Detail Field Coverage For Checklist
1. Feature / Business Logic Name  
   Complete checklist detail visibility

2. Existing System Behavior  
   The legacy detail/export checklist section carried:
   - `Registration_No`
   - `Customer_Name`
   - `Customer_Mobile`
   - `Customer_Email`
   - `Document_Name`
   - `Applicable`
   - `Received`
   - `Original_Copy`

3. Current Next.js Status  
   The checklist section shows only:
   - document name
   - applicable
   - received

4. Missing Functionality or Logic  
   - no display of `originalCopy`
   - no customer contact details in the checklist section
   - no registration/customer context within checklist detail rows

5. Required Improvement  
   - expand the checklist modal section to show the missing fields if parity is required
   - ensure the detail payload still includes those fields end to end

6. Relevant Existing Code Location, where possible  
   - Legacy: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current modal: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`
   - Current payload: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\queries.ts`

7. Priority / Impact, where possible  
   Medium. Current detail visibility is materially reduced.

### 2.7 Full Detail Field Coverage For Insurance
1. Feature / Business Logic Name  
   Complete insurance detail visibility

2. Existing System Behavior  
   The legacy insurance detail/export section included:
   - agent name
   - agent mobile
   - agent email
   - renewal date
   - expiry date
   - insurance premium
   - OD premium
   - payout percentage
   - payout amount
   - payout payment status
   - policy status
   - remark

3. Current Next.js Status  
   The insurance section shows only:
   - agent
   - payout
   - received
   - combined statuses

4. Missing Functionality or Logic  
   - no agent contact details
   - no renewal date
   - no expiry date
   - no insurance premium
   - no OD premium
   - no payout percentage
   - no remark

5. Required Improvement  
   - expand the insurance detail section for parity if approved
   - confirm whether all legacy fields are still useful in the redesigned UI

6. Relevant Existing Code Location, where possible  
   - Legacy: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current modal: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`
   - Current detail query: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\queries.ts`

7. Priority / Impact, where possible  
   Medium-High. Current insurance detail is significantly compressed.

### 2.8 Full Detail Field Coverage For RTO
1. Feature / Business Logic Name  
   Complete RTO detail visibility

2. Existing System Behavior  
   The legacy RTO detail/export section included:
   - agent name
   - agent mobile
   - agent email
   - date of entry
   - transfer charges
   - payment status
   - payment date
   - RC status
   - remark

3. Current Next.js Status  
   The RTO section shows only:
   - agent
   - charges
   - paid
   - combined status line

4. Missing Functionality or Logic  
   - no agent contact details
   - no date of entry
   - no payment date
   - no remark

5. Required Improvement  
   - add the missing RTO fields if legacy parity is required
   - decide whether the paid amount line is sufficient or the legacy detail set should be restored

6. Relevant Existing Code Location, where possible  
   - Legacy: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current modal: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`

7. Priority / Impact, where possible  
   Medium-High. Operational follow-up context is reduced today.

### 2.9 Full Detail Field Coverage For Loan
1. Feature / Business Logic Name  
   Complete loan detail visibility

2. Existing System Behavior  
   The legacy loan detail/export section included:
   - entry date
   - bank name
   - bank person name
   - bank person mobile
   - bank person email
   - loan amount
   - percentage payout amount
   - payout amount
   - payment status
   - payment date
   - amount received
   - remark

3. Current Next.js Status  
   The loan section shows only:
   - bank
   - payout
   - received
   - status

4. Missing Functionality or Logic  
   - no entry date
   - no bank contact name
   - no bank contact details
   - no loan amount
   - no payout percentage
   - no payment date
   - no remark

5. Required Improvement  
   - add the missing loan detail fields if parity is required
   - ensure the detail query passes through the required data

6. Relevant Existing Code Location, where possible  
   - Legacy: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current modal: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`

7. Priority / Impact, where possible  
   Medium-High. The current section omits most legacy loan detail context.

### 2.10 Multi-Row Detail Preservation
1. Feature / Business Logic Name  
   Preserve multiple linked downstream records per registration number

2. Existing System Behavior  
   The legacy detail report loaded all matching:
   - checklist detail rows
   - insurance rows
   - RTO rows
   - loan rows

3. Current Next.js Status  
   The current detail loader uses `findFirst` for:
   - checklist main
   - insurance
   - RTO
   - loan

4. Missing Functionality or Logic  
   - only the first matching downstream record is shown
   - multiple records for the same registration number are silently collapsed

5. Required Improvement  
   - replace first-record lookups with plural lookups where parity is required
   - redesign the modal to render multiple records cleanly per section

6. Relevant Existing Code Location, where possible  
   - Legacy lists: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current first-record logic: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\queries.ts`

7. Priority / Impact, where possible  
   Critical. This is a direct behavioral loss of legacy business data.

### 2.11 Checklist Inner-Join Semantics
1. Feature / Business Logic Name  
   Checklist main-without-detail behavior parity

2. Existing System Behavior  
   The legacy checklist detail path used an inner join between:
   - `Check_List_Doc_Main`
   - `CheckList_Doc_Details`

   A checklist main record without detail rows effectively disappeared and the export/detail behaved like no checklist record existed.

3. Current Next.js Status  
   The current query loads `checkListDocMain.findFirst(... include: { checklistDocDetails: true })` and explicitly distinguishes:
   - no checklist record
   - checklist record with zero detail rows

4. Missing Functionality or Logic  
   - current behavior differs from legacy empty-checklist semantics

5. Required Improvement  
   - decide whether to preserve the current clearer UX or intentionally emulate legacy inner-join behavior
   - if parity is required, align the checklist result semantics

6. Relevant Existing Code Location, where possible  
   - Legacy join behavior: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current checklist query/UI: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\queries.ts`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`

7. Priority / Impact, where possible  
   Medium. This is a real rule difference, though arguably a UX improvement.

### 2.12 Dedicated Detail Page / Workflow Shape
1. Feature / Business Logic Name  
   Standalone registration-based detail report flow

2. Existing System Behavior  
   The legacy module contract included a separate detail report action:
   - `Stock_tracking_Details_Report(Registrationno)`

3. Current Next.js Status  
   Details are shown only in a modal on the main list page.

4. Missing Functionality or Logic  
   - no standalone detail route
   - no directly addressable detail page
   - no report-level detail workflow separate from the summary page

5. Required Improvement  
   - decide whether parity requires a dedicated detail route or whether modal-only behavior is acceptable
   - if needed, create a route that can support export, bookmarking, and larger detail layouts

6. Relevant Existing Code Location, where possible  
   - Legacy contract reference: `C:\KhizarShaikh\Project\ExcelCars\docs\module\ssot\05_SSOT_reporting-analytics.md`
   - Current modal UI: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`

7. Priority / Impact, where possible  
   Medium-High. This affects workflow depth and future extensibility.

### 2.13 Detail Export Empty-Result Handling
1. Feature / Business Logic Name  
   Explicit no-record handling in detail export flow

2. Existing System Behavior  
   Legacy artifacts show two relevant behaviors:
   - `generateexcel1()` does nothing when `lst_stocktracking_details_rpt.Count == 0`
   - higher-level SSOT notes a dead `Count < 0` no-record warning branch in the detail-export controller flow

3. Current Next.js Status  
   There is no detail export flow at all.

4. Missing Functionality or Logic  
   - no current empty-result export handling contract

5. Required Improvement  
   - if detail export is implemented, decide how empty result sets are communicated
   - avoid reproducing the dead-branch legacy bug unless explicitly required

6. Relevant Existing Code Location, where possible  
   - Legacy export model: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Legacy SSOT note: `C:\KhizarShaikh\Project\ExcelCars\docs\module\ssot\05_SSOT_reporting-analytics.md`

7. Priority / Impact, where possible  
   Medium. Important once export work is approved.

### 2.14 Customer/Owner Fields In Detail Header
1. Feature / Business Logic Name  
   Rich stock-header context in detail view

2. Existing System Behavior  
   The legacy detail/export flow anchored sections with a stock header and also preserved customer-related stock context.

3. Current Next.js Status  
   The modal title shows only `Tracking — {registrationNo}` and there is no visible stock-header block with make/model/variant/colour/customer information.

4. Missing Functionality or Logic  
   - no stock header section in the modal body
   - no visible customer name in the modal header/body unless inferred from downstream records

5. Required Improvement  
   - add a stock-header summary area if parity is required
   - include at least the legacy header fields:
     - registration number
     - make
     - model
     - variant
     - colour
     - customer name

6. Relevant Existing Code Location, where possible  
   - Legacy detail header/export header: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current modal: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`

7. Priority / Impact, where possible  
   Medium-High. The current modal drops core context that legacy users had.

### 2.15 Checklist Drill-Through / Related Actions
1. Feature / Business Logic Name  
   Checklist-specific navigation or action path

2. Existing System Behavior  
   The legacy system had a separate checklist/document domain and the stock-tracking detail report exposed checklist data as a first-class section. The exact controller/view link shape is not recoverable, but the workflow clearly treated checklist as a reportable downstream area.

3. Current Next.js Status  
   The detail modal has downstream links for:
   - Insurance
   - RTO
   - Loan

   It has no checklist drill-through link.

4. Missing Functionality or Logic  
   - no checklist action or drill-through from the tracking detail modal

5. Required Improvement  
   - decide whether a checklist link should be added for parity/workflow completeness
   - if yes, point it to the relevant checklist page with compatible context

6. Relevant Existing Code Location, where possible  
   - Current modal: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`
   - Related module exists at: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\checklist`

7. Priority / Impact, where possible  
   Medium. It is a workflow gap relative to the other downstream sections.

### 2.16 Exact-Match Search Semantics
1. Feature / Business Logic Name  
   Exact-match stock filter semantics

2. Existing System Behavior  
   Legacy structured filters used exact equality against inventory fields.

3. Current Next.js Status  
   The current report uses one case-insensitive substring search box.

4. Missing Functionality or Logic  
   - no exact-match semantics for legacy fields
   - no discrete filter application model

5. Required Improvement  
   - if parity is required, implement exact-match structured filters rather than relying only on `includes`
   - document any intentional semantic changes

6. Relevant Existing Code Location, where possible  
   - Legacy filter rules: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current filter rules: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`

7. Priority / Impact, where possible  
   High. This changes how users target stock rows.

### 2.17 Server-Side Filter Contract
1. Feature / Business Logic Name  
   Server-side stock report search contract

2. Existing System Behavior  
   The legacy report had a formal `Search_Stock_Tracking_Report(objVM)` action and evaluated filters during query execution.

3. Current Next.js Status  
   The current page loads all stock rows and filters only in the browser.

4. Missing Functionality or Logic  
   - no server-side report filter contract
   - no search-param-driven data load
   - no scalable filtered query path

5. Required Improvement  
   - define a server-side filter contract
   - use page search params, server actions, or an API route
   - ensure export and detail flows can align with the same filter basis

6. Relevant Existing Code Location, where possible  
   - Legacy contract reference: `C:\KhizarShaikh\Project\ExcelCars\docs\module\ssot\05_SSOT_reporting-analytics.md`
   - Current page: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\reports\tracking\page.tsx`
   - Current query: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\queries.ts`

7. Priority / Impact, where possible  
   High. This affects parity, scalability, and future export behavior.

### 2.18 Report-Specific Permission Clarification
1. Feature / Business Logic Name  
   Report-specific access policy

2. Existing System Behavior  
   Legacy access metadata indicates `Stock_Tracking_Report` was its own access-function entry with intended role gating.

3. Current Next.js Status  
   The current page requires only an authenticated dashboard session. It does not apply role-specific report access.

4. Missing Functionality or Logic  
   - no Stock Tracking-specific permission check
   - no use of `roleName` for this module

5. Required Improvement  
   - decide whether report-specific authorization is required in the Next.js app
   - if yes, add explicit enforcement rather than relying only on login state

6. Relevant Existing Code Location, where possible  
   - Legacy access evidence: `C:\KhizarShaikh\Project\ExcelCars\db\ExcelCars_merged.sql`
   - Current auth shell: `C:\KhizarShaikh\Project\ExcelCarsNextJs\middleware.ts`
   - Current dashboard guard: `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\layout.tsx`
   - Current session fields: `C:\KhizarShaikh\Project\ExcelCarsNextJs\auth.config.ts`

7. Priority / Impact, where possible  
   High. This is a security/policy gap, not just a UX difference.

### 2.19 Legacy DSA Scope Clarification
1. Feature / Business Logic Name  
   Final DSA scope decision for Stock Tracking

2. Existing System Behavior  
   The legacy stock-tracking model retained DSA code only as commented-out logic. It was not active behavior.

3. Current Next.js Status  
   DSA is absent from the report entirely.

4. Missing Functionality or Logic  
   - no explicit decision record in the current module about DSA being intentionally out of scope

5. Required Improvement  
   - document DSA as intentionally excluded if that is the approved target
   - or implement it if product decides the commented-out legacy scope should be revived

6. Relevant Existing Code Location, where possible  
   - Legacy commented-out DSA section: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current tracking module: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking`

7. Priority / Impact, where possible  
   Medium. Mostly a scope-clarity item, but important for avoiding ambiguity later.

### 2.20 Null-Sensitive Data Handling Parity Review
1. Feature / Business Logic Name  
   Null-sensitive legacy field behavior review

2. Existing System Behavior  
   The legacy code used multiple direct casts and `Convert.*` calls on nullable database values, which could fail at runtime.

3. Current Next.js Status  
   The current implementation is more null-tolerant in several places, but does not attempt to replicate those legacy failure modes.

4. Missing Functionality or Logic  
   - no explicit decision record about whether modern defensive handling is acceptable vs strict parity

5. Required Improvement  
   - keep the modern safer behavior unless exact legacy error reproduction is required
   - if safer behavior is kept, document the intentional improvement when approved for merge

6. Relevant Existing Code Location, where possible  
   - Legacy null-sensitive mappings: `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`
   - Current null-tolerant handling: `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\TrackingClient.tsx`, `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\reports\tracking\queries.ts`

7. Priority / Impact, where possible  
   Low-Medium. More of a migration decision than a missing feature, but still a business-rule difference.

## 3. Priority Summary
Critical:
- Multi-row detail preservation

High:
- Structured stock filters
- Summary export
- Detail export
- Full inventory column coverage in summary grid
- Exact-match search semantics
- Server-side filter contract
- Report-specific permission clarification

Medium-High:
- Customer enrichment in summary grid
- Full detail field coverage for insurance
- Full detail field coverage for RTO
- Full detail field coverage for loan
- Dedicated detail page / workflow shape
- Detail header stock context

Medium:
- Full detail field coverage for checklist
- Checklist inner-join semantics
- Detail export empty-result handling
- Checklist drill-through / related actions
- Legacy DSA scope clarification

Low-Medium:
- Null-sensitive data handling parity review

## 4. Approval Rule
This file must remain separate from:
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\docs\module\ssot\stocktracking.md`

Until explicit approval is given:
- do not merge these items into the current-state SSOT as implemented behavior
- do not delete this improvement document
- do not treat these items as completed work

After explicit approval:
- implement the approved missing functionality as instructed
- update `stocktracking.md` to reflect newly implemented truth
- remove this improvement document only when the approved scope is fully merged and documented
