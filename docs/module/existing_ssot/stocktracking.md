# SSOT - Existing Stock Tracking Report Module
## Status: Existing system documented from legacy code and SQL artifacts

**Legacy Module:** `Report/Search_Stock_Tracking_Report` / `Stock_Tracking_Report`  
**Legacy Project:** `ExcelCars` ASP.NET MVC / EF  
**Legacy Scope Covered By This SSOT:** existing Stock Tracking Report behavior only  
**Primary evidence:** `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Stock_Tracking_Report\Stock_Tracking_Report.cs`, `C:\KhizarShaikh\Project\ExcelCars\db\ExcelCars_merged.sql`, `C:\KhizarShaikh\Project\ExcelCars\db\excelCarsFinal.sql`, `C:\KhizarShaikh\Project\ExcelCars\docs\module\ssot\05_SSOT_reporting-analytics.md`

## 1. Purpose
This module is the existing stock-centric tracking report for vehicles in the legacy system.

It owns:
- stock-level reporting over inventory records
- filtering stock rows by vehicle attributes
- registration-based drill-down into downstream process records
- checklist/document visibility within the detail report
- insurance visibility within the detail report
- RTO visibility within the detail report
- loan visibility within the detail report
- stock-tracking summary export
- stock-tracking detail export

It does not own:
- inventory creation or editing
- checklist creation or editing
- insurance creation or editing
- RTO creation or editing
- loan creation or editing
- authentication/session bootstrap

## 2. Recovery Notes And Evidence Limits
This repository snapshot contains the legacy stock-tracking model, the legacy stock-tracking stored procedure, and the higher-level legacy reporting SSOT.

This snapshot does not contain the original MVC controller or Razor view for the Stock Tracking Report screen.

Because of that:
- main search logic is directly recoverable from the surviving model code
- detail assembly logic is directly recoverable from the surviving model code
- detail export layout is directly recoverable from the surviving model code
- action-level report scope is corroborated by the legacy reporting SSOT
- the existence of summary export is corroborated by the legacy reporting SSOT, but its exact controller-side implementation is not directly recoverable from this snapshot
- exact page markup, control IDs, button text, client-side scripts, and TempData messages are not directly recoverable from this snapshot

When this document describes page-level actions such as open/search/export/detail, those actions are grounded in:
- surviving model methods
- legacy reporting SSOT action contracts

## 3. Locked Existing Scope
- the stock tracking report exists in the legacy report area under `Stock_Tracking_Report()`
- the module is read-only
- the module supports:
  - opening the report screen
  - searching
  - exporting the summary report
  - opening a registration-based detail report
  - exporting the detail report
- the report is inventory-centric, not an audit-history table
- the detail view is keyed by `Registration_No`
- the detail report combines stock data with related downstream operational records for the same registration number
- DSA detail logic is present only as commented-out code and is not active behavior

## 4. Data Ownership
This module is a read-model/reporting module. It does not own transactional source records.

### 4.1 Legacy tables read directly by the surviving model
- `Inventory_Management`
- `Customers`
- `Check_List_Doc_Main`
- `CheckList_Doc_Details`
- `Insurance_Main`
- `RTO_Agent`
- `Loan_Management`

### 4.2 Legacy stored procedure source
- `Inventory_Management`

### 4.3 Main-search filter fields
- `Form_Make`
- `Form_Model`
- `Form_Variant`
- `Form_Colour`
- `Form_Fuel_Type`

### 4.4 Main-search output/display fields
- `Inventory_ID`
- `Make`
- `Model`
- `Variant`
- `Colour`
- `SKU`
- `Year`
- `Month`
- `Fuel_Type`
- `No_of_owners`
- `Tax`
- `Registration_No`
- `Kms_Driven`
- `Insurance_Type`
- `Price`
- `Other_Remarks`
- `Status`
- `Owned_Type`
- `Owned_By`
- `Mobile_No_Owned_By`
- `Email_ID_Owned_By`
- `Customer_ID`
- `Customer_Name`
- `Customer_Address`
- `Customer_Mobile`
- `Customer_Email`

