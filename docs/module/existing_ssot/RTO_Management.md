# SSOT - Existing RTO Management Module
## Status: Implementation-backed documentation of the legacy MVC module

**Legacy module:** `Admin/RTO_Agent_Management`  
**Primary screen:** `Views/Admin/RTO_Agent_Management_View.cshtml`  
**Primary controller:** `Controllers/AdminController.cs`  
**Legacy project:** `C:\KhizarShaikh\Project\ExcelCars` (ASP.NET MVC / Entity Framework)  
**Database aggregate:** `RTO_Agent` with `RTO_Payment_Details`, `RTO_Followup_Details`, and `Customer`  

This document describes the existing system. It is not a proposed redesign. Known implementation drift and defects are recorded as behavior.

## 1. Purpose And Scope

RTO Management records and tracks registration-transfer work performed by an RTO agent for a vehicle/customer. It covers:

- RTO main-record creation and editing
- customer-master upsert
- vehicle, registration, agent, and transfer metadata
- charges, payment, RC, transfer, and follow-up status
- partial-payment and follow-up history
- exact-match search and registration drill-in
- Excel export and hard deletion

It does not maintain inventory, customer or agent master screens, authentication bootstrap, or shared layout/menu behavior.

## 2. Source Evidence

- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Admin\RTO_Agent_Management_View.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Controllers\AdminController.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\RTO_Agent_Management\RTO_Agent_Management.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\ViewModel\RTO_Agent_ViewModel.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Scripts\Validations.js`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Common\CommonFor_Model_Color_Variant.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Inventory_Management\Inventory_Management.cs`
- `C:\KhizarShaikh\Project\ExcelCars\db\ExcelCars_merged.sql`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Shared\Menu.cshtml`

## 3. Navigation, Routes, And Permissions

The admin menu shows **RTO Management** when `Session["SessionInfo"].AppFunctionList` contains `RTO_Agent_Management`. The link is `/Admin/RTO_Agent_Management`.

| Endpoint/action | Purpose |
|---|---|
| `/Admin/RTO_Agent_Management` | Open a blank form |
| `/Admin/Save_Update_RTOAgent` | Create/update main record |
| `/Admin/Search_RTO` | Search posted filters |
| `/Admin/Search_RTO_By_Registration_No?car_registration_no=...` | Registration drill-in search |
| `/Admin/AutoComplete_RTOAgent_Details?term=...` | Agent suggestions |
| `/Admin/AutoComplete_Get_Customer_Details?term=...` | Customer suggestions |
| `/Admin/AutoCompleteMake?term=...` | Make suggestions |
| `/Admin/AutoCompleteModel?term=...` | Model suggestions |
| `/Admin/AutoCompleteVariant?term=...` | Variant suggestions |
| `/Admin/Save_Update_Partial_Payment_RTO` | Append payment/optional follow-up |
| `/Admin/ExportToExcel_RTO_Details` | Export current filter result |
| `/Admin/Delete_RTOMangement` | Hard-delete selected record |

The main RTO actions (open, save/update, search, registration drill-in, partial payment, export, and delete) carry `AuthorizeFilter(DatabaseFunctionname = "RTO_Agent_Management")`. The generic make/model/variant/customer autocomplete actions and the RTO-agent autocomplete action do not carry this authorization attribute, although the controller-level `SessionExpireFilter` still applies. Protected actions redirect to `/Home/Logout` when `Session["SessionInfo"]` is absent. Audit writes use `SessionInfo.UserId`.

## 4. Screen Structure And Fields

The Razor page is titled **RTO Agent Management** and uses one POST form, `Frm_RTO_Agent`. JavaScript changes its action before submit.

| Label | Binding | Type/options | Required marker |
|---|---|---|---|
| Car Type | `Car_Type` | `New`, `PreOwned` | `*` |
| Car Year | `Car_Year` | numeric, max 4 chars | `*` |
| Make / Model / Variant | matching fields | text/autocomplete | `*` |
| Registration No. | `Car_Registration_No` | text | `*`, searchable |
| Customer Name | `Customer_Name` | text/autocomplete | `*#` |
| Customer Mobile No | `Customer_Mobile` | numeric, max 10 | `*` |
| Customer Email | `Customer_Email` | email text | optional |
| Agent Name | `Agent_Name` | text/autocomplete | `*#` |
| Agent Mobile No | `Agent_Mobile_no` | numeric, max 13 | `*` |
| Agent Email | `Agent_Email_ID` | email text | optional |
| Entry Date | `Date_of_Entry` | `dd/MM/yyyy` date | `*` |
| Transfer Charges | `Transfer_Charges` | decimal | `*` |
| Amount Paid | `Amt_Paid` | decimal | not marked required in markup |
| Payment status | `Payment_Status` | blank, Pending, Partially Paid, Fully Paid | `*` |
| Payment Date | `Payment_Date` | date | `*` |
| RC status | `RC_Status` | blank, Pending, Received | `*` |
| Transfer status | `Transfer_Status` | blank, Pending, Done | `*` |
| Followup Date | `FollowUp_Date` | date | `*` |
| Remark | `Remark` | text | optional |
| From Date / To Date | `FromDate`, `ToDate` | date search filters | `#` |

