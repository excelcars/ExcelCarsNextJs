# SSOT - Feedback Management Module (Legacy)

## Status and source boundary

**Module:** `Configuration/Feedback_Management` in the legacy ASP.NET MVC application.  
**Route:** `/Configuration/Feedback_Management`.  
**Primary source files:** `ExcelCars/Controllers/ConfigurationController.cs` (Feedback Management region), `ExcelCars/Views/Configuration/Feedback_Management.cshtml`, `ApModel/Model/Feedback_Management/Feedback_Management.cs`, `ExcelCars/ViewModel/Feedback_Management_ViewModel.cs`, and the `Customer_Feedback`, `Customer`, and `Inventory_Management` mappings in the legacy database model.

This module records a five-question customer-feedback response, retaining snapshot customer and vehicle values on the feedback row. It may also create or update a `Customer` master record in the same save transaction. It does not calculate a score, send notifications, track follow-up, paginate, or enforce per-operation read-only roles.

## Navigation and access control

- The Configuration menu exposes Feedback Management through the legacy configuration navigation when its function is available; the controller actions use `AuthorizeFilter(DatabaseFunctionname = "Feedback_Management")`.
- Page load, save/update, search, export, and delete also require `Session["SessionInfo"]`; an absent session redirects to `Home/Logout`.
- `Autocomplete_Car_Registration` has neither the displayed custom authorization filter nor an explicit session check. Customer autocomplete calls `/Admin/AutoComplete_Get_Customer_Details`; its authorization is outside this module's supplied source.
- No supplied code hides Save, Edit, Delete, or Export for a particular role. The module therefore relies on the controller filter and session for protected actions.

## Data ownership and persistence

| Store | Read / written behavior |
| --- | --- |
| `Customer_Feedback` | Module's main entity: feedback id; customer FK and copied customer values; copied vehicle values; five answer strings; comments; creation/update audit fields. Delete physically removes this row. |
| `Customer` | Save finds an existing record only by exact `Cust_Name` **and** `Cust_Mobile`. It updates that record, or creates one, with `Type = "Customer"`, name, mobile, email, DOB, anniversary, and audit fields. Other customer fields are preserved when an existing record is found. |
| `Inventory_Management` | Read-only source for registration-number autocomplete. If a nonzero customer id is posted, results are restricted to that inventory record's `Customer_ID`; otherwise all registrations are returned. |

The model wraps the customer write and feedback write in one `TransactionScope`; it also explicitly opens/closes the EF connection. A successful save commits both writes. `Customer_ID` on the feedback row is always overwritten with the found/new customer id, irrespective of the hidden customer id posted from the browser.

## Screen contract

The initial route constructs a blank view model (including a DOB default of the current server date) and does not load results. The page is one form whose JavaScript changes its POST target.

| Area / control | Actual behavior |
| --- | --- |
| Customer name | Required and searchable. jQuery autocomplete calls the Admin endpoint and, on selection, fills hidden customer id, name, mobile, email, DOB, and anniversary. Clearing a non-item clears all of those values. |
| Mobile / email | Required for Save, respectively numeric-keyboard/max 11 and shared email-regex client validation. Neither is marked searchable. |
| DOB / anniversary | Optional date-picker values (`d/m/Y`); DOB is read-only and initialized to today, anniversary remains manually editable. Both are persisted to customer and feedback snapshots. |
| Car make, model, variant, year | Optional free text; year has numeric keyboard restriction and maximum four characters. They are saved as feedback snapshots. |
| Registration number | Optional searchable free text with autocomplete. Suggestions depend on the currently hidden customer id. Selecting a registration does not populate car fields or establish a database vehicle link. |
| Five question groups | Each has a hidden bound field populated from its radio selection at save. Browser defaults are: Q1 `Neutral`, Q2 `Fair`, Q3 `Neutral`, Q4 `Not Sure`, Q5 `About the Same`. The fixed question text and options are shown in the source. |
| Comments | Optional one-line text. Saved and restored during edit, but deliberately not displayed as a visible result-table column. |
| Save / Update | `SaveUpdate()` copies selected radio values to hidden fields, runs shared `validate()`, then posts to `/Configuration/Save_Update_FeedBack`. The caption is changed client-side to Update after edit. |
| Search | Posts all fields to `/Configuration/Search_Feedback`; only customer name, mobile, email, and registration are used as server-side filters. |
| Reset | Posts to `/Configuration/Feedback_Management`, rebuilding a blank model and clearing results. |
| Export | Appears only after a nonempty search result; posts the current form/filter values to `/Configuration/ExportToExcel_Feedback_Details`. |
| Edit | Entirely client-side. It copies values from hidden fields in the selected result row, selects radios, sets the id, switches caption, truncates both date strings to ten characters, then scrolls to top. |
| Delete | Immediately posts the selected feedback id to `/Configuration/Delete_Feedback`; there is no confirmation. |

