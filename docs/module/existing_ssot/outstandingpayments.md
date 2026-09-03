# SSOT - Existing Outstanding Payments Module
## Status: Existing system documented from legacy code, SQL artifacts, and second-pass review

**Legacy Module:** `Report/Outstanding_Payment_Report`  
**Legacy Project:** `ExcelCars` ASP.NET MVC / EF  
**Legacy Scope Covered By This SSOT:** existing Outstanding Payment Report behavior only  
**Primary evidence:** `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Outstanding_Payment_Report\Outstanding_Payment_Report.cs`, `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Common\CommonFor_Model_Color_Variant.cs`, `C:\KhizarShaikh\Project\ExcelCars\db\ExcelCars_merged.sql`, `C:\KhizarShaikh\Project\ExcelCars\db\excelCarsFinal.sql`, `C:\KhizarShaikh\Project\ExcelCars\docs\module\ssot\05_SSOT_reporting-analytics.md`

## 1. Purpose
This module is the existing reporting surface for outstanding third-party payout amounts associated with completed vehicle-related business flows.

It owns:
- read-only reporting of outstanding payment positions across:
  - `RTO`
  - `Insurance`
  - `Loan`
- filtering by:
  - customer name
  - car registration number
  - payout type
- customer autocomplete
- registration autocomplete
- row-wise outstanding balance calculation
- summary total outstanding amount calculation
- export of the report result set

It does not own:
- creating RTO, insurance, or loan records
- recording payouts or receipts
- customer master maintenance
- inventory master maintenance
- authentication/session bootstrap

## 2. Recovery Notes And Evidence Limits
This repository snapshot does not include the original MVC controller and Razor view for the legacy Outstanding Payment Report page.

Because of that:
- business logic and calculations are recovered directly from the surviving legacy model code
- autocomplete behavior is recovered from the shared legacy helper code
- permission intent is recovered from legacy access-function seed data
- report actions and scope are corroborated by the legacy reporting SSOT
- exact UI markup, field positioning, button IDs, and exact export layout are not directly recoverable from this snapshot

This SSOT therefore distinguishes between:
- directly proven behavior
- inferred behavior supported by surviving contracts and docs
- unresolved legacy drift where code artifacts conflict

## 3. Locked Existing Scope
- the report exists in the legacy report area under `Outstanding_Payment_Report()`
- the module is read-only
- the module supports:
  - opening the report screen
  - customer autocomplete
  - registration autocomplete
  - searching
  - exporting
  - summary total display
- blank filter values are treated as no filter
- one report run can merge rows from multiple business domains into one combined list

Supported types proven by the surviving legacy model:
- `RTO`
- `Insurance`
- `Loan`

Additional types referenced only by the legacy stored procedure:
- `Financial`
- `DSA`

This type mismatch is a legacy inconsistency and must be treated as unresolved existing-system drift.

## 4. Data Ownership
This module is a read-model/reporting module. It does not own the source transactional records.

### 4.1 Legacy tables used directly by surviving application code
- `RTO_Agent`
- `Insurance_Main`
- `Loan_Management`
- `Inventory_Management`

### 4.2 Legacy tables referenced by the stored procedure
- `RTO_Agent`
- `Insurance_Main`
- `Financial_Management`
- `DSA_Management`
- `Customer`

### 4.3 Legacy filter fields
- `Form_Customer_Name`
- `Form_Car_Registration_No`
- `Form_Type`

### 4.4 Legacy output/display fields
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

## 5. Interface Contracts

### 5.1 Legacy report contracts documented by module SSOT
- `Outstanding_Payment_Report()`
- `Autocomplete_Customer_Name(term)`
- `Autocomplete_Car_Registration_No(term)`
- `Search_Outstanding_Payment_Report(objvm)`
- `ExportToExcel_Outstanding_Payment_Report(objvm)`

### 5.2 Legacy model methods still present in code
- `Outstanding_Payment_Report.Search_OutStanding_Payment()`
- `Outstanding_Payment_Report.Auto_Car_Registration_No(string term)`
- `CommonFor_Model_Color_Variant.CustName_Inquiry_Master_Autocomplete(string term)`

