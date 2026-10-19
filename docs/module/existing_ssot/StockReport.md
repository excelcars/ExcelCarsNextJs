# SSOT - Existing Stock Report Module
## Status: Existing system documented from legacy source code; migration notes include Next.js `/reports/tracking`

**Legacy module:** `/Report/Stock_Report` (displayed as **Stock Report**)  
**Legacy project:** `C:\KhizarShaikh\Project\ExcelCars` ASP.NET MVC / Entity Framework  
**Target project:** `C:\KhizarShaikh\Project\ExcelCarsNextJs`  
**Target route reviewed:** `/reports/tracking` (Stock Tracking, a separate legacy function)  
**Primary evidence:** `ExcelCars/Controllers/ReportController.cs`, `ExcelCars/Views/Report/Stock_Report_View.cshtml`, `ExcelCars/ViewModel/Stock_Report_ViewModel.cs`, `ApModel/Model/Stock Report/Stock_Report.cs`, `ApModel/Model/Common/CommonFor_Model_Color_Variant.cs`, `ExcelCars/Controllers/AdminController.cs`, `ExcelCars/Views/Report/Reports_Menu_View.cshtml`, `ExcelCars/Views/Shared/Menu.cshtml`.

## 1. Purpose and scope

The Stock Report is a read-only inventory report. It lets an authorized user search inventory by vehicle and ownership attributes, inspect the inventory photographs for a row, and export the search result to Excel.

It owns:

- report-screen rendering and reset/search/export actions
- optional multi-field inventory filtering
- inventory-row presentation
- customer-contact enrichment for inventory rows linked to a customer
- inventory-photo lookup and modal display
- Excel export of the report projection

It does not own:

- inventory creation, editing, status changes, or deletion
- customer or vehicle-master maintenance
- photo upload or deletion
- stock tracking/history (that is `/Report/Stock_Tracking_Report`)
- checklist, insurance, RTO, loan, inquiry, or payment workflows

The module is inventory-centric: one result row represents one `Inventory_Management` record.

## 2. Navigation and access

### 2.1 Entry points

The report is reachable through both legacy navigation surfaces:

- Shared report-panel menu: `Report Panel` → `Stock Report` → `Report/Stock_Report`
- Report landing page: `Report_Menu` → tile/link `/Report/Stock_Report`

Both menu entries render only when `SessionInfo.AppFunctionList` contains `Stock_Report`.

### 2.2 Controller protection

`ReportController` has `SessionExpireFilterAttribute`. The three Stock Report actions also have `AuthorizeFilter(DatabaseFunctionname = "Stock_Report")`:

| Action | Verb/behavior | Result |
|---|---|---|
| `Stock_Report()` | GET/open/reset | Creates a new `Stock_Report_ViewModel` and renders `Stock_Report_View`. |
| `Search_Stock_Report(Stock_Report_ViewModel objVM)` | POST/search | Runs the model query and re-renders the same view. |
| `ExportToExcel_StockReport(Stock_Report_ViewModel objVM)` | POST/export | Re-runs the model query, creates an export projection, calls `Utility.GetExcel`, then re-renders the view. |

Each action checks `Session["SessionInfo"]`. If it is null, the action redirects to `Home/Logout`.

The view's autocomplete calls are made to `AdminController`, which also has `SessionExpireFilterAttribute`, but the individual autocomplete methods have no Stock Report-specific `AuthorizeFilter` attribute in the surviving code.

## 3. View model and state

`Stock_Report_ViewModel` contains one property, `objStock_Report`, initialized to a new `Stock_Report` instance.

`Stock_Report` contains:

- form fields (`Form_*`)
- display fields for an inventory row
- `lst_search_main_list`, a mutable list of result rows
- `lst_Images`, a mutable list of photo paths

The form posts nested names such as `objStock_Report.Form_Make`, so MVC model binding reconstructs the `Stock_Report` object under the view model.

## 4. Screen UI and interactions

The page title is **Stock Report**. A legend says `* = mandatory, # = searchable field`; the actual fields are marked with `#` and are not mandatory. All fields are plain text inputs with jQuery UI autocomplete.

