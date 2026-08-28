# SSOT - Dealer Management Module (Legacy System)

## Status: Legacy ASP.NET MVC implementation; extracted from the existing codebase

**Module:** `Configuration/Dealer_Management`  
**Project:** `ExcelCars`  
**Primary sources:** `ExcelCars/Controllers/ConfigurationController.cs` (dealer region), `ExcelCars/Views/Configuration/Dealer_Management.cshtml`, `ExcelCars/ViewModel/Dealer_ViewModel.cs`, `ApModel/Model/Dealer_Management/Dealer_Management.cs`, and `ApModel/Model/Common/CommonFor_Model_Color_Variant.cs`  
**Database entity:** `Dealer_Master`

## 1. Purpose and scope

Dealer Management is a configuration master screen for creating, searching, editing, exporting, and permanently deleting dealer contact records. A dealer record stores a name, two mobile numbers, address, email, company name, website, and audit metadata.

It does not manage dealer authentication, status/activation, ownership, vehicle inventory, paging, or a dealer detail page. Other modules can consume dealer data (for example, dealer lookups used by inventory/communication workflows), but that use is outside this screen's write scope.

## 2. Access and navigation

- The legacy Configuration menu and shared navigation show **Dealer Management** only when the session user's `AppFunctionList` contains `Dealer_Management`.
- The page route is `GET /Configuration/Dealer_Management`.
- The page, save, search, delete, and export actions carry `AuthorizeFilter(DatabaseFunctionname = "Dealer_Management")`.
- Those actions also require `Session["SessionInfo"]`; an absent session redirects to `Home/Logout`.
- The two autocomplete JSON actions have no visible `AuthorizeFilter` or explicit session check in their controller methods. They are used by the protected page, but the code itself does not show a separate endpoint authorization check.

## 3. Data model and ownership

| Field / record | Behavior |
| --- | --- |
| `Dealer_Master.Dealer_ID` | Primary key. `0` means create; a non-zero ID selects update/delete. |
| `Dealer_Name` | Required by client validation; searchable; one half of duplicate identity. |
| `Dealer_Mobile_No` | Required by client validation; maximum 11 characters; numeric-keypress class; searchable; other half of duplicate identity. |
| `Dealer_Mobile_No_2` | Optional second mobile; maximum 11 characters; numeric-keypress class. |
| `Dealer_Address` | Optional text. |
| `Dealer_Email` | Optional, but the browser's shared `email` validator applies when supplied. |
| `Dealer_Company_Name` | Optional text. |
| `Dealer_Website` | Optional, but the browser's shared `URL` validator applies when supplied. |
| Audit fields | Create sets `Created_By`/`Created_Date` and `Updated_By`/`Updated_Date`; update sets only the updated pair. User ID comes from `SessionInfo.UserId`; dates use server `DateTime.Now`. |

The model writes directly through Entity Framework to `Dealer_Master`. Save runs in a .NET `TransactionScope`; there is only one entity write, so the transaction is principally a consistency/error boundary.

## 4. Screen contract

### Form and controls

The Razor page has one POST form with a hidden dealer ID. JavaScript changes the form action for each workflow.

| Control | Behavior |
| --- | --- |
| Name | Mandatory and searchable. Autocomplete calls `Autocomplete_Dealer_Name(term)` as the user types. |
| Mobile | Mandatory and searchable. Autocomplete calls `Autocomplete_Dealer_Mobile(term)`. |
| Mobile 2 | Optional. |
| Address, Email, Company Name, Website | Optional. Email and website use shared client-side validation classes. |
| Search | Posts the current form to `Search_Dealer`; only name and primary mobile influence the query. |
| Save / Update | Runs shared `validate()`, then posts to `Save_Update_Dealer`. Its label becomes **Update** after client-side edit selection. |
| Reset | Posts to `Dealer_Management`, replacing the view model with a blank form and no results. |
| Export to Excel | Appears only when the current rendered result list has at least one row. Posts the current form to `ExportToExcel_Dealer_Details`. |

### Results table

Search results render only after a successful result-producing search. Columns are serial number, Name, Mobile, Mobile 2, Address, Email, Company Name, Website, Edit, and Delete. Rows are ordered by dealer name ascending by the server query. There is no paging, table-sort control, row detail link, selection state, or delete confirmation dialog.