### 5.3 Functional actions owned by the page
- open report page
- enter or select customer name
- enter or select registration number
- select or clear type filter
- run search
- view merged result rows
- view total outstanding balance
- export current report output

## 6. Existing Business Logic

### 6.1 Search assembly flow
- `Search_OutStanding_Payment()` resets `Total_Bal_Amount` to `0`
- the result collection `lst_search_main_list` is an instance field and rows are appended into it during search execution
- the result collection is not explicitly cleared inside `Search_OutStanding_Payment()`
- if `Form_Type` is blank, the method executes all supported type branches and merges them into one flat list
- if `Form_Type` is `RTO`, only the RTO branch executes
- if `Form_Type` is `Insurance`, only the Insurance branch executes
- if `Form_Type` is `Loan`, only the Loan branch executes
- the legacy model normalizes different source tables into one report row shape

### 6.2 Search filter semantics
- customer filter is exact match:
  - `RTO.Customer_Name == Form_Customer_Name`
  - `Insurance.Customer_Name == Form_Customer_Name`
  - `Loan.Customer_Name == Form_Customer_Name`
- registration filter is exact match:
  - `RTO.Car_Registration_No == Form_Car_Registration_No`
  - `Insurance.Car_Registration_No == Form_Car_Registration_No`
  - `Loan.Registration_No == Form_Car_Registration_No`
- if customer filter is blank, customer is not filtered
- if registration filter is blank, registration is not filtered
- if type is blank, type is not filtered

### 6.3 Type-specific mapping and calculation rules

RTO:
- source table: `RTO_Agent`
- row key field: `RTO_Agent_Main_ID`
- output `Type_Value = 'RTO'`
- `Inventory_ID` comes from `Inventory_ID`
- `Customer_ID` comes from `Customer_ID`
- `Customer_Name` comes from `Customer_Name`
- `Customer_Mobile` comes from `Customer_Mob`
- `Customer_Email` comes from `Customer_Email`
- `Car_Registration_No` comes from `Car_Registration_No`
- `Remark` comes from `Remark`
- `Payment_Status` comes from `Payment_Status`
- `Total_Amount = Transfer_Charges`
- `Amount_Paid = Amt_Paid`
- `Bal_Amount = Total_Amount - Amount_Paid`
- `Percentage_of_Payout` is not populated
- `Payout_Amount` is not populated

Insurance:
- source table: `Insurance_Main`
- row key field: `Insurance_Main_ID`
- output `Type_Value = 'Insurance'`
- `Inventory_ID` comes from `Inventory_ID`
- `Customer_ID` comes from `Customer_ID`
- `Customer_Name` comes from `Customer_Name`
- `Customer_Mobile` comes from `Customer_Mobile`
- `Customer_Email` comes from `Customer_Email`
- `Car_Registration_No` comes from `Car_Registration_No`
- `Remark` comes from `Remark`
- `Payment_Status` comes from `Payout_payment_Status`
- `Total_Amount = O_D_Premium`
- `Percentage_of_Payout = Payout_percentage_OD_Premium`
- `Payout_Amount = Payout_Amount`
- `Amount_Paid = Total_Amount_Received`
- `Bal_Amount = Payout_Amount - Amount_Paid`

Loan:
- source table: `Loan_Management`
- row key field: `Loan_Management_ID`
- output `Type_Value = 'Loan'`
- `Inventory_ID` comes from `Inventory_ID`
- `Customer_ID` comes from `Customer_ID`
- `Customer_Name` comes from `Customer_Name`
- `Customer_Mobile` comes from `Customer_Mobile`
- `Customer_Email` comes from `Customer_Email`
- `Car_Registration_No` comes from `Registration_No`
- `Remark` comes from `Remarks`
- `Payment_Status` comes from `Payment_Status`
- `Total_Amount = Loan_Amount`
- `Percentage_of_Payout = Percentage_Payout_Amount`
- `Payout_Amount = Payout_Amount`
- `Amount_Paid = Total_Amount_Received`
- `Bal_Amount = Payout_Amount - Amount_Paid`