### 4.1 Search fields

| Label | Element id | Bound property | Matching rule in the database query |
|---|---|---|---|
| Make | `txt_Make` | `Form_Make` | `Inventory_Management.Make.Contains(Form_Make)` |
| Model | `txt_Model` | `Form_Model` | `Model.Contains(Form_Model)` |
| Variant | `txt_Variant` | `Form_Variant` | `Variant.Contains(Form_Variant)` |
| Colour | `txt_Colour` | `Form_Colour` | `Colour.Contains(Form_Colour)` |
| Fuel Type | `txt_Fuel_Type` | `Form_Fuel_Type` | `Fuel_Type.Contains(Form_Fuel_Type)` |
| Owner Type | `txt_Form_Owner_Type` | `Form_Owner_Type` | `Owned_Type.Contains(Form_Owner_Type)` |
| Owner Name | `txt_Form_Owner_Name` | `Form_Owner_Name` | `Owned_By.Contains(Form_Owner_Name)` |
| Owner Mob | `txt_Form_Owner_Mob` | `Form_Owner_Mob` | `Mobile_No_Owned_By.Contains(Form_Owner_Mob)` |
| Registration No | `txt_Form_Registration_No` | `Form_Registration_No` | `Registration_No.Contains(Form_Registration_No)` |

All nine criteria are combined with `AND`. A blank/null criterion contributes no restriction. Matching is partial containment, not exact equality. The code does not explicitly trim or normalize the submitted search values.

### 4.2 Autocomplete behavior

Each autocomplete sends an AJAX request with `term` and maps the returned string list to jQuery UI suggestions. Selecting a suggestion writes its value back into the input. The `if (!ui.item)` cleanup branch clears the field, although normal jQuery UI selection normally supplies `ui.item`.

| Input | Endpoint | Source and matching |
|---|---|---|
| Make | `/Admin/AutoCompleteMake` | `Car_Make_Master.Make.StartsWith(term)`, trimmed, distinct |
| Model | `/Admin/AutoCompleteModel` | `Car_Model_Master.Model.StartsWith(term)`, trimmed, distinct |
| Variant | `/Admin/AutoCompleteVariant` | `Car_Variant_Master.Variant.StartsWith(term)`, trimmed, distinct |
| Colour | `/Admin/AutoCompleteColour` | `Inventory_Management.Colour.StartsWith(term)`, trimmed, distinct |
| Fuel Type | `/Admin/AutoCompleteFuel_Type` | `Inventory_Management.Fuel_Type.StartsWith(term)`, trimmed, distinct |
| Owner Type | `/Admin/AutoComplete_Owner_Type` | `Owned_Type.StartsWith(term)`, distinct |
| Owner Name | `/Admin/AutoComplete_Owner_Name` | `Owned_By.StartsWith(term)`, distinct |
| Owner Mob | `/Admin/AutoComplete_Owner_Mob` | `Mobile_No_Owned_By.StartsWith(term)`, distinct |
| Registration No | `/Admin/AutoComplete_Registration_NO` | `Registration_No.StartsWith(term)`, distinct |

Autocomplete suggestions are advisory only. The search action accepts arbitrary typed values and applies the `Contains` query rules; selecting a suggestion is not required.

## 5. Search result listing

The result grid is rendered only when `lst_search_main_list.Count > 0`. It has no server-side or client-side pagination and no visible sort controls. The serial number is a render-time counter starting at 1 for each response.

Columns, in order:

1. Sr. No.
2. Make
3. Model
4. Variant
5. Colour
6. Year
7. Month
8. Fuel type
9. Kms Driven
10. No of Owners
11. Registration No
12. Tax
13. Insurance Type
14. Price
15. Status
16. Remarks (`Other_Remarks`)
17. Internal Comments
18. View

Each row also contains a hidden `Inventory_ID` input named `tbl_inventoryid`; it is not used by any visible action in this view.

