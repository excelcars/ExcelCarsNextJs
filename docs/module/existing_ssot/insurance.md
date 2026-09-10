# SSOT — Existing Insurance Management Module

## Status and evidence

Legacy ASP.NET MVC implementation; two code-review passes completed. The module route is `Admin/Insurance_Management`. Primary evidence is `ExcelCars/Controllers/AdminController.cs` (actions 1185–1448), `ExcelCars/Views/Admin/Insurance_Management.cshtml`, `ApModel/Model/Insurance_Management/Insurance_Management.cs`, and `ExcelCars/ViewModel/Insurance_ViewModel.cs`.

## Purpose, access, and entry points

Insurance Management records an insurance referral/policy, customer and vehicle snapshots, insurance agent details, premium/payout terms, policy/payout statuses, reminders, payment receipts, and history. Its authorized menu entry and dashboard links are visible only when the session's function list contains `Insurance_Management`; most controller actions carry the same `AuthorizeFilter` and separately redirect a missing `SessionInfo` to `Home/Logout`.

- Main screen: `Admin/Insurance_Management`; resets to a blank view model with default `DateTime.Now` entry, renewal, expiry, and follow-up dates.
- Dashboard drill-down: `Admin/Search_Insurance_By_Registration_No?car_registration_no=...` runs the normal exact-registration search.
- The agent autocomplete (`AutoComplete_InsuranceAgent_Details`) and payment-history JSON action (`Search_Insurance_Details`) do **not** have the authorization attribute. The latter checks only that a session exists; the former has no shown session check.
- No field-level permissions or role hierarchy are implemented here.

## Persistence model and transaction boundary

| Entity | Module behavior |
| --- | --- |
| `Insurance_Main` | Parent policy/referral; stores denormalized agent, customer, vehicle, premiums, payout summary/statuses, latest follow-up/remark, inventory/customer IDs, and audit fields. |
| `Customer` | On main save, finds an exact `Cust_Name` + `Cust_Mobile` match or creates a `Type = "Customer"` record, then writes its id to the parent. The posted customer ID does not decide reuse. |
| `Insurance_Payment_Details` | First save creates a payment row; editing overwrites the *first* row for the parent. Balance-payment saves append a row. Parent total is recalculated from all rows. |
| `Insurance_Followup_Details` | Main save creates or reuses a row keyed by parent + exact follow-up date + exact remark. Balance payment adds a row only if its next-follow-up date is supplied. |

`Insert_Update_Insurance()` wraps customer, parent, initial payment/follow-up, and total recomputation in `TransactionScope`; `Save_Partial_Payment_And_Followup_Insurance()` separately wraps append/recompute work. Audit dates use server `DateTime.Now`, and audit users use `SessionInfo.UserId`.

## Screen contract

The one posted form is used for save, search, reset, export, delete, and the balance-payment modal. The hidden `Insurance_Main_ID` selects create versus edit.

| Area | Fields and behavior |
| --- | --- |
| Vehicle | Required car type (`New`/`PreOwned`), make, model, and registration number; optional variant; numeric year (max 4 digits, not CSS-required); hidden inventory ID. Make/model/variant autocomplete only fills text, and no inventory lookup is performed by this module. |
| Customer | Required name and mobile (numeric, max 10); optional email. Shared customer autocomplete fills id/name/mobile/email; clearing selection resets these fields/id. |
| Agent | Required name and mobile (numeric, max 13); optional email. Autocomplete searches earlier `Insurance_Main.Agent_Name.StartsWith(term)` entries and fills name/mobile/email, so duplicate suggestions are possible and no agent master is used. |
| Commercial/status | Entry date, required insurance premium, OD premium, payout percentage, calculated read-only payout amount, optional initial amount received, required payout status (`Pending`/`Paid`) and policy status (`Pending`/`Received`). Payout is browser-calculated as `OD premium × payout percentage ÷ 100`. |
| Dates/remark | Required, readonly picker-driven renewal, expiry, and follow-up dates; optional remark. Dates display as `dd/MM/yyyy`. |
| Search-only | Agent name, customer name, registration number, inclusive From Date, and inclusive To Date. |

The result grid is rendered only after a non-empty search result. It displays car details; entry/customer; agent; premiums, payout and total received; both statuses; renewal/expiry/follow-up; and View, Edit, Delete, and Pay. There is no server-side ordering, UI sort control, or pagination.

## Actions and workflows

- **Search:** exact equality on nonblank agent, customer, and registration; `Entry_Date >= FromDate` and `<= ToDate`; blank filters return every record. A zero result produces a warning. No status/premium/renewal filter exists.
- **Save/Update:** client `validate()` checks `.req`, numeric keyboard rules, and email format. It then checks duplicate registration on the server, excluding the edited ID. A duplicate blocks save. The server stores posted payout values rather than recomputing them.
- **Initial payment/follow-up:** create inserts a payment row from `Amount_Received` (possibly zero) and a follow-up row. Update changes the first payment row and only reuses a follow-up when the exact date/remark match; otherwise it adds a follow-up. Parent `Total_Amount_Received` is the sum of payment details.
- **Edit:** copies hidden values from the selected grid row into the form in the browser, changes Save to Update, and scrolls upward; it does not reload the record.
- **View:** synchronous AJAX calls `Search_Insurance_Details(ID)` and renders payment-history columns (insurance/OD premium, payout percent/amount, amount received) plus follow-up date/remark rows in a modal. The payment response does not include saved status or payment timestamp.
- **Pay / balance payment:** modal shows premium, OD premium, payout, total received, and calculated balance `payout − total`. Operator enters amount, payment status (`Pending`/`Paid`), policy status (`Pending`/`Received`), optional next follow-up and optional remark. Browser blocks only prospective totals above payout (equality allowed). Server appends payment, conditionally appends follow-up, recomputes parent total, always updates parent statuses, and changes parent follow-up/remark only if a next date exists.
- **Delete:** immediately posts the ID; there is no confirmation. It hard-deletes parent, then payments, then follow-ups using separate `SaveChanges()` calls and no transaction.
- **Reset:** posts to the main action, discarding form/search state. **Export:** reruns the exact legacy search and sends all matching rows to `Utility.GetExcel` as `Insurance_Details`; its `< 0` empty check is impossible, so it cannot report an empty export.

## Validation, error handling, and edge cases

- Server code does not independently enforce required fields, number/date ranges, phone/email shape, allowed status vocabulary, payout formula, positive amounts, or the client balance guard. Readonly payout/date values are posted and trusted.
- Duplicate check applies exact registration equality. A blank registration can be saved once but the second blank record is treated as duplicate because `null/blank` equality is queried directly.
- The main form's displayed total is posted, then replaced by the payment-detail sum. Consequently its initial payment row and parent total can differ until recomputation, and an update mutates historic first-payment data.
- Search/projecting uses `Convert.To...` on nullable legacy columns; null data can fail the screen/history response.
- Controller exceptions are logged through `Exceptioncatch.create` and surfaced as generic TempData messages. Delete can leave partial/orphaned state if a later delete fails, and reports success for any nonzero ID after its statements run.

## Migration-critical rules

Preserve or explicitly approve changes to: exact registration uniqueness; customer reuse by name/mobile; initial-payment/history semantics; parent total recomputation; balance-payment follow-up behavior; hard deletion; function-level access; and the distinction between browser-only versus server validation. This document describes verified legacy behavior, including defects, not desired behavior.