The result table is shown only after a nonempty Search. It shows serial number; grouped customer details (name/mobile/email/DOB/anniversary); grouped vehicle details (make/model/variant/year/registration); Answers 1–5; and Edit/Delete. There is no explicit paging, sort control, table search, empty-state table, or visible comments column.

## Server workflows

### Create and update

`Save_Update_FeedBack` records whether the incoming feedback id is zero for its success message, calls `Insert_Update_Feedback`, and returns a new blank view model—so results and submitted fields are cleared after either a successful or failed save.

`Insert_Update_Feedback`:

1. Attempts `Customer` lookup only when `Customer_Name` is nonempty, using exact equality of name and mobile. A blank name starts a new `Customer` object anyway.
2. Sets customer type/name/mobile/email/DOB/anniversary and update audit fields. It adds creation audit fields only for a new customer, then saves and captures its id.
3. Creates a new `Customer_Feedback` for id zero, otherwise loads the feedback row by `SingleOrDefault` and overwrites all stored feedback/customer/vehicle/answer/comment fields. It sets update audit fields and, for a new feedback row, creation audit fields.
4. Commits the transaction and sets `Is_Save_Success=true` only if both saves complete.

There is no duplicate-feedback prevention, no validation that a registration belongs to the selected customer, and no feedback-to-inventory foreign key. On update, an unknown positive feedback id produces a null dereference inside the transaction; the method sets its error/false result rather than returning an explicit not-found result.

### Search, export, and delete

- `Search_Feedback_Management` queries `Customer_Feedback` directly. Provided name, mobile, email, and registration predicates use exact equality and are combined with AND; blank values omit their predicate. Query order is unspecified and all matches are materialized. A zero-result search gives the record-not-found warning.
- Export reruns that exact search and sends all matching rows to `Utility.GetExcel` as `Feedback_Details`. Columns are customer name/mobile/email/DOB/anniversary, make/model/variant/year/registration, Answers 1–5, and comments. It also invokes Excel generation before its zero-result warning check.
- Delete finds a nonzero id, calls EF `DeleteObject` on the feedback row, and saves. It does not delete or undo the associated `Customer` update. A zero or absent id, or an unmatched id, is silent; a successful removal gives the deletion message.

## Validation, errors, and edge cases

- Shared `validate()` checks the session synchronously through `/Home/chkSession`, then browser-validates `.req`, `.num`, and `.email` inputs. Thus name, mobile, and email are required only in the browser; supplied server code does not independently validate requiredness, email syntax, numeric/length values, dates, answer values, or filter values.
- Direct POSTs can save arbitrary answer strings, blank customer data, arbitrary IDs/registration values, and potentially malformed dates. `Convert.ToDateTime` in result projection can fail for null/malformed stored DOB; `Convert.ToInt32` treats nullable numeric values according to .NET conversion behavior.
- Controller exceptions are logged with `Exceptioncatch.create` and shown as a generic contact-system error. Model-inner exceptions are stored in `error` and produce generic error messaging. Search/export/delete errors are handled by their controller catch paths.
- The legacy customer update is a material side effect: edits to one feedback response also change the matching shared customer master contact/date values.

## Verification checklist

- A protected page/action requires an active legacy session and `Feedback_Management` authorization.
- Save of a new response creates/updates a matching customer and creates one feedback row atomically.
- Edit rewrites the same feedback row and also updates the exact-name/mobile customer match.
- Search supports only the four exact AND-combined predicates; Export uses the same result set.
- Delete permanently removes only the feedback row, without confirmation or pagination.