### 4.5 Detail-report sections and fields
Checklist section fields:
- `Document_ID`
- `Inventory_ID`
- `Make`
- `Model`
- `Variant`
- `Colour`
- `Registration_No`
- `Year`
- `Fuel_Type`
- `Customer_ID`
- `Customer_Name`
- `Customer_Mobile`
- `Customer_Email`
- `Checklist_Details_ID`
- `FK_Document_ID`
- `Document_Name`
- `Applicable`
- `Received`
- `Original_Copy`

Insurance section fields:
- `Insurance_Main_ID`
- `Inventory_ID`
- `Agent_Name`
- `Agent_Mobile_No`
- `Agent_Email_ID`
- `Renewal_Date`
- `Expiry_Date`
- `Customer_ID`
- `Customer_Name`
- `Car_Model`
- `Car_Registration_No`
- `Insurance_Premium`
- `O_D_Premium`
- `Payout_percentage_OD_Premium`
- `Payout_Amount`
- `Payout_payment_Status`
- `Policy_Status`
- `Remark`

RTO section fields:
- `Agent_id`
- `Inventory_ID`
- `Agent_Name`
- `Agent_Mobile_no`
- `Agent_Email_ID`
- `Date_of_Entry`
- `Customer_ID`
- `Customer_Name`
- `Car_Make_Model`
- `Car_Registration_No`
- `Transfer_Charges`
- `Payment_Status`
- `Payment_Date`
- `RC_Status`
- `Remark`

Loan section fields:
- `Financial_Management_ID`
- `Financial_Entry_Date`
- `Bank_Name`
- `Bank_Person_Name`
- `Bank_Person_Mobile_No`
- `Bank_Person_Email_ID`
- `Customer_ID`
- `Customer_Name`
- `Inventory_ID`
- `Registration_No`
- `Car_Model`
- `Loan_Amount`
- `Percentage_Payout_Amount`
- `Payout_Amount`
- `Payment_Status`
- `Payment_Date`
- `Amount_Received`
- `Remarks`

## 5. Interface Contracts

### 5.1 Legacy contracts documented by the reporting SSOT
- `Stock_Tracking_Report()`
- `Search_Stock_Tracking_Report(objVM)`
- `ExportToExcel_Stock_Tracking_Report(objVM)`
- `Stock_tracking_Details_Report(Registrationno)`
- `ExportToExcel_Stock_Tracking_Details_Report(objVM)`

### 5.2 Legacy model methods still present in code
- `Stock_Tracking_Report.Search_Stock_Tracking_Report()`
- `Stock_Tracking_Report.Stock_Details_Report(string RegistrationNO)`
- `Stock_Tracking_Report.generateexcel1()`

### 5.3 Functional actions owned by the page
- open stock tracking report
- enter search filters
- run search
- view the summary result set
- open detail by registration number
- export the summary result set
- export the detail result

## 6. Existing Business Logic

### 6.1 Main search behavior
- `Search_Stock_Tracking_Report()` queries `Inventory_Management` directly
- every filter is optional
- filtering uses exact equality checks, not partial matches
- the method builds an anonymous query projection and then maps each row into a `Stock_Tracking_Report` object
- the result list is appended into `lst_search_main_list`
- `lst_search_main_list` is not explicitly cleared inside the method
- no explicit sort is applied in the surviving model

### 6.2 Main search filter semantics
Make:
- applied only when `Form_Make` is not empty
- rule: `t.Make == Form_Make`

Model:
- applied only when `Form_Model` is not empty
- rule: `t.Model == Form_Model`

Variant:
- applied only when `Form_Variant` is not empty
- rule: `t.Variant == Form_Variant`

Colour:
- applied only when `Form_Colour` is not empty
- rule: `t.Colour == Form_Colour`

Fuel Type:
- applied only when `Form_Fuel_Type` is not empty
- rule: `t.Fuel_Type == Form_Fuel_Type`