There are no calculations, totals, aggregation rows, inline edits, row selection, or links to an inventory edit page. Values are displayed as supplied by the model; the view performs no formatting or business calculation.

## 6. Search data access and mapping

`Stock_Report.Search_Stock_Report()` creates a new `Excel_CarsEntities` context and queries `Inventory_Management`.

The query selects:

- `Inventory_ID` and `Inventory_Number`
- `Make`, `Model`, `Variant`, `Colour`, `SKU`
- `Year`, `Month`, `Fuel_Type`, `No_of_owners`
- `Tax`, `Registration_No`, `Kms_Driven`, `Insurance_Type`, `Price`
- `Other_Remarks`, `Status`
- `Owned_Type`, `Owned_By`, `Mobile_No_Owned_By`, `Email_ID_Owned_By`
- `Customer_ID`, `Customer_Name`, `Internal_Comments`

`Inventory_Number` is selected but never copied to the returned object. For every query row, the method creates a new `Stock_Report` object and copies the remaining fields. It converts `Year`, `No_of_owners`, `Kms_Driven`, and `Customer_ID` using `Convert.ToInt32`/`Convert.ToDecimal`.

### 6.1 Customer enrichment

For every row:

1. `Customer_Address`, `Customer_Mobile`, and `Customer_Email` are initialized to empty strings.
2. If `Customer_ID != 0`, the method performs `Customers.SingleOrDefault(c => c.Cust_Id == Customer_ID)`.
3. If a customer is found, the three contact fields are copied.
4. If the ID is zero or no customer is found, those fields remain blank.

The three enriched customer fields are not displayed in the main Stock Report table and are not exported. They exist on the report object for shared/possible downstream use.

The active mapping does not populate `lst_Images`; photos are loaded only by the separate photo endpoint.

## 7. Search action behavior and messages

`Search_Stock_Report` calls `Search_Stock_Report()` inside `try/catch`, assigns the returned list to `lst_search_main_list`, and returns `Stock_Report_View`.

- If the result count is less than 1, it sets `TempData["msg"] = Messages.Record_Not_found` and `TempData["msgType"] = Warning`.
- On any exception, it calls `Exceptioncatch.create(ex)`, sets `TempData["msg"] = Messages.ContactSystem`, and sets the message type to Error.
- The exact rendering of these TempData messages is supplied by the shared layout/message components, not this view.
- A successful non-empty search returns the list and no success message.

The initial open/reset action creates a new model, so it displays an empty form and no result grid.

## 8. Reset action

The Reset button is a submit input with `onclick=" Reset()"`. `Reset()` changes the form action to `/Report/Stock_Report` and submits the form. In practice, the GET action creates a fresh view model; submitted values are not used to run a query, so the form resets to blank and the result list disappears.

The inline handler does not use `return`, so its return value does not cancel submission. The action is intentionally a navigation back to the initial report screen.

## 9. Inventory photo detail action

When the user clicks the View icon in a row, `InventoryDetails(Inventory_ID)` runs and opens the `InventoryDetails` reveal modal.

The client sends a synchronous AJAX `POST` to:

`/Report/Get_Inventory_Details?InventoryID={id}`

The controller action is not decorated with `AuthorizeFilter` and does not perform its own `SessionInfo` check in the surviving code. It creates a new `Stock_Report`, calls `Get_CarPhotos(InventoryID)`, and returns JSON with `AllowGet`.

`Get_CarPhotos` queries `Inventory_Photos` joined to `Inventory_Management` on `Inventory_Number`, filtered by `Inventory_Management.Inventory_ID == InventoryID`, and returns each `Inventory_Photos.Path` in database order. The view appends one row per path to the modal table and renders an image with:

`../../Fileupload/Inventory_Car_Photo/{path}`

The image is displayed at 550×350 pixels. Existing modal rows after the header are removed before rendering the new response. If there are no paths, the modal remains with only the `Sr.No.` and `Image` headers; there is no explicit “no photos” message. The AJAX code has no error callback, timeout handling, or `_Logon_` response handling.