### 6.4 Summary total rules
- every generated row contributes its `Bal_Amount` into `Total_Bal_Amount`
- the report total is the sum of all included row balances
- there is no protective rule preventing zero-balance rows from being included
- there is no protective rule preventing negative balances from being included
- overpaid rows can therefore reduce the total outstanding amount

### 6.5 Row inclusion rules in surviving legacy model
- the model does not explicitly exclude fully paid rows
- the model does not explicitly exclude zero-balance rows
- the model does not explicitly exclude negative-balance rows
- the model does not sort the final output list
- if the same model instance were reused across multiple searches, prior rows could remain in `lst_search_main_list`; this is a code-level statefulness risk, though typical MVC request lifecycles likely instantiate a fresh model per request

### 6.6 Autocomplete behavior
Customer autocomplete:
- the legacy reporting contract declares `Autocomplete_Customer_Name(term)`
- the closest surviving implementation evidence is `CustName_Inquiry_Master_Autocomplete(term)`
- candidate values are pulled from:
  - `Inquiries.Customer`
  - `Customers.Cust_Name`
- the two sets are combined using `Union`
- matching is prefix-based with `StartsWith(term)`

Registration autocomplete:
- `Auto_Car_Registration_No(term)` pulls distinct registration numbers from `Inventory_Management`
- matching is prefix-based with `StartsWith(term)`

## 7. Existing UI And User Interactions
The exact Razor markup is not present, but the recoverable behavior indicates a report screen with a filter section and read-only result grid.

Recoverable interactions:
- user opens Outstanding Payment Report from the report area
- user enters or selects a customer name
- user enters or selects a car registration number
- user selects a type or leaves type blank for all
- user runs a search
- user views the result list and summary balance
- user exports the report

Recoverable screen capabilities:
- customer lookup/autocomplete
- registration lookup/autocomplete
- type filtering
- merged multi-source listing
- summary total display
- export action

Not directly recoverable from this snapshot:
- exact button labels
- exact filter layout
- exact table column order in UI
- exact empty-result messaging
- pagination behavior
- client-side sorting controls

## 8. Existing Access And Permissions
- the report belongs to the protected reporting module area
- `Access_Function` contains `Outstanding_Payment_Report`
- legacy seed data records `Role_ID_legacy` as `,1,2,`

Later hardened schema evidence shows:
- `Access_Function_Role(17, 1)`
- `Access_Function_Role(17, 2)`
- `Access_Function_Role(17, 3)`

Existing-system conclusion:
- original legacy permission seed suggests roles `1` and `2`
- a later migration/hardening snapshot expands effective access evidence to include role `3`
- this should be treated as existing-system permission drift until business owners confirm the authoritative rule

## 9. Existing Export Behavior
The legacy reporting SSOT confirms the module supports export and that outstanding payment export includes a summary total.

Existing-system export rules recoverable from evidence:
- export is based on the same report function/search basis as the visible result set
- export includes the outstanding payment rows
- export includes a summary total balance amount
- the legacy reporting SSOT identifies outstanding payment export as using `Utility.GetExcelForSummaryReport(...)`

Not directly recoverable from this snapshot:
- exact export format helper invocation for this report page
- exact filename
- exact column order
- the exact controller-side column mapping and workbook formatting

## 10. Existing-System Drift And Ambiguities

### 10.1 Stored procedure vs surviving model drift
The stored procedure `SP_Get_Outstanding_Payment_Report` conflicts with the surviving model:

Stored procedure:
- includes `RTO`, `Insurance`, `Financial`, and `DSA`
- excludes rows already paid by payment-status field
- orders results by `Inventory_ID`

Surviving model:
- includes `RTO`, `Insurance`, and `Loan`
- does not exclude paid rows explicitly
- does not sort results explicitly
- comments out the stored procedure call and uses direct table queries instead

### 10.2 Business-critical conflict: paid-row filtering
This is the most important business-logic conflict in the existing system.

