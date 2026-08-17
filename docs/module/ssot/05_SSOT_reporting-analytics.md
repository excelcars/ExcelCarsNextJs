# SSOT - reporting-analytics Module
## Status: Draft

**Module:** `reporting-analytics`  
**Project:** ExcelCars  
**Depends On:** `module/ssot/05_SSOT_home-auth-session.md`, `module/ssot/05_SSOT_admin-operations.md`, `module/ssot/05_SSOT_configuration-masters.md`

## 1. Purpose
This module owns the reporting screens that summarize operational data for stock, outstanding payouts, stock tracking, daily inquiry/follow-up activity, and exception logs.

It owns:
- report landing/menu navigation
- stock report search/export/detail photo lookup
- outstanding payment summary search/export
- stock tracking summary, detail drill-down, and export
- today's inquiry/follow-up report search/export
- system exception reporting screen and query flow

It does not own:
- creation or mutation of operational transactions
- login/session bootstrap
- notification/message sending

Primary controller:
- `ExcelCars/Controllers/ReportController.cs`

Primary supporting model namespaces:
- `ApModel/Model/Stock Report`
- `ApModel/Model/Outstanding_Payment_Report`
- `ApModel/Model/Stock_Tracking_Report`
- `ApModel/Model/Todays_Inquiry_And_Followup_Report`
- `ApModel/Model/Exception_Logging`
- `ApModel/Model/Common`

## 2. Locked v1 Scope
- report landing menu is exposed via `Report_Menu()`
- stock report supports:
  - open
  - search
  - export
  - inventory-photo detail fetch
- outstanding payment report supports:
  - open
  - customer autocomplete
  - registration autocomplete
  - search
  - export with summary total
- stock tracking report supports:
  - open
  - search
  - export
  - registration-based detail report
  - detail export
- today's inquiry/follow-up report supports:
  - open
  - search
  - export
- system exception report supports:
  - open
  - fetch exception info

Primary views directly owned:
- `Reports_Menu_View`
- `Stock_Report_View`
- `Outstanding_Payment_Report`
- `Stock_Tracking_Report`
- `Stock_Tracking_Details_Report`
- `Todays_Inquiry_And_Followup_Report`
- `ExceptionLogging`

## 3. Data Ownership
This module is read/report oriented. It does not own source-of-truth transactional tables, but it does own the query/read-model boundary for these projections:

Primary read-model groups:
- stock summary rows
- outstanding payout summary rows plus aggregate balance amount
- stock tracking summary rows
- stock tracking detail rows across related downstream processes
- today's inquiry/follow-up rows
- exception logging result sets

Export side effects:
- stock and summary reports are exported through `Utility.GetExcel(...)`
- outstanding payment export uses `Utility.GetExcelForSummaryReport(...)`
- stock tracking detail export delegates to `generateexcel1()`

## 4. Interface Contracts
Menu:
- `Report_Menu()`

Stock report contracts:
- `Stock_Report()`
- `Search_Stock_Report(objVM)`
- `ExportToExcel_StockReport(objVM)`
- `Get_Inventory_Details(InventoryID)`

Outstanding payment contracts:
- `Outstanding_Payment_Report()`
- `Autocomplete_Customer_Name(term)`
- `Autocomplete_Car_Registration_No(term)`
- `Search_Outstanding_Payment_Report(objvm)`
- `ExportToExcel_Outstanding_Payment_Report(objvm)`

Stock tracking contracts:
- `Stock_Tracking_Report()`
- `Search_Stock_Tracking_Report(objVM)`
- `ExportToExcel_Stock_Tracking_Report(objVM)`
- `Stock_tracking_Details_Report(Registrationno)`
- `ExportToExcel_Stock_Tracking_Details_Report(objVM)`

Today's inquiry/follow-up contracts:
- `Todays_Inquiry_Followup_Report()`
- `Search_Todays_Inquiry_Followup_Report(objvm)`
- `ExportToExcel_Todays_Inquiry_Followup_Report(objvm)`

System exception contracts:
- `ExceptionLogging()`
- `GetExceptionInfo(exceptionLoggingReportViewModel)`

## 5. Business Rules
- all report screens expect an authenticated session
- empty search results set warning messages through `TempData`
- export actions typically rerun the same search that drives the UI grid
- stock report and stock tracking report focus on inventory-centric columns such as make/model/variant/registration/tax/price/status
- outstanding payment export includes a summary total balance amount in addition to row data
- stock tracking detail report is a drill-down keyed by `Registrationno`
- exception report is a read-only administrative screen over persisted exception logs
- `ExportToExcel_Stock_Tracking_Details_Report` contains a dead condition checking `lst_search_main_list.Count < 0` to decide whether to show a "no records" warning; `Count` can never be negative, so that warning branch can never fire (a code bug, not a doc gap, but worth tracking since it affects the empty-result behavior described elsewhere in this doc)

## 6. Integration And Side Effects
- depends on reporting model classes in `ApModel`
- depends on `CommonFor_Model_Color_Variant` for some autocomplete support
- depends on `Utility` export helpers
- reads photo/detail information linked to inventory data
- logs unexpected controller exceptions through `Exceptioncatch.create(ex)`

## 7. Audit Requirements
Observed audit-related behavior:
- exception paths inside report execution are logged

Missing but implied audit needs:
- report execution itself is not visibly audited
- export generation events are not visibly audited
- sensitive report access is not separately logged beyond session/authorization enforcement

## 8. Tests Required
- each protected report page rejects missing session correctly
- stock report search and export return the same result set basis
- outstanding payment export includes the summary balance figure
- stock tracking detail report resolves correctly by registration number
- today's inquiry/follow-up export formats date values correctly
- exception log query returns persisted exception rows and handles empty result sets