The stored path already appears to contain a relative upload path in some legacy data. The view nevertheless prefixes the upload directory, so path shape and deployment configuration are part of the legacy contract and a potential source of broken image URLs.

## 10. Export behavior

The export button appears only when the result list is non-empty. `ExportToExcel()` changes the same form action to `/Report/ExportToExcel_StockReport` and submits the current form.

The controller re-runs `Search_Stock_Report()` from the posted filters rather than exporting the previously rendered list. It projects each result into an anonymous export row and calls `Utility.GetExcel(j, "Stock_Report")`.

Export columns, in order:

1. `Make`
2. `Model`
3. `Variant`
4. `Colour`
5. `Year`
6. `Month`
7. `Fuel_Type`
8. `Kms_Driven`
9. `No_of_owners`
10. `Registration_No`
11. `Tax`
12. `Insurance_Type`
13. `Price`
14. `Status`
15. `Other_Remarks`
16. `Internal_Comments`

The export intentionally omits `Inventory_ID`, `Inventory_Number`, `SKU`, owner details, customer details, and photos. The generated filename/report name is `Stock_Report` according to the utility call.

After calling `Utility.GetExcel`, the action contains a no-record check using `Count < 0`; that condition can never be true. It therefore does not provide a meaningful empty-export warning. The export action does not wrap its query/export work in the `try/catch` used by search, so an exception can escape the action.

## 11. Business rules and edge cases

- A row is included if it matches every non-empty filter; blank filters are ignored.
- Search matching is `Contains`, while suggestions use `StartsWith`.
- Search uses the legacy inventory text columns, not the vehicle-master IDs used by newer Next.js reporting.
- No status filter is present in the legacy Stock Report.
- No default status restriction exists; all inventory statuses are eligible.
- No explicit ordering is applied in `Search_Stock_Report`; result order is database/provider-dependent.
- There is no pagination or result-count limit, so an unfiltered search may load the entire inventory table and perform one customer lookup per linked row.
- `lst_search_main_list` is a mutable instance list and the model method appends to it without clearing it. Normal MVC requests create a new view model, but reuse of a model instance could duplicate rows.
- `SingleOrDefault` for customer enrichment assumes `Cust_Id` is unique, as expected for a key.
- Nullable or malformed database values can fail during `Convert.ToInt32`/`Convert.ToDecimal` mapping.
- Null source strings used by `.Contains` or autocomplete `.StartsWith` may fail depending on the EF/provider null semantics.
- A missing customer leaves enriched fields blank and does not remove the inventory row.
- A missing photo list is not an error and produces an empty modal.
- The photo lookup is by `Inventory_Number` join even though the API receives `Inventory_ID`; orphaned or mismatched photo rows are therefore not returned.
- The photo endpoint has no explicit module authorization in the action code.
- The visible image URL is assembled from database path text without encoding or sanitization.
- Main search and export are POST actions; browser refresh/replay may resubmit the request.
- Export re-queries current database state, so the exported rows can differ from the rows previously displayed if inventory changed between requests.

## 12. Database/read model contract

### Directly read tables

- `Inventory_Management`: primary search/result source
- `Customers`: optional contact enrichment by `Customer_ID`
- `Inventory_Photos`: photo paths, joined through inventory number

### Relevant legacy inventory fields

`Inventory_ID`, `Inventory_Number`, `Make`, `Model`, `Variant`, `Colour`, `SKU`, `Year`, `Month`, `Fuel_Type`, `No_of_owners`, `Tax`, `Registration_No`, `Kms_Driven`, `Insurance_Type`, `Price`, `Other_Remarks`, `Status`, `Owned_Type`, `Owned_By`, `Mobile_No_Owned_By`, `Email_ID_Owned_By`, `Customer_ID`, `Customer_Name`, `Internal_Comments`.

### Relevant photo fields

`Inventory_Photos.Path`, joined by `Inventory_Photos.Inventory_Number == Inventory_Management.Inventory_Number`.

### No active stored-procedure call

