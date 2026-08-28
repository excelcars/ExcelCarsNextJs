# SSOT - Customer Management Module (Legacy)

## Status: Legacy ASP.NET MVC implemented; extracted from existing codebase

**Module:** `Configuration/CustomerManagement`  
**Project:** `ExcelCars` legacy ASP.NET MVC  
**Route:** `/Configuration/CustomerManagement`  
**Source of truth:** `ExcelCars/Controllers/ConfigurationController.cs` (Customer Management region), `ExcelCars/Views/Configuration/Customer_Management_View.cshtml`, `ApModel/Model/Customer/Customer_Management.cs`, `ApModel/Model/Common/CommonFor_Model_Color_Variant.cs`, `ExcelCars/Scripts/Validations.js`, and `db/excelCarsFinal.sql` (`Customer` table).

## 1. Purpose and scope

Customer Management maintains the customer master used by the wider CRM. It creates, searches, edits, exports, and permanently deletes `Customer` records. The record stores a contact/customer classification, identity/contact details, optional dates, notes, company, and audit metadata.

The module does not own downstream inquiry, feedback, loan, insurance, RTO, inventory, or messaging records. It has no customer detail page, merge/deduplication workflow, state selector, pagination, server-side sort control, or soft-delete/status model.

## 2. Navigation and access control

- The legacy shared Configuration menu and Configuration landing menu show **Customer Management** only when `SessionInfo.AppFunctionList` contains `Customer_Management`; the link targets `ConfigurationController.CustomerManagement`.
- The main page, save/update, search, export, and delete actions carry `AuthorizeFilter(DatabaseFunctionname = "Customer_Management")`.
- Those actions also explicitly require `Session["SessionInfo"]`; absent session redirects to `Home/Logout`.
- The three autocomplete JSON actions have no visible `AuthorizeFilter` or explicit session guard in the supplied controller code.
- A user whose numeric `SessionInfo.Role_ID` is `4` is deliberately read-only in this screen: Save/Update and Edit/Delete columns/actions are not rendered. Search, Reset, and Export remain available. This is a UI-only restriction in the supplied code: `Save_Update_Customer` and `Delete_Customer` do not independently reject role 4.

## 3. Data model and ownership

The module directly reads and writes the `Customer` table.

| Persisted field | Legacy behavior |
| --- | --- |
| `Cust_Id` | Identity primary key; hidden form value. `0` creates; a positive id updates or deletes. |
| `Type` | UI choices are `Contact` and `Customer`; required in the browser. |
| `Cust_Name` | Required in browser and database; used in duplicate and name-search checks. |
| `Cust_Address` | Optional free text. |
| `Cust_Mobile`, `Mobile_2` | Primary mobile is required in browser; both inputs are keyboard-restricted to digits and have `maxlength=11`. |
| `Cust_Email` | Optional, but validated with the shared email regex when supplied. |
| `Cust_DOB`, `Cust_Anniversary_Dt` | Optional nullable dates displayed/picked as `dd/MM/yyyy`. The DOB label has an asterisk but the element is not a `.req` field, so it is not actually mandatory. |
| `Comments`, `Company_Name` | Optional free text; both support list filtering. Company also supports autocomplete. |
| `Created_Dt`, `Created_By` | Set only on insert from server time and `SessionInfo.UserId`. |
| `Updated_Dt`, `Updated_By` | Set on every insert/update from server time and `SessionInfo.UserId`. |
| `FK_State_ID` | Exists in the database schema, but is neither displayed nor written by this module. |

The save/update model opens an Entity Framework context and wraps its single-table save in a .NET `TransactionScope`. Its catch block rolls back and sets `Is_Save_Success=false`; the caught exception is not assigned to the public `error` property, despite controller code being prepared to log it.

## 4. Screen contract

### Form and commands

The route initially renders a blank `Customer_ViewModel`; no records are loaded until Search.

| Control | Behavior |
| --- | --- |
| Type | Required select: blank `Select`, `Contact`, or `Customer`. It is also a search criterion. |
| Name | Required text field and search criterion. JQuery autocomplete offers distinct existing names beginning with the typed text. |
| Address | Optional text field; saved and displayed but not searchable. |
| Mobile | Required numeric text field; exact-match search criterion. Autocomplete offers distinct existing primary mobiles beginning with the typed text. |
| Mobile 2 | Optional numeric text field; saved/displayed only. |
| Email | Optional text field, email-format validated when nonblank; saved/displayed only. |
| Date of Birth / Anniversary Date | Optional readonly date-picker inputs. Picker format is `d/m/Y`; manually nonblank malformed dates fail client validation. |
| Comments | Optional text, saved/displayed and substring-searchable. |
| Company Name | Optional text, saved/displayed and substring-searchable. Autocomplete offers distinct company names containing the typed text. |
| Search | Posts the form to `Search_Customer` and retains submitted criteria/results. |
| Save / Update | Visible unless role id is 4. Runs shared `validate()`, then posts to `Save_Update_Customer`; its caption becomes Update after client-side edit selection. |
| Reset | Posts to `CustomerManagement`, creating a fresh blank view model and clearing results. |
| Export to Excel | Appears only with search results. Posts current form criteria to `ExportToExcel_Customer_Details`. |
| Edit | Visible in each result row unless role id is 4. It is entirely client-side: copies hidden row values to the form, truncates stored date strings to the first 10 characters, changes Save to Update, and scrolls to the top. |
| Delete | Visible in each result row unless role id is 4. Immediately posts the selected id to `Delete_Customer`; there is no confirmation. |