Hidden fields carry `Inventory_ID`, `RTO_Agent_Main_ID`, and `Customer_ID`. New model defaults are `Date_of_Entry = DateTime.Now`, `FollowUp_Date = DateTime.Now`, and `Next_Payment_Date = DateTime.Now`; `Payment_Date` has no constructor default.

## 5. Client Interactions And Validation

- **Search:** sets action to `/Admin/Search_RTO` and submits; it does not call full validation.
- **Save/Update:** calls `validate()`, then posts to `/Admin/Save_Update_RTOAgent`.
- **Reset:** posts to `/Admin/RTO_Agent_Management`, producing a fresh blank model.
- **Export:** visible only when results exist; posts current form filters to `/Admin/ExportToExcel_RTO_Details`.
- **Edit:** copies hidden row values into the main form, sets hidden ID, changes Save caption to `Update`, and scrolls to top.
- **Delete:** copies selected ID to the hidden ID and posts to `/Admin/Delete_RTOMangement`; there is no visible confirmation dialog.

`Validations.js` synchronously posts to `/Home/chkSession`; a `False` response opens `LoginOpen()` and fails validation. For `.req` elements, blank values get red styling/`Required` placeholder and block save. `.req.numWithdeci` and `.req.num` values are also invalid when `parseFloat(value) == 0`. Nonblank `.email` fields require `IsEmail()`; nonblank `.valid_date` fields require `isDate()`. Errors display `Invalid Email Id` or `Invalid Date`. Search, export, delete, reset, and partial-payment Save bypass this full validator.

Date pickers are attached to all main/search/modal date fields, use day/month/year display, and disable time selection.

## 6. Autocomplete

All autocomplete is jQuery UI and backend prefix matching (`StartsWith`).

- **Agent:** queries `RTO_Agent.Agent_Name`; returns ID/name/mobile/email from prior RTO rows. Selection fills all agent fields; invalid selection clears them.
- **Customer:** queries `Customers.Cust_Name`; returns ID/name/address/mobile/email/DOB/anniversary. The page uses ID/name/mobile/email; invalid selection resets ID to `0` and clears name/contact fields.
- **Make/model/variant:** queries `Car_Make_Master`, `Car_Model_Master`, and `Car_Variant_Master`, trims and deduplicates values. There is no dependent make→model→variant filtering.

## 7. Search And Listing

`Search_RTO` calls `Search_RTO_Agent_Management()` and returns the same view with posted values and results. Empty results set a record-not-found warning. Exceptions are logged and produce a generic error. `Search_RTO_By_Registration_No` creates a new model, sets only registration number, and runs the same query; dashboard/report registration links use this drill-in.

The query reads `RTO_Agent` and applies:

```text
blank Customer_Name OR Customer_Name == posted Customer_Name
blank Agent_Name OR Agent_Name == posted Agent_Name
null FromDate OR Date_of_Entry >= FromDate
null ToDate OR Date_of_Entry <= ToDate
blank Car_Registration_No OR Car_Registration_No == posted Registration_No
```

Customer, agent, and registration filters are exact-match and collation-dependent. Date bounds are inclusive. No filters exist for status, car type, make/model/variant, charges, payment, RC, transfer, or balance. There is no explicit sort, pagination, or partial text search.

The search fields are combined with logical **AND**: every nonblank field must match the same `RTO_Agent` row. A blank field is ignored. Therefore, entering only one field searches by that field, while entering customer plus agent plus registration narrows the result to rows matching all three. Entering all search fields blank returns all rows subject to normal database/query behavior.

The grid appears only when results exist and has ten columns:

1. Sr. No.
2. Car details: type, registration, year
3. Car details: make, model, variant
4. Customer: name, mobile, email
5. Agent: name, mobile, email
6. Transfer charges: charges, paid amount, Pay button
7. Status: payment, RC, transfer
8. Reminders: entry/payment/follow-up dates; remark is hidden
9. Edit
10. Delete

Hidden row inputs keyed by `RTO_Agent_Main_ID` power Edit and Pay. The view renders `Payment_Date.Value.ToShortDateString()`, so a null payment date can fail result rendering. Model mapping also converts nullable dates without explicit guards.

## 8. Main Save/Update Logic

