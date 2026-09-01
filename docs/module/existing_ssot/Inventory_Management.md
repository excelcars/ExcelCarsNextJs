# Inventory Management — Existing-System SSOT

## 1. Purpose and evidence

This document records the observed Inventory Management behavior in the legacy ASP.NET MVC application only. It is an implementation SSOT, not a redesign proposal. The legacy implementation was reviewed twice: first by tracing the Razor page, controller actions, model methods, and persistence code; second by reconciling every control and handler with its endpoint/action, validation, database behavior, and edge cases.

Legacy project: `C:\KhizarShaikh\Project\ExcelCars`  
Legacy route: `/Admin/Inventory_Management`

## 2. Business purpose and access

Inventory Management maintains vehicle stock records and supports add, edit, search, export, delete, photo management, dealer/customer email, and inquiry update workflows. The page links to Checklist Documents, Insurance, RTO Agent, DSA, and Financial/Loan Management using the current inventory ID.

`AdminController.Inventory_Management()` is protected by `AuthorizeFilter(DatabaseFunctionname = "Inventory_Management")` and checks `Session["SessionInfo"]`; an absent session redirects to `Home/Logout`. Save/update, search, delete, and export have the same protection. JSON helpers have inconsistent authorization/session checks.

## 3. Data model

The main table is `Inventory_Management`. Fields are `Inventory_ID`, `Inventory_Number`, Make, Model, Variant, Colour, SKU, Year, Month, Fuel Type, number of owners, Tax, Registration No, kilometres, Insurance Type, Price, Status, Owner Type/name/mobile/email, Customer ID/name, Internal Comments, Other Remarks, Is Car Registered, and audit fields.

Related tables are `Inventory_Photos`, `Customers`, `Car_Make_Master`, `Car_Model_Master`, `Car_Variant_Master`, `Dealer_Master`, `Inquiries`, `Inquiry_Car_Details`, and `Followup_Inquiry`.

## 4. Form and UI behavior

The Razor form posts nested `objInventory.*` values. Inventory number is generated as `Inventory/1` when no row exists, otherwise by incrementing the numeric suffix of the latest row. SKU is read-only. Year is numeric (maxlength 4); Month is January–December. Make, Model, Variant, and Colour are text inputs; Make, Model, and Colour use autocomplete. Is Car Registered is a checkbox whose value is changed to true/false by `Chk_Registration_Valid`.

Other fields are Fuel Type, Number of Owners, Tax (`Individual`/`Corporate`), Registration No, Kms Driven, Insurance Type, Price, Status (`Sold`, `In Stock`, `Loan Process`, `RTO Process`, `Booked`, `Not Available`), Owner Type (`Excel Cars`, `Dealer`, `Individual`), owner name/mobile/email, customer name/address/mobile/email and hidden customer ID, Internal Comments, Other Remarks, and multiple photos. The shared validation also checks all `.req` controls for non-empty values, rejects zero for `.req.num`/`.req.numWithdeci`, validates `.email` fields, and validates `.valid_date` fields.

Changing Owner Type to `Excel Cars` fills Owner Name with `Excel Cars`; another owner type clears owner name/mobile/email. `SaveUpdate()` invokes shared `validate()` and additionally requires Customer Name when status is Sold. Status change has no active custom JavaScript rule.

The result table has select-all and per-row checkboxes, hidden `dltList` inventory IDs, grouped vehicle/year/colour/owner/tax/fuel/registration/km/insurance/price/status/owner/customer/remarks columns, Edit, and Delete. There is no pagination or visible sorting control.

| Action | Legacy behavior |
|---|---|
| Save / Update | Posts `/Admin/Save_Update_Inventory`; duplicate registration is checked, data is persisted, TempData message is set, then the screen redirects to a fresh inventory page. |
| Reset | Posts to `/Admin/Inventory_Management`, clearing form/results through a new model. |
| Search Inventory | Posts `/Admin/Search_Inventory` and re-renders matching rows. |
| Export | Posts `/Admin/ExportToExcel_Inventory_Details`, re-runs search, and calls `Utility.GetExcel` as `Inventory_Details`. |
| Edit | Copies hidden row values into the form, changes Save to Update, loads photos by inventory number, and reveals downstream links. |
| Delete | Posts `/Admin/Delete_Inventory`, deletes the row and attempts photo cleanup, then searches again. No confirmation is implemented in this view. |
| Search Inquiry | Opens a modal and calls `/Admin/Search_Inquiry_View` with Make/Model/Variant. |
| Dealer email | Searches dealers, selects dealers and inventory rows, then posts `/Admin/Send_Email_Inventory_Dealer`. |
| Customer email | Requires from/to budgets, searches customers, selects customers and inventory rows, then posts `/Admin/Send_Email_Inventory_Customer`. |
| Downstream links | Builds links for Checklist, Insurance, RTO, DSA, and Financial management with `id=`. |

## 5. Persistence and business rules

`Insert_Update_Inventory()` runs inside a `TransactionScope`.

