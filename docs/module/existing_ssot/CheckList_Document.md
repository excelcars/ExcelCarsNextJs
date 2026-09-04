# CheckList Document — Final Existing-System SSOT

> **Status: Finalized** — This document describes only the legacy ASP.NET MVC/.NET implementation. No Next.js behavior or migration comparison is included.

## 1. Purpose and evidence

This document records the observed behavior of the legacy `CheckList_Document` module. It is an implementation SSOT, not a redesign proposal.

The module was reviewed from the Razor view, MVC controller, view model, checklist model, shared validation/access code, menu entry, and database schema artifacts. A second review reconciled every visible control with its endpoint, query, persistence operation, validation, and failure path.

Legacy project: `C:\KhizarShaikh\Project\ExcelCars`  
Route: `/Admin/CheckList_Document`

## 2. Business purpose and access

The page records which documents have been received for a sold vehicle. For each document, the user records whether it is applicable, whether it has been received, and whether it is the original or a copy.

The checklist is linked to a vehicle in Inventory through `Inventory_ID`. It is intended for sold vehicles only.

The page and save/search/delete/export actions use `AuthorizeFilter(DatabaseFunctionname = "Document_CheckList")`. They also check `Session["SessionInfo"]`; if the session is missing, the user is redirected to `Home/Logout`.

The registration autocomplete and document-detail JSON actions do not have the same explicit checklist authorization attribute, even though they are normally called from the protected page.

The legacy menu exposes `Document Checklist` and routes to `Admin/CheckList_Document`.

## 3. Data model and relationships

### 3.1 Checklist header: `Check_List_Doc_Main`

One header row represents one vehicle checklist. The application reads and writes:

- `Document_ID` — checklist primary key.
- `Inventory_ID` — linked Inventory vehicle ID.
- `Make`, `Model`, `Variant`, `Colour`, `Registration_No`, `Year`, `Fuel_Type` — vehicle details copied into the checklist.
- `Customer_ID`, `Customer_Name`, `Customer_Mobile`, `Customer_Email` — customer reference and copied customer details.
- `Created_by`, `Created_Date`, `Updated_by`, `Updated_Date` — audit information.

Database migration artifacts refer to the copied customer text columns as `Customer_Name_legacy`, `Customer_Mobile_legacy`, and `Customer_Email_legacy`.

### 3.2 Checklist details: `CheckList_Doc_Details`

Each child row represents one document. It contains `Checklist_Details_ID`, `FK_Document_ID`, `Document_Name`, `Applicable`, `Received`, `Original_Copy`, and created/updated audit fields.

### 3.3 Relationships

The database relationship artifacts define:

- `Check_List_Doc_Main.Inventory_ID` → `Inventory_Management.Inventory_ID`.
- `Check_List_Doc_Main.Customer_ID` → `Customer.Cust_Id`.
- `CheckList_Doc_Details.FK_Document_ID` → `Check_List_Doc_Main.Document_ID`.

The checklist model reads `Inventory_Management` to find sold vehicles. It reads `Customers` to obtain customer mobile and email when a customer ID exists.

## 4. Initial page and fixed documents

When the page opens, `Check_List_Documents` creates a default list of 13 documents. The document names and default values are hard-coded in the C# model; they are not loaded from a document-master table.

Every default row starts with `Applicable = "No"`, `Received = "No"`, and `Original_Copy = "Original"`.

The 13 default documents are:

1. Original Registration Book / RC Card
2. Original Tax Book for before 97 vehicle
3. Dealers Invoice
4. Insurance Certificate (State Comprehensive / Third Party )
5. Muncipal Tax Receipt (If applicable)
6. TTO Set duly signed all places
7. Authorised Signatory Letter on Company Letter Head (In case of Company Vehicle)
8. NOC Finance Company (If Hypothecation Case)
9. Owner Authority Letter to Middle Man for selling car
10. PUC Validity
11. Duplicate Keys
12. Manuals
13. Spare Tyre & Tool Kit

The misspelling `Muncipal` is part of the actual legacy document name.

## 5. Vehicle and customer form

The form contains Registration No, Make, Model, Variant, Colour, Year, Fuel Type, Customer Name, Customer Mobile, Customer Email, and hidden Inventory ID, Document ID, and Customer ID fields.

Registration No is editable, searchable, and marked mandatory. Make, Model, Variant, Colour, Year, Fuel Type, and customer fields are read-only after vehicle selection. Customer Name is also marked mandatory.