### Results table

The table is shown only when the result list is non-empty. It provides serial number, type, name, address, both mobiles, email plus comments, DOB plus anniversary, company name, and (except for role 4) Edit/Delete controls. It has no explicit page size/pagination or sorting implementation. Empty search produces a warning TempData message rather than an empty-state table.

## 5. Server workflows

### Create and update

`Save_Update_Customer(Customer_ViewModel)` first calls `Duplicate_Check()`:

- a duplicate is any other `Customer` with exact database equality for both `Cust_Name` and `Cust_Mobile`;
- no trimming, case normalization, mobile normalization, or email/secondary-mobile duplicate check is performed;
- the current id is excluded on update.

If no duplicate is found, `Insert_Update_Customer()` inserts a new entity when `Cust_Id == 0`, otherwise loads the entity with `SingleOrDefault` and overwrites the editable fields. The model sets audit fields as described above and calls `SaveChanges()` inside its transaction. It reports a Saved or Updated TempData success according to the original id; failure produces a generic error or controller-level contact-system message.

There is no server-side required-field, type, email, numeric, date, allowed-type, or id validation. Direct requests can bypass the client rules. An update whose supplied id is absent causes a null dereference in the model, is rolled back, and returns the generic save error.

### Search and autocomplete

`Search_Customer()` uses these AND-combined predicates:

- `Cust_Name.Contains(submittedName)` when name is nonempty;
- exact `Cust_Mobile == submittedMobile` when mobile is nonempty;
- exact `Type == submittedType` when type is nonempty;
- `Comments.Contains(submittedComments)` when comments are nonempty;
- `Company_Name.Contains(submittedCompany)` when company is nonempty.

Other form fields do not filter. Query order is not specified. Each row is projected into a fresh view-model object. `Convert.ToDateTime` is called for nullable dates while constructing result rows, so a null date is converted to `DateTime.MinValue` and later rendered blank.

The three autocomplete endpoints are separate read paths:

- name: `Customer.Cust_Name.StartsWith(term)`, distinct;
- primary mobile: `Customer.Cust_Mobile.StartsWith(term)`, distinct;
- company: `Customer.Company_Name.Contains(term)`, distinct.

They return string arrays with no documented sort or maximum result count. The browser autocomplete runs while typing and does not itself run the main search.

### Export

`ExportToExcel_Customer_Details()` reruns the same `Search_Customer()` logic using the posted criteria, projects every matching row, and calls `Utility.GetExcel(..., "Customer_Details")`. Export columns are Type, Customer Name, Customer Address, Customer Mobile, Mobile 2, Customer Email, Customer DOB, Customer Anniversary Date, Comments, and Company Name. Missing DOB/anniversary values are exported as empty strings. The zero-result condition uses `< 0`, which is impossible, so it cannot show the intended no-record warning.

### Delete

`Delete_Customer()` calls `Delete_Customer(id)`. For a nonzero id, the model finds the customer and calls Entity Framework `DeleteObject` then `SaveChanges`; this is a hard delete. It sets a success TempData message only when a record was found and removed. A zero/missing id is silent. Foreign-key failures are caught by the controller and shown as the generic contact-system message.

## 6. Validation, failures, and edge cases

- Shared `validate()` makes a synchronous request to `/Home/chkSession`; a false response opens login UI and prevents save.
- Required client fields are Type, Name, and primary Mobile. Required numeric fields also reject a numeric zero value.
- Keyboard restrictions are convenience only; pasted/direct values and direct HTTP requests can bypass them.
- Email is optional but must match the shared limited email regex when present. Dates are optional but must pass a client `dd/MM/yyyy` calendar check when present.
- Search/export/delete do not call client validation, so filters can be blank or otherwise malformed.
- Controller action exceptions are logged through `Exceptioncatch.create`; save-model exceptions are swallowed before the controller can inspect their details.
- No delete confirmation, optimistic concurrency check, database uniqueness constraint, or audit/event log is supplied.

## 7. Verification checklist

- A permitted non-role-4 user can create, search, edit, export, and permanently delete customer records.
- Role 4 sees search/reset/export but not mutation controls; direct mutation requests remain a legacy authorization gap.
- Search combines the five documented predicates and uses exact primary-mobile/type matching.
- Duplicate create/update is rejected only for the exact name + primary-mobile pair.
- Export contains every matching row and the documented ten columns.
- Reset returns a blank form and removes results.

## 8. Review record

Two code-review passes were completed against the controller, model, Razor view, shared validation script, autocomplete helper, menu integration, and database schema. The second pass specifically confirmed the role-4 UI restriction, the omitted server guard for autocomplete endpoints, optional DOB despite its label, the export zero-result bug, and hard-delete behavior.