### 6.3 Main search row mapping
For each matched inventory row, the report copies:
- `Inventory_ID`
- `Make`
- `Model`
- `Variant`
- `Colour`
- `SKU`
- `Year`
- `Month`
- `Fuel_Type`
- `No_of_owners`
- `Tax`
- `Registration_No`
- `Kms_Driven`
- `Insurance_Type`
- `Price`
- `Other_Remarks`
- `Status`
- `Owned_Type`
- `Owned_By`
- `Mobile_No_Owned_By`
- `Email_ID_Owned_By`
- `Customer_ID`
- `Customer_Name`

Additional enrichment rules:
- `Customer_Address`, `Customer_Mobile`, and `Customer_Email` are initialized to blank strings
- if `Customer_ID != 0`, the report performs a lookup in `Customers` by `Cust_Id`
- when a matching customer exists:
  - `Customer_Address = cust.Cust_Address`
  - `Customer_Mobile = cust.Cust_Mobile`
  - `Customer_Email = cust.Cust_Email`
- when no matching customer exists, those enriched fields remain blank

Additional second-pass observations from the mapping code:
- `Inventory_Number` is selected in the query projection but is not mapped onto the report object
- `Upload_Photo` exists as a report property but the mapping line is commented out, so photo information is not populated by the surviving model
- the model uses `Convert.ToInt32` and `Convert.ToDecimal` on several projected values:
  - `Year`
  - `No_of_owners`
  - `Kms_Driven`
  - `Customer_ID`
- if those underlying values are null or non-convertible in the database, the search path can fail at runtime

### 6.4 Registration-based detail behavior
`Stock_Details_Report(RegistrationNO)` assembles a detailed report for one registration number.

Stock header behavior:
- the method first loads one `Inventory_Management` row using `SingleOrDefault(t => t.Registration_No == RegistrationNO)`
- when found, it copies:
  - `Inventory_ID`
  - `Registration_No`
  - `Model`
  - `Variant`
  - `Colour`
  - `Customer_Name`
  - `Make`

Checklist section behavior:
- built from `Check_List_Doc_Main` joined to `CheckList_Doc_Details`
- join key is `Document_ID == FK_Document_ID`
- filtered by `t.Registration_No == RegistrationNO`
- the join is an inner join
- each joined detail row becomes one `Check_List_Documents_Stock_Details_Report` row
- all matching checklist rows are loaded into `lst_chklist`

Checklist section implications:
- a checklist main record with no matching detail rows will not appear in `lst_chklist`
- in that case, the detail/export checklist section behaves as if no checklist record exists and writes `No Record found`

Insurance section behavior:
- built from `Insurance_Main`
- filtered by `t.Car_Registration_No == RegistrationNO`
- all matching rows are loaded into `lst_insurancelist`

RTO section behavior:
- built from `RTO_Agent`
- filtered by `t.Car_Registration_No == RegistrationNO`
- all matching rows are loaded into `lst_rtolist`

Loan section behavior:
- built from `Loan_Management`
- filtered by `t.Registration_No == RegistrationNO`
- all matching rows are loaded into `lst_financiallist`

DSA section behavior:
- DSA query logic exists only as commented-out code
- there is no active DSA section in the surviving module behavior

Composite detail object behavior:
- the method creates one `Stock_Tracking_Details_Report`
- it assigns:
  - `lst_chklist_export = lst_chklist`
  - `lst_insurancelist_export = lst_insurancelist`
  - `lst_rtolist_export = lst_rtolist`
  - `lst_financiallist_export = lst_financiallist`
- that composite object is appended to `lst_stocktracking_details_rpt`