`Save_Update_RTOAgent` first runs `Duplicate_Check()`. A matching registration belonging to another RTO row produces an already-exists warning and skips persistence. Otherwise it calls `Insert_Update_RTO_Agent()`. Success sets saved/updated messaging based on original ID and redirects to a fresh `/Admin/RTO_Agent_Management` page. Failure logs and redirects with generic error messaging.

`Insert_Update_RTO_Agent()` uses a `TransactionScope` and performs:

1. Open EF connection.
2. Upsert `Customer`.
3. Insert/update `RTO_Agent`.
4. Insert/update initial `RTO_Payment_Details`.
5. Insert/deduplicate initial `RTO_Followup_Details`.
6. Sum child payment amounts and write total to main `Amt_Paid`.
7. Commit and set `Is_Save_Success = true`.

### 8.1 Customer upsert

When customer name is nonblank, lookup is exact `Cust_Name + Cust_Mobile`.

- Existing match is updated; otherwise a new row is created.
- `Type = "Customer"`; name, mobile, email, DOB null, anniversary null, and updated audit fields are written.
- New rows receive created audit fields.
- Resulting `Cust_Id` becomes main `Customer_ID`.

If customer name is blank, the code still prepares a new customer object because the client-side requirement can be bypassed; this can attempt a blank customer insert.

### 8.2 Main row

ID `0` inserts; nonzero ID loads and overwrites the existing row. Agent, entry date, customer linkage/contact snapshot, vehicle, registration, charges, amount, payment status/date, RC status, transfer status, follow-up date, remark, and audit fields are written. `Inventory_ID` is carried from the hidden field. Created audit fields are insert-only; updated audit fields are always refreshed.

### 8.3 Initial payment child

Insert creates one payment child with main charges, amount, payment status/date, RC status, transfer status, and audit fields. Update loads the first payment child for the RTO ID and overwrites it, with no ordering. If none exists during update, a populated object is not explicitly added unless main ID is zero.

### 8.4 Initial follow-up child

Insert creates one child. Update searches for an exact match on RTO ID, follow-up date, and remark. An exact match suppresses insertion; changed date or remark creates another history row. The page does not list child history.

### 8.5 Aggregate

```text
RTO_Agent.Amt_Paid = SUM(RTO_Payment_Details.Amount_Paid WHERE FK_RTO_Agent_Main_ID = RTO ID)
```

Payment children are history; main `Amt_Paid` is a denormalized aggregate.

## 9. Partial Payment And Follow-Up

Each result has a **Pay** button that opens `PayModal` and copies charges/paid amount into read-only fields.

Client calculations:

- Balance = `Transfer Charges - Total Amount Paid`.
- New Total Amount = `Total Amount Paid + new Amount Paid`.
- If new total is greater than charges, save is blocked with `New Total Amount should be less than Transfer Charges`.
- Equality is allowed; negative amount is not explicitly blocked.

Modal inputs are new amount paid, next payment date/status, next transfer status, next RC status, optional next follow-up date, and next remark, plus read-only charges, current paid total, balance, and calculated new total. Status options are Pending/Partially Paid/Fully Paid, Pending/Done, and Pending/Received respectively.

Server `Save_Partial_Payment_And_Followup_RTO()` runs in a transaction:

1. Always insert a new payment child.
2. Insert a follow-up child only when next follow-up date is nonnull.
3. Recompute main `Amt_Paid` from all payment children.
4. Update main `Payment_Status` and `RC_Status`.
5. If follow-up date exists, update main `FollowUp_Date` and `Remark`.
6. Commit and return the view.

It does not update main `Transfer_Status` or main `Payment_Date`, allowing main/child status drift. It does not visibly verify that the posted main ID exists before inserting the child.

## 10. Delete

`Delete_RTO_Management` hard-deletes the main row, saves, deletes all payment children, saves, deletes all follow-up children, saves, and returns true. It has no own transaction scope, so partial cleanup is possible on failure. There is no soft delete or visible confirmation.

## 11. Export

Export reruns the search from posted filters and calls `Utility.GetExcel(j, "RTO_Details")`. It exports:

`Entry Date`, `Car Type`, `Car Make`, `Car Model`, `Car Variant`, `Registration No.`, `Car Manufacturing Year`, `Customer Name`, `Customer Mobile`, `Customer Email`, `Agent Name`, `Agent Mobile No.`, `Agent Email ID`, `Transfer Charges`, `Amt Paid`, `Payment Status`, `Payment Date`, `RC Status`, `Transfer Status`, `Followup Date`, and `Remarks`.

The controller's empty-result check is `Count < 0`, which is impossible; an empty export does not trigger that warning branch.

## 12. Data Model And Constraints

`RTO_Agent` is the aggregate root. `RTO_Payment_Details` and `RTO_Followup_Details` reference it by `FK_RTO_Agent_Main_ID`; main save also reads/writes `Customer`. All major columns in the supplied SQL are nullable, with identity primary keys.