- **Edit** does not make a server request. It copies hidden values from the selected result row into the form, sets the hidden ID, changes Save to Update, and scrolls to the top. The existing rendered result list remains.
- **Delete** puts the selected ID into the hidden field and immediately posts to `Delete_Dealer`.

## 5. Server workflows and business rules

### Load and reset

`Dealer_Management()` returns a new `Dealer_ViewModel`, whose constructor creates an empty `Dealer_Management` instance. It does not preload dealers.

### Search and autocomplete

`Search_Dealer()` calls `Search_Dealer()` on the posted model. The query is `Dealer_Master` filtered as follows:

- a non-empty name requires an exact `Dealer_Name` match;
- a non-empty primary mobile requires an exact `Dealer_Mobile_No` match;
- supplying both applies both conditions (AND);
- blank search fields return every dealer;
- secondary mobile, email, address, company, and website do not filter the search.

The query projects only the eight displayed business fields and orders by dealer name. Zero rows set a `Record_Not_found` warning. The name autocomplete returns matching dealer name/id objects where name `Contains(term)`; the selected ID is not used by this page. The mobile autocomplete is anomalous: it filters records whose **dealer name** starts with `term`, then returns distinct trimmed primary mobile values. It does not search mobile numbers by the entered mobile text.

### Create and update

`Save_Update_Dealer()` first checks for another row with the exact same name and primary mobile, excluding the posted ID. A match returns an `Allready_Exists` warning and performs no write.

When no duplicate exists, `Insert_Update_Dealer()`:

1. Loads the entity by ID for update, or creates a new entity for ID `0`.
2. Copies every submitted business field to the entity.
3. Sets updated audit fields; additionally sets created audit fields and adds the entity for a new dealer.
4. Calls `SaveChanges()` inside the transaction and marks the operation successful.

On success the controller displays either saved or updated success feedback, then returns a **new blank view model** (not the saved record or search results). Any caught save exception is logged with `Exceptioncatch.create` and produces a generic error/contact-system message.

### Delete

`Delete_Dealer()` calls `Delete_Dealer(dealerId)`. For a non-zero ID, it fetches one dealer, calls Entity Framework `DeleteObject`, and saves. This is a hard delete, not a soft delete. A missing/zero ID returns false without a message; a successful removal shows a deleted-success message. The action returns the posted view model, so it does not automatically rerun the search.

### Export

The export action reruns the same server-side search using the posted name/mobile filters, then passes the following columns to `Utility.GetExcel` with workbook/export name `Dealer_Details`: Name, Mobile, Mobile 2, Address, Email, Company Name, and Website. It exports the complete matching set, independently of the previously rendered result list. It omits serial number, ID, and audit fields. The zero-results test is coded as `Count < 0`, which is impossible, so export does not issue a not-found warning.

## 6. Validation, error handling, and edge cases

- Browser validation requires Name and primary Mobile; `num`/`maxlength` attributes constrain normal UI entry but are not server validation.
- The server only enforces non-duplication by exact name + primary mobile. It does not independently enforce required fields, maximum lengths, numeric mobile values, email format, URL format, trimming, or a unique database constraint.
- Exact comparisons are database/collation dependent. Blank or malformed direct requests can bypass client checks and be persisted unless the database rejects them.
- Duplicate checking and the subsequent insert/update are separate operations, so concurrent requests can still create duplicates unless a database constraint exists (none is shown in this module).
- An update ID that no longer exists yields a null entity dereference and generic save error rather than a not-found response.
- Delete has no confirmation and can permanently remove a dealer; foreign-key behavior is database-defined and errors are caught by the controller.
- Autocomplete failures are not handled in page JavaScript. The autocomplete endpoints' lack of explicit authorization is a legacy exposure to review.

## 7. Verification checklist

- A user without `Dealer_Management` cannot reach the protected page/action path; a missing session is sent to logout.
- Search with no criteria lists all dealers by name; name/mobile filters use exact AND logic.
- Creating a unique name/mobile pair writes the record and both audit pairs.
- Updating the same dealer changes business values and only update audit values.
- Attempting the same name/mobile on another ID shows the duplicate warning and leaves data unchanged.
- Edit populates from the client-rendered row without a server fetch.
- Export contains all current name/mobile query matches and only the seven defined business columns.
- Delete permanently removes the selected `Dealer_Master` row.