The form posts values using names such as `objCheckList.Inventory_ID`, `objCheckList.Registration_No`, and `objCheckList.lst_checklist_doc[index].Received`.

The user is expected to select an autocomplete result. Selecting a vehicle fills the registration number, hidden Inventory ID, vehicle details, customer ID, customer name, customer mobile, and customer email.

If the autocomplete selection has no item, the script clears the registration, hidden Inventory ID, vehicle fields, hidden Customer ID, and customer fields. Typing a registration number without selecting a suggestion does not populate the hidden Inventory ID.

## 6. Checklist detail controls

Each document row provides three dropdowns:

- Applicable: `No` or `Yes`.
- Received: `No` or `Yes`.
- Original/Copy: `Original` or `Copy`.

The legacy screen does not provide add-document, remove-document, free-text document creation, per-row delete, checklist completion status, sorting, or pagination.

## 7. Buttons and actions

### 7.1 Search

The Search button changes the form action to `/Admin/Search_Checklist_Doc` and submits the form.

The server searches `Check_List_Doc_Main`: empty registration returns all checklist headers; non-empty registration requires an exact match on `Registration_No`.

If there are no results, the controller sets a “record not found” warning. Exceptions are logged and a generic system error message is shown.

The result table displays serial number, registration, make, model, variant, colour, year, fuel type, customer name, customer mobile, customer email, Edit, and Delete. It has no visible pagination or sorting.

### 7.2 Save and Update

The Save button first calls the shared client-side `validate()` function. If validation passes, it posts to `/Admin/Save_Update_CheckList_Document`.

When editing an existing row, JavaScript changes the button text from Save to Update. The server uses the nonzero `Document_ID` to update that checklist.

After processing, the controller redirects to `/Admin/CheckList_Document`, which creates a fresh page/model.

### 7.3 Reset

Reset posts to `/Admin/CheckList_Document`. A new view model is created, clearing the current form and results and restoring the default document list.

### 7.4 Edit

Edit copies the selected result row’s hidden values into the form, sets the hidden `Document_ID` and `Inventory_ID`, changes the button text to Update, calls `/Admin/Get_Doc_Details?docid=<id>` through synchronous AJAX, applies returned values to matching document rows, and scrolls the browser to the top.

Matching is done by exact `Document_Name`. If a saved custom document name does not match a hard-coded row, it is not visible in the legacy edit table.

### 7.5 Delete

Delete sets the hidden `Document_ID`, changes the form action to `/Admin/Delete_DocumentChecklist`, and submits immediately. There is no confirmation popup.

### 7.6 Export

Export submits to `/Admin/ExportToExcel_CheckList_Document_Details`. The server joins checklist headers to detail rows and sends the result to `Utility.GetExcel` with the name `CheckList_Document_Details`.

## 8. Registration lookup and Inventory link

The registration field calls `/Admin/AutoCompleteRegistration_NO` while the user types.

The controller calls `Get_Registration_no(term)`. The model reads from `Inventory_Management` with the condition `Status == "Sold"`.

For each sold inventory row, it returns the registration number, Inventory ID, Make, Model, Variant, Colour, Year, Fuel Type, Customer ID, and Customer Name. If the customer ID is nonzero, the model separately reads `Customers` to return customer mobile and email.

The registration autocomplete sends the typed `term`, but the C# query does not use it. Therefore, the server loads all sold inventory records; the browser performs the suggestion matching.

When a suggestion is selected, its Inventory ID is stored in the hidden field and the other vehicle/customer fields are filled.

## 9. Save business rules

Before saving, the controller verifies that the selected vehicle is valid:

1. The posted registration must not be empty for the sold-vehicle check.
2. The posted Inventory ID and exact Registration No must match a row in `Inventory_Management`.
3. That Inventory row must have `Status == "Sold"`.

If the combination is missing, the system shows a warning equivalent to: “This Car Registration No is either not sold or not in system.” No checklist is saved.

If the sold-vehicle check passes, the controller checks for duplicates. A duplicate means another `Check_List_Doc_Main` row has the same Inventory ID and exact Registration No, excluding the current Document ID during update.

If a duplicate exists, the system shows an already-exists warning and does not save.

The duplicate and sold-vehicle comparisons are exact. They do not normalize case, spaces, punctuation, or registration formatting.

## 10. Header persistence

`Insert_Update_CheckList_Document()` opens the Entity Framework connection inside a `TransactionScope`.

