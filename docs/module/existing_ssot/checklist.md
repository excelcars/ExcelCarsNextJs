# Checklist / Documents — Existing-system SSOT

## Scope and evidence

This is the verified SSOT for the legacy ASP.NET MVC module at `/Admin/CheckList_Document`. It covers actual implementation behavior, including legacy faults; it is not a migration proposal. Two source review passes were made across the Razor view, controller, model, menu, shared validation, and database relationship metadata.

Primary evidence:

- `C:\Ruchita\Next\Universe_CC_tool\ExcelCars\ExcelCars\Views\Admin\CheckList_Document_View.cshtml`
- `C:\Ruchita\Next\Universe_CC_tool\ExcelCars\ExcelCars\Controllers\AdminController.cs`
- `C:\Ruchita\Next\Universe_CC_tool\ExcelCars\ApModel\Model\CheckList_Document\Check_List_Documents.cs`
- `C:\Ruchita\Next\Universe_CC_tool\ExcelCars\ExcelCars\ViewModel\Check_List_Doc_ViewModel.cs`
- `C:\Ruchita\Next\Universe_CC_tool\ExcelCars\db\schema_dump_columns.txt` and `schema_dump_fks.txt`

## Purpose, navigation, and authorization

The module records documents received for a sold inventory vehicle. A checklist contains one header per vehicle and one or more document-detail rows. The legacy menu label is **Document Checklist** and opens `Admin/CheckList_Document`.

The page plus save, search, delete, and export actions use `AuthorizeFilter(DatabaseFunctionname = "Document_CheckList")`. Protected actions additionally require `Session["SessionInfo"]`; a missing session redirects to `Home/Logout`. `AutoCompleteRegistration_NO` and `Get_Doc_Details` have no explicit checklist authorization attribute, though they are normally called by the authorized page.

## Data model

`Check_List_Doc_Main` is the checklist header. It stores `Document_ID`, `Inventory_ID`, copied vehicle fields (`Make`, `Model`, `Variant`, `Colour`, `Registration_No`, `Year`, `Fuel_Type`), `Customer_ID`, copied customer name/mobile/email, and created/updated user/date audit values.

`CheckList_Doc_Details` stores one child row with `Checklist_Details_ID`, `FK_Document_ID`, `Document_Name`, `Applicable`, `Received`, `Original_Copy`, and created/updated audit values.

Foreign keys link header Inventory ID to `Inventory_Management`, header Customer ID to `Customer`, and details to the header. The form posts the copied vehicle/customer snapshot; after the sold-vehicle verification it is not rehydrated from Inventory/Customer before persistence.

## Page form and defaults

The page presents Registration No, read-only Make, Model, Variant, Colour, Year, Fuel Type, Customer Name, Customer Mobile, and Customer Email, plus hidden Inventory ID, Document ID, and Customer ID.

Registration No is editable/searchable. Make, Model, Colour, and Customer Name carry the shared validator's `req` class; the labels for Variant, Year, Fuel Type, Mobile, and Email also show mandatory markers but those inputs do not all carry that class. The controller has no equivalent model-state validation for those UI requirements.

On every new/reset page construction, the model creates these fixed 13 detail rows. Defaults are `Applicable = No`, `Received = No`, and `Original_Copy = Original`:

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

Each row exposes dropdowns `No/Yes` for Applicable and Received and `Original/Copy` for Original_Copy. There is no custom-document UI, row add/remove, completion calculation, sort control, or pagination.

## Vehicle lookup

Typing Registration No invokes `GET /Admin/AutoCompleteRegistration_NO?term=...`. The model retrieves **all** `Inventory_Management` rows where `Status == "Sold"`; its database query does not apply the supplied term, so browser autocomplete performs matching. Returned values include vehicle and customer references/snapshots. When Customer ID is nonzero, the model separately reads Customer for mobile and email.

Selecting a suggestion fills registration, hidden Inventory ID/customer ID, vehicle fields, and customer values. Clearing/no selection clears all those fields and sets IDs to zero. Merely typing a value does not establish an Inventory ID.

## Actions and workflows

### Search

Search posts the current form to `/Admin/Search_Checklist_Doc`. Empty registration returns every header; a supplied registration uses exact `Registration_No` equality. The result table displays sequence, vehicle/customer snapshot columns, Edit, and Delete. It does not load detail rows. No results produce the standard record-not-found warning; exceptions are logged and produce a generic error message.

### Save / update

Save first runs shared client validation, which also makes a synchronous `/Home/chkSession` request. If it passes, it posts to `/Admin/Save_Update_CheckList_Document`; a nonzero hidden Document ID changes the visible label to Update.

The controller permits persistence only when the posted Inventory ID and exact Registration No match an inventory record whose status is exactly `Sold`. It then rejects a duplicate header with the same Inventory ID and registration, except for the current Document ID in an update. Comparisons are formatting/case sensitive.

For insert, the model creates the header and assigns created/updated audit values from session user and `DateTime.Now`. For update it overwrites the posted header snapshot, preserves original creation fields, and updates audit fields. It deletes all existing details then inserts the submitted set. The model uses a `TransactionScope` for its insert/update work and redirects to the blank checklist page afterward. Direct requests can bypass client validation.

### Edit

Edit copies hidden fields from the selected search row into the form, changes Save to Update, synchronously posts `/Admin/Get_Doc_Details?docid=<id>`, and maps returned values to fixed form rows using exact document-name equality before scrolling to the top. A saved document name not represented by the hard-coded list cannot be shown in this UI.

### Delete

Delete posts immediately to `/Admin/Delete_DocumentChecklist`, without confirmation. The model deletes the header and saves, then deletes details and saves separately. Therefore an error between the two operations can leave orphaned/inconsistent data. Success returns the base page.

### Export

Export posts to `/Admin/ExportToExcel_CheckList_Document_Details`. It inner-joins headers and detail rows, optionally filters with the exact registration, and sends one row per document detail to `Utility.GetExcel` as `CheckList_Document_Details`. Main records without details do not export. The apparent no-record check uses `Count < 0`, which cannot be true.

## Errors and edge cases

- A non-sold/unknown inventory-registration combination is rejected with a warning.
- Duplicate checklists are rejected with an already-exists warning.
- Protected actions redirect when session is absent; guarded action exceptions are logged and show a generic system message.
- ID/year mappings use `Convert.ToInt32`; malformed/null values can throw.
- Export lacks comparable exception protection.
- The hard-coded `Muncipal` spelling and all default names are persisted behavior.
- The autocomplete loads all sold inventory records, has no server-side result limit, and can be expensive.
- There is no visible antiforgery token in this form.

## Existing-system rule

`Inventory Management (Sold) → selected registration + Inventory ID → exactly one checklist header → submitted document rows.`

Any legacy behavior change to the fixed documents, sold-vehicle eligibility, duplicate rule, header/detail persistence, or authorization must update this SSOT.