Null-safety behavior in detail assembly:
- the checklist projection explicitly casts nullable source fields such as `Inventory_ID`, `Year`, `Customer_ID`, and `FK_Document_ID` to non-nullable ints
- the insurance projection explicitly casts nullable source fields such as `Inventory_ID`, `Renewal_Date`, `Expiry_Date`, `Customer_ID`, `Insurance_Premium`, `O_D_Premium`, `Payout_percentage_OD_Premium`, and `Payout_Amount`
- the RTO projection explicitly casts nullable source fields such as `Inventory_ID`, `Date_of_Entry`, `Customer_ID`, `Transfer_Charges`, and `Payment_Date`
- the loan projection explicitly casts nullable source fields such as `Entry_Date`, `Customer_ID`, `Inventory_ID`, `Loan_Amount`, `Percentage_Payout_Amount`, `Payout_Amount`, `Payment_Date`, and `Total_Amount_Received`
- if any of those values are null in the underlying record, the detail assembly path can fail at runtime

### 6.5 Export behavior for detail report
`generateexcel1()` writes the detail report directly as CSV to the HTTP response.

Precondition:
- export runs only when `lst_stocktracking_details_rpt.Count > 0`

Response behavior:
- adds header `Content-Disposition: attachment; filename=Stock_Tracking_Details_Report.csv`
- sets content type to `text/csv`
- sets response encoding to UTF-8
- writes CSV content and ends the response

Detail export layout:
- starts with a stock header row:
  - `Registration No`
  - `Make`
  - `Model`
  - `Variant`
  - `Colour`
  - `Customer Name`
- then writes separate sections for:
  - `Check List Document`
  - `Insurance Details`
  - `RTO Details`
  - `Loan Details`

Checklist export rules:
- when checklist rows exist, writes columns:
  - `Registration_No`
  - `Customer_Name`
  - `Customer_Mobile`
  - `Customer_Email`
  - `Document_Name`
  - `Applicable`
  - `Received`
  - `Original_Copy`
- when no checklist rows exist, writes `No Record found`

Insurance export rules:
- when insurance rows exist, writes columns:
  - `Insurance Agent Name`
  - `Insurance Agent Mobile No`
  - `Insurance Agent Email`
  - `Renewal Date`
  - `Expiry Date`
  - `Insurance Premium`
  - `O D Premium`
  - `Payout Percentage OD Premium`
  - `Payout Amount`
  - `Payout payment Status`
  - `Policy Status`
  - `Remark`
- when no insurance rows exist, writes `No Record found`

RTO export rules:
- when RTO rows exist, writes columns:
  - `RTO Entry Date`
  - `RTO Agent Name`
  - `RTO Agent Mobile No`
  - `RTO Agent Email`
  - `Transfer Charges`
  - `Payment Status`
  - `Payment Date`
  - `RC Status`
  - `Remark`
- when no RTO rows exist, writes `No Record found`

Loan export rules:
- when loan rows exist, writes columns:
  - `Entry Date`
  - `Bank Name`
  - `Bank Person Name`
  - `Bank Person Mobile No`
  - `Bank Person Email`
  - `Loan Amount`
  - `Percentage Payout Amount`
  - `Payout Amount`
  - `Payment Status`
  - `Payment Date`
  - `Amount Received`
  - `Remark`
- when no loan rows exist, writes `No Record found`

DSA export rules:
- DSA export code is present only as commented-out code
- DSA is not part of active export behavior

Empty-result behavior note from second review:
- the higher-level reporting SSOT records that `ExportToExcel_Stock_Tracking_Details_Report` contains a dead condition checking `lst_search_main_list.Count < 0` to decide whether to show a no-records warning
- `Count < 0` can never be true
- the exact controller code is not present in this snapshot, but this should be treated as a real legacy behavior note attached to the detail-export flow

### 6.6 Stored procedure drift
The stored procedure `SP_Stock_Tracking_Report` does not exactly match the surviving model code.

Stored procedure behavior:
- parameters:
  - `@Model`
  - `@Variant`
  - `@Colour`
  - `@Fuel_Type`
- filters only by:
  - model
  - variant
  - colour
  - fuel type
- selects inventory rows from `Inventory_Management`
- does not filter by make

Surviving model behavior:
- filters by make, model, variant, colour, and fuel type
- enriches rows with customer contact data from `Customers`
- does not call the stored procedure in the surviving search method