SQL check constraints allow on main and payment rows:

- payment status: `Pending`, `Fully Paid`, or null
- RC status: `Pending`, `Received`, or null
- transfer status: `Pending`, `Done`, or null

The UI offers `Partially Paid`, which is a visible UI/schema mismatch if these constraints are active. No unique registration index is visible; duplicate prevention is application-level.

## 13. Business Rules And Edge Cases

- Duplicate registration is blocked except for the current record during edit; comparison is exact and unnormalized.
- Main save customer matching is exact name plus mobile and can rewrite existing customer email.
- Main save and partial save recompute cumulative paid amount from child rows.
- Partial payments append child history; main-save update overwrites the first initial payment child.
- Follow-up history appends unless main-save date+remark exactly match an existing row.
- No server-side required, email, date, positive-amount, or amount-not-over-charge validation is visible.
- Negative payment values are not blocked by the modal function.
- Nullable payment dates can break search-row rendering.
- Search has no explicit ordering and its list field is not cleared inside the model method; reuse of one instance could accumulate rows.
- Main/child status drift exists after partial payment because transfer status and payment date are not copied to main.
- Delete is non-atomic.
- Dashboard pending-payment and pending-transfer/RC widgets use main-row values and can therefore diverge from child payment history.
- The inventory screen's RTO hyperlink carries `id`, but the RTO open action ignores it and does not prefill inventory context.
- Multiple jQuery versions and an external HTTP jQuery include are present in the view, creating client dependency/mixed-content risks.

## 14. Cross-Module Integrations

- Dashboard registration links call `Search_RTO_By_Registration_No`.
- Menu visibility uses `AppFunctionList`.
- Customer lookup is shared with inventory logic.
- Car suggestions use shared car master tables.
- Outstanding-payment reporting derives RTO balance as `Transfer_Charges - Amt_Paid`.
- Reporting/stock pages consume RTO registration and transaction fields.

### 14.1 Dashboard operational widgets

The dashboard shows RTO sections only when the session function list contains `RTO_Agent_Management`:

- **RTO Pending Car Transfer/Pending RC Details** queries RTO rows where `Transfer_Status == "Pending" OR RC_Status == "Pending"`. It displays registration, customer name/mobile, agent name/mobile, transfer status, and RC status. The registration link opens `/Admin/Search_RTO_By_Registration_No`.
- **RTO/Loan/Insurance Pending Payment Details** includes RTO rows where `Amt_Paid < Transfer_Charges`. It displays type, registration, customer, agent, follow-up date, total amount, amount received, and balance. The RTO registration link again opens the registration drill-in.

The dashboard calculates RTO balance as `Transfer_Charges - Amt_Paid`. These widgets read the denormalized main RTO row, not payment-detail history, so they inherit main-row aggregate/status drift.

### 14.2 Inventory-to-RTO navigation

The inventory edit screen shows an RTO link when an inventory ID is present and builds `/Admin/RTO_Agent_Management?id=<inventory-id>`. The RTO `RTO_Agent_Management()` action accepts no `id` parameter and creates a blank view model, so the supplied inventory ID is ignored by the current implementation. This is an existing navigation/data-prefill gap, not an RTO search route.

### 14.3 Shared communication functionality

The shared SMS/email recipient model includes `RTO Agent` as a receiver type. Its RTO lookups search `RTO_Agent` by agent name, mobile, or email prefix/contains depending on the interaction, and its contact search can return distinct RTO agent name/mobile/email combinations. The RTO screen itself has no direct SMS/email button or endpoint; this is a related global capability.

## 15. Rewrite Invariants And Test Checklist

A faithful rewrite must preserve entry-point permission, exact filters, inclusive date range, no implicit pagination/sorting, customer upsert, duplicate-registration self-edit exception, payment aggregation, follow-up history semantics, partial-payment calculations/status options, export field coverage, registration drill-in, and hard deletion unless an approved change says otherwise.

Test at minimum:

- authorized/missing-session behavior
- create customer/main/payment/follow-up records
- existing customer update
- duplicate create and self-edit
- all search filters and empty results
- listing row actions and edit population
- partial-payment overage rejection, equality, append, aggregation, optional follow-up
- export filter basis and 21 exported fields
- delete child cleanup and failure behavior
- null payment/follow-up values
- UI/schema handling of `Partially Paid`
- intentional handling of existing main/child status drift

## 16. SSOT Rule

This file is the existing-system SSOT for legacy RTO Management. The legacy controller, Razor view, model, shared validation script, and database artifacts are authoritative for current behavior. Any rewrite deviation must be documented as an approved functional change, especially for validation, status constraints, payment aggregation, child history, null handling, and deletion atomicity.