The surviving `Search_Stock_Report` implementation queries Entity Framework directly. Any stored procedure or SQL artifact with a similar report name must not supersede this executable behavior without additional evidence.

## 13. Legacy interface contract summary

| User intent | Legacy request | Required behavior |
|---|---|---|
| Open/reset | `GET /Report/Stock_Report` | Render blank Stock Report. |
| Search | `POST /Report/Search_Stock_Report` | Apply nine optional ANDed `Contains` filters; render rows or warning/error message. |
| Export | `POST /Report/ExportToExcel_StockReport` | Re-run filters and export the 16-column Stock Report projection. |
| View photos | `POST /Report/Get_Inventory_Details?InventoryID={id}` | Return JSON path list and render paths as modal images. |
| Suggest a value | `GET`/AJAX `/Admin/AutoComplete*` | Return distinct prefix suggestions from masters or inventory. |

## 14. Gap analysis against Next.js `/reports/tracking`

`/reports/tracking` is the Next.js implementation of the separate legacy **Stock Tracking Report**, not a direct replacement for legacy `/Report/Stock_Report`. It should not be treated as parity for this SSOT.

### 14.1 Behavior present in legacy Stock Report but absent from `/reports/tracking`

- nine structured filters: make, model, variant, colour, fuel type, owner type, owner name, owner mobile, registration number
- legacy autocomplete suggestions for all nine fields
- Stock Report’s full result columns: colour, month, fuel type, kilometres, owners, tax, insurance type, price, remarks, internal comments
- Stock Report export behavior and its 16-column projection
- inventory-photo View modal
- customer-contact enrichment in the report model

### 14.2 Behavior in `/reports/tracking` that belongs to Stock Tracking, not legacy Stock Report

- registration-row drill-down into checklist, insurance, RTO, and loan records
- detail modal/API `/api/reports/tracking-details`
- links to edit Insurance, RTO, and Loan records
- search by registration number, make, and model only
- Prisma relations through `carVariantMaster`, `carMakeMaster`, and `carModelMaster`

These are not gaps in legacy Stock Report; they are cross-module scope differences.

### 14.3 Current Next.js tracking implementation risks relevant to migration

- `listTrackingStock()` loads all inventory rows and filters only in the browser.
- Its detail query uses `findFirst` for each related section, whereas legacy Stock Tracking behavior can return multiple related rows; this is a tracking-module parity concern, not Stock Report behavior.
- The tracking UI does not offer legacy Stock Report export or photos.
- The tracking API checks for an authenticated session, but route authorization is handled separately by `canCurrentUserAccessRoute`; parity must preserve both authentication and function-level access.

## 15. Migration acceptance criteria

If `/reports/stock` is intended to preserve this legacy module, verify:

- all nine filters exist and use the legacy `Contains`/AND semantics
- autocomplete sources and prefix behavior match the table above, or any intentional change is documented
- all 18 visible columns and their source fields are preserved
- empty search sets the warning message and does not render a result table
- there is no accidental default status filter or pagination change unless approved
- result ordering is either intentionally preserved or explicitly defined as a new behavior
- export reproduces the 16 legacy columns and re-applies posted filters
- photo lookup preserves inventory-id selection, legacy join semantics, and no-photo behavior
- null handling is tested rather than silently changing legacy conversion behavior
- `Stock_Report` function-level access is enforced on page, search, export, photo, and autocomplete surfaces as required by the target security model

## 16. Recommended parity tests

- each of the nine filters independently restricts results
- combined filters use AND semantics
- blank filters return all eligible inventory rows
- partial search values match as `Contains`
- autocomplete values use prefix matching and are distinct
- customer enrichment fills contacts for a valid customer and stays blank for a missing customer
- rows preserve the specified display order and serial numbering
- empty search shows the warning and no grid
- export contains exactly the documented 16 columns and excludes photos/owner/customer fields
- photos are returned for a valid inventory ID and empty for no matching paths
- session expiry redirects page/search/export and does not expose photo data
- nullable/malformed numeric values produce the chosen documented target behavior
- large result sets do not create an unbounded performance regression