For a new checklist (`Document_ID == 0`), it creates a new `Check_List_Doc_Main`, assigns the posted Inventory/customer/vehicle values, sets created and updated user/date values, and inserts the row.

For an update (`Document_ID != 0`), it loads the existing header by Document ID, overwrites the posted vehicle/customer values, changes updated user/date values, and keeps the original created user/date values.

The generated Document ID is assigned back to the model after `SaveChanges()`. The model uses the session user ID and `DateTime.Now` for audit values. It trusts the posted snapshot fields after the controller’s sold-vehicle check and does not reload all authoritative vehicle/customer details before writing.

## 11. Detail persistence

On update, all existing detail rows for the checklist are deleted first and saved. The submitted detail list is then inserted as a new set of detail rows.

Each inserted detail row receives the posted detail ID, current checklist Document ID, document name, Applicable value, Received value, Original/Copy value, and current user/date for created and updated audit fields.

The insert/update header and detail operations are intended to be protected by the surrounding transaction. Inner exceptions set `Is_Save_Success = false`; outer exceptions are logged through `Exceptioncatch.create`; the connection is closed in `finally`.

## 12. Search, detail, delete, and export behavior

`Search_ChecklistDetails()` reads only `Check_List_Doc_Main`, returns header fields, and does not load document detail values for the result table.

`Get_Checklist_Document_Details(docid)` reads all `CheckList_Doc_Details` rows where `FK_Document_ID == docid`.

`Delete_DocumentChecklist(DocumentID)` deletes the header first and calls `SaveChanges()`, then deletes all detail rows and calls `SaveChanges()` again. It returns true only when a nonzero Document ID matched and the header was deleted.

`Search_All_CheckList_Details_Excel()` inner-joins `Check_List_Doc_Main` and `CheckList_Doc_Details`, applies the optional exact registration filter, and returns one export row per detail row.

## 13. Validation and errors

The view uses the shared client-side `validate()` function. The visible required fields are Registration No, Make, Model, Variant, Colour, and Customer Name.

The shared validator also makes a synchronous `/Home/chkSession` request before checking required fields. If the session is no longer valid, it opens the login UI and prevents normal continuation.

Client validation can be bypassed with a direct request. The controller does not independently enforce all visible required-field rules through model-state validation.

Observed behavior:

- Missing session redirects to logout on protected actions.
- Search, save, and delete exceptions are logged and produce generic error messages.
- A non-sold or unknown vehicle produces a warning and does not save.
- A duplicate checklist produces an already-exists warning and does not save.
- Empty search results produce a record-not-found warning.
- Year and ID conversions use `Convert.ToInt32`; malformed or null values can throw.
- Export does not have the same robust try/catch handling as search/save/delete.

## 14. Known legacy limitations and edge cases

- Registration autocomplete loads every sold inventory row because the typed search term is not applied in the database query.
- Typing a registration without selecting a suggestion can leave Inventory ID as zero.
- Registration matching is exact and formatting-sensitive.
- There is no server-side pagination or result limit.
- There is no visible sort control.
- There is no delete confirmation.
- Delete is not wrapped in one transaction; a failure between header and detail deletion can leave inconsistent data.
- The old document list is hard-coded and cannot be maintained by administrators.
- Custom document names are not supported by the visible edit UI.
- The legacy page stores copied vehicle/customer details, which can become outdated if Inventory or Customer data changes later.
- Customer mobile/email labels show a mandatory marker, but the inputs do not use the same required CSS class as the main required fields.
- The export no-record condition checks `Count < 0`, which can never be true.
- The `Muncipal` spelling and other legacy document names are persisted values and must be treated carefully.
- No CSRF token is visible in the legacy checklist form.

## 15. Source evidence

- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Admin\CheckList_Document_View.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Controllers\AdminController.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\ViewModel\Check_List_Doc_ViewModel.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\CheckList_Document\Check_List_Documents.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Shared\Menu.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\db\schema_dump_columns.txt`
- `C:\KhizarShaikh\Project\ExcelCars\db\schema_dump_fks.txt`
- `C:\KhizarShaikh\Project\ExcelCars\db\add_relationship_fks.sql`

## 16. Finalization and SSOT rule

The SSOT has been finalized for the legacy .NET implementation after two full review passes and an additional source-to-SSOT verification review.

The confirmed core rule is:

`Inventory Management → sold vehicle → registration selection → checklist creation`

The checklist is stored in `Check_List_Doc_Main` and linked to the sold vehicle through `Inventory_ID`. Future changes to the legacy module must update this document before it is considered current again.