For SSOT purposes, the surviving model code is the strongest executable evidence for actual module behavior, and the stored procedure mismatch is a legacy inconsistency that should be recorded rather than normalized away.

## 7. Existing UI And User Interactions
The original Razor markup is not present in this repository snapshot, so exact control labels and layout cannot be recovered directly.

Recoverable functional interactions are:
- open Stock Tracking Report from the report area
- choose or enter filter values for:
  - make
  - model
  - variant
  - colour
  - fuel type
- run search
- review stock rows in the result grid
- open a detail report for a specific registration number
- export the summary report
- export the detail report

Recoverable detail-view behavior:
- view stock header information for the selected registration number
- view checklist/document rows
- view insurance rows
- view RTO rows
- view loan rows

Second-pass scope note:
- no surviving evidence shows sorting, pagination, inline edit actions, or calculation fields on the stock-tracking summary grid itself
- no surviving evidence shows any active DSA button, link, or section in the stock-tracking detail flow

## 8. Existing Access And Permissions
- `Access_Function` seed data contains `Stock_Tracking_Report` with legacy role list `,1,2,`
- hardened `Access_Function_Role` rows also include role `3`
- the higher-level legacy auth/session SSOT records that the custom authorization implementation had commented-out enforcement in places

Safest recoverable statement:
- the module was intended to be function-level protected
- exact runtime enforcement details cannot be fully proven from the missing controller snapshot

## 9. Existing Risks And Edge Cases
- `lst_search_main_list` is an instance field and is not explicitly cleared inside `Search_Stock_Tracking_Report()`
- `lst_stocktracking_details_rpt` is an instance field and is appended to during detail assembly
- if a model instance were reused unexpectedly, stale in-memory rows could persist across calls
- `SingleOrDefault` on `Inventory_Management` by registration number assumes registration numbers are unique in practice
- the checklist section uses an inner join, so checklist headers without detail rows disappear from the result
- multiple main-search and detail-search fields are cast from nullable database columns to non-nullable CLR types without guards
- `Inventory_Number` is selected but unused
- `Upload_Photo` exists on the model but is not populated by the active search mapping
- detail export has no alternate branch for `lst_stocktracking_details_rpt.Count == 0`; it simply does nothing
- DSA logic is visibly half-retained as commented code, which shows legacy scope drift but not active behavior
- the legacy reporting SSOT also records a dead `Count < 0` condition in the detail-export controller path for deciding whether to show a no-records warning

## 10. Migration Rules For SSOT Compliance
Any future rewrite intended to preserve existing behavior should treat these as part of the current legacy contract:
- the module is read-only
- the main report is inventory-centric
- the detail report is keyed by registration number
- structured filters exist for make, model, variant, colour, and fuel type
- the detail report includes checklist, insurance, RTO, and loan sections
- DSA is not part of active stock-tracking behavior
- detail export is a first-class existing capability
- multiple matching downstream rows per registration number are preserved in the detail report

## 11. Tests Required
- main report search filters by make correctly
- main report search filters by model correctly
- main report search filters by variant correctly
- main report search filters by colour correctly
- main report search filters by fuel type correctly
- blank filters return unfiltered stock rows
- customer enrichment is populated when `Customer_ID` resolves to a `Customers` row
- search behavior remains stable when nullable stock fields are present, or null-sensitive failures are explicitly handled
- detail report resolves correctly by registration number
- checklist detail join returns the expected document rows
- checklist main rows with no detail rows are understood as absent from the returned checklist section
- insurance detail list returns all matching registration rows
- RTO detail list returns all matching registration rows
- loan detail list returns all matching registration rows
- detail export writes stock header information first
- detail export writes `No Record found` for empty sections
- DSA is not rendered or exported as active behavior

## 12. SSOT Rule
For the existing-system SSOT, the surviving legacy model code is the primary source of truth for:
- search behavior
- detail assembly
- export behavior

The legacy reporting SSOT and SQL artifacts are supporting evidence for module scope and contract names, but they do not override the executable behavior visible in `Stock_Tracking_Report.cs`.