1. A non-empty Customer Name is looked up by exact name and current customer ID. The existing customer is updated; otherwise a Type `Customer` row is created. Name, address, mobile, email, audit values, and the resulting customer ID are used.
2. ID zero inserts inventory; otherwise the row is loaded by ID and overwritten with all posted fields. Created/updated audit values use the session user and current time.
3. On update, all photo rows for the inventory number are deleted, then posted `lstImagePath` values are inserted. This is replacement semantics.
4. Make, Model, and Variant masters are upserted by exact text. Model is scoped by Make ID; Variant by Make ID and Model ID. Blank lookup checks do not prevent blank values being assigned to a new master entity.
5. For Owner Type `Dealer`, Dealer Master is found by exact owner name or created, then name/mobile/email and audit values are saved.
6. Only after all operations succeed is the transaction completed. Failures set `Is_Save_Success` false, retain the exception, and cause generic error logging/message handling.

### Registration duplicate rule

`Duplicate_Check` trims the value and queries duplicates only when length is greater than 5. Short values such as `MH-02`/`MH-04` may repeat. Longer values must exactly match no other inventory ID. Empty values skip the check.

### SKU generation

`GET_SKU_Code(make, model, colour)` finds the latest exact make/model/colour row, increments the final hyphen-separated number in its SKU, and preserves its prefix. If none exists, it uses up to the first three characters of Make, up to the first three of Model, and Colour. Exceptions return null. Save does not independently regenerate or enforce SKU uniqueness.

### Search

`Search_Inventory()` applies optional exact equality filters for Make, Model, Variant, Colour, Fuel Type, Owner Type, Owner Name, Owner Mobile, Registration No, and Status. Empty filters are ignored. There is no ordering, pagination, or limit. Numeric/Boolean conversions use `Convert` and can throw on malformed/null values. Each nonzero Customer ID triggers a separate customer lookup for address/mobile/email. Results append to `lst_search_details` without clearing it first.

## 6. Photos, autocomplete, email, and inquiry

### Photos

The jQuery File Upload control posts to `/Admin/UploadFiles_Inventory`, automatically uploads multiple files, and appends `../../Fileupload/Inventory_Car_Photo/<name>` to the hidden image list. The delete handler immediately calls `/Admin/deleteDoc_Inventory` with the displayed basename, removes the row, and renumbers hidden inputs. Save later replaces database photo rows from the remaining list. `Get_Inventory_Photos(InventoryNO)` reads paths by exact inventory number. Inventory deletion separately attempts to delete physical files by basename and matching database rows.

### Autocomplete and lookups

Make, Model, Variant, Colour, Fuel Type, Owner Type, Owner Name, Owner Mobile, Registration No, Dealer, and Customer use jQuery autocomplete. Make/Model/Variant use vehicle masters; Colour, Fuel Type, Owner Type, Owner Name, Owner Mobile, and Registration No use inventory values; Dealer and Customer use `StartsWith` lookup methods. Suggestions are advisory and do not enforce selection. Generic vehicle autocomplete is not parent-scoped. The controller routes are `/Admin/AutoCompleteMake`, `/Admin/AutoCompleteModel`, `/Admin/AutoCompleteVariant`, `/Admin/AutoCompleteColour`, `/Admin/AutoCompleteFuel_Type`, `/Admin/AutoComplete_Owner_Type`, `/Admin/AutoComplete_Owner_Name`, `/Admin/AutoComplete_Owner_Mob`, `/Admin/AutoComplete_Registration_NO`, `/Admin/AutoComplete_Get_Dealer_Details`, and `/Admin/AutoComplete_Get_Customer_Details`.

### Dealer/customer email

Dealer search returns ID/name/mobile/email using `StartsWith`; selected IDs are stored in hidden `dealer_dltList` values. Sending requires at least one inventory and dealer selection. Only inventory rows whose Owner Type is not Dealer and whose Status is `In Stock` are sent. Photos are loaded by inventory-number join as attachments. The signature and phone number vary for session `Role_ID == 4` versus other roles.

Customer search requires non-empty From Budget and To Budget. `Get_Customer_Email` applies optional customer name, vehicle Make/Model/Variant, and budget filters; selected IDs are stored in `customer_dltList`. Sending requires inventory and customer selections and uses the legacy mail helper with vehicle details and available photo attachments.

### Inquiry

`Get_Inquiry_Details` joins inquiries to inquiry-car details and applies `Contains` filters for Make, Model, and Variant; blanks are ignored. The modal displays inquiry date/reference website, vehicle, customer, classification, status/sub-status, follow-up date, and remarks. Per-row save requires Followup Status and Classification, then calls `/Admin/Update_Inquiry`. `Update_Inquiry` inserts a new `Followup_Inquiry` row and updates inquiry follow-up/status/classification/remark fields.

## 7. Errors and edge cases

- Protected MVC actions redirect to logout when session state is absent. Search/save/delete catch exceptions, log through `Exceptioncatch.create`, and set TempData messages.
- Export lacks equivalent robust try/catch handling; its `Count < 0` no-record test can never be true.
- Exact, case/whitespace-sensitive persistence comparisons can create logical duplicates.
- Client validation can be bypassed; blank master values may be attempted.
- Photo path text is concatenated into URLs/filesystem paths and can produce broken paths. Immediate photo deletion and later save replacement can diverge if requests fail.
- Inventory deletion saves the main-row deletion before photo cleanup; later failure can leave physical/database photo residue.
- Inquiry date/follow-up and numeric conversions can throw for malformed/null database values.

## 8. Source evidence

- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Admin\Inventory_Management_View.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Controllers\AdminController.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\ViewModel\Inventory_ViewModel.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Inventory_Management\Inventory_Management.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Scripts\Validations.js`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Controllers\HomeController.cs` and shared menu/access code