Conflict:
- the stored procedure implies an "outstanding only" interpretation by excluding rows already marked paid
- the surviving model implies a "balance calculation report" interpretation by including rows regardless of paid status and deriving `Bal_Amount` from source amounts

Evidence from the live legacy output supplied during SSOT review:
- the `/Report/Search_Outstanding_Payment_Report` output includes many rows with:
  - `Payment Status = Fully Paid`
  - `Payment Status = Paid`
- many of those rows still appear in the report with `Bal Amt = 0.00`
- some rows appear with negative balances such as:
  - `-1000.00`
  - `-1.00`
  - `-6000.00`
- the pasted output ends with `Total Bal amt = -13004.00`

Interpretation:
- the live page output behaves much more like the surviving model than like the stored procedure
- in actual user-visible behavior, the report appears to have been used as a computed-balance report, not a strict unpaid-only report
- this conflict must remain explicitly documented because the database stored procedure still communicates a different business rule

SSOT position:
- when documenting the existing user-visible system behavior, the paid-row inclusion behavior is the more credible interpretation
- when documenting technical legacy drift, the stored procedure conflict must still be preserved as unresolved evidence

### 10.3 Business-critical conflict: type scope
This is the second major business-definition conflict in the existing system.

Conflict:
- the surviving model supports `RTO`, `Insurance`, and `Loan`
- the stored procedure supports `RTO`, `Insurance`, `Financial`, and `DSA`

Evidence from the supplied live legacy output:
- the sample output contains `RTO` rows
- the sample output contains `Insurance` rows
- the sample output does not contain `Financial`
- the sample output does not contain `DSA`
- the sample output also does not prove whether `Loan` was absent from the live page globally or just absent from this specific search result

Interpretation:
- the supplied output weakens the case that `Financial` and `DSA` were part of the commonly used live report behavior
- the supplied output is consistent with the surviving model’s narrower business scope
- however, the sample alone is not enough to definitively prove whether `Loan` was present in all real legacy report executions

SSOT position:
- `Financial` and `DSA` must remain documented as legacy drift evidence, not as proven existing-screen scope
- `RTO` and `Insurance` are proven by live output
- `Loan` remains supported by surviving model code but is not proven by the supplied sample output

### 10.4 What this means for SSOT
For this existing-system SSOT:
- the surviving model is the strongest executable evidence for row construction and balance calculation
- the stored procedure is still important because it proves unresolved legacy drift
- `Financial` and `DSA` cannot be claimed as definitively in-scope without business confirmation
- payment-status-based exclusion cannot be claimed as universally authoritative across all legacy code paths

## 11. Required Existing-System Rules To Preserve In Any Migration
- the module remains read-only
- the module combines multiple operational sources into one report
- type filtering supports at least `RTO`, `Insurance`, and `Loan`
- customer and registration filters are supported
- autocomplete support exists for customer and registration entry
- row balances are calculated with source-specific formulas
- a total outstanding balance is displayed/calculated for the current result set
- export uses the report result set and includes the summary total

## 12. Tests Required
- blank type returns merged rows across supported report types
- type filter restricts the result set to the selected type only
- blank customer and registration filters do not restrict the result set
- customer filter uses exact-match semantics
- registration filter uses exact-match semantics
- RTO balance equals `Transfer_Charges - Amt_Paid`
- Insurance balance equals `Payout_Amount - Total_Amount_Received`
- Loan balance equals `Payout_Amount - Total_Amount_Received`
- summary total equals the sum of included row balances
- customer autocomplete returns a union of inquiry customer names and customer-master names
- registration autocomplete returns distinct registration numbers from inventory
- export includes the same logical result basis as the visible report
- export includes the summary total
- permission behavior is validated against whichever legacy authorization source is approved as authoritative

## 13. SSOT Rule
This file is the existing-system SSOT for the Outstanding Payment Report module.

Until conflicting legacy evidence is explicitly resolved:
- the surviving legacy model code is the primary source of truth for business logic and calculations
- the stored procedure and access-function artifacts are secondary sources that reveal legacy drift and must not be ignored
- any migration or rewrite must preserve the proven behavior here unless an explicit replacement rule is approved
