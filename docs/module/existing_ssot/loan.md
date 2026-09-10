# SSOT - Existing Loan Management Module

## Status: Legacy ASP.NET MVC implemented; second-pass code review complete

**Legacy route:** `Admin/Loan_Management`  
**Legacy project:** `ExcelCars` ASP.NET MVC / Entity Framework  
**Primary evidence:** `ExcelCars/Controllers/AdminController.cs`, `ExcelCars/Views/Admin/Loan_Management_View.cshtml`, `ExcelCars/ViewModel/Loan_Management_ViewModel.cs`, and `ApModel/Model/Loan_Management/Loan_Management.cs`.

## 1. Purpose and scope

Loan Management records a vehicle-finance referral, its bank contact, customer and vehicle details, the agreed payout, payments received from the bank, and follow-up remarks. It owns a single form plus a search-result grid and a balance-payment modal. It also owns an Excel export.

It creates/updates records in `Customer`, `Loan_Management`, `Loan_Payment_Details`, and `Loan_Followup_Details`; it does not create inventory, make/model/variant master, or bank-contact master records.

## 2. Access and navigation

- Every page action except bank autocomplete has `AuthorizeFilter(DatabaseFunctionname = "Loan_Management")` and independently requires `Session["SessionInfo"]`; a missing session redirects to `Home/Logout`.
- The module route is `Admin/Loan_Management`; an authorized direct-registration entry point is `Admin/Search_Loan_Management_By_Registration_No?car_registration_no=...`.
- Bank-contact autocomplete (`AutoComplete_Get_Loan_Bank_Details`) has no shown authorization/session check.
- The legacy authorization filter is the intended function-level gate. This module itself contains no field-level or role-hierarchy rule.

## 3. Data model and persistence boundary

| Entity | Ownership / use |
| --- | --- |
| `Loan_Management` | Main referral: entry date, bank/contact snapshot, customer snapshot/id, inventory/vehicle snapshot, payout/payment summary, current follow-up and audit fields. |
| `Customer` | Save finds by exact `(Cust_Name, Cust_Mobile)` or creates a `Type = "Customer"` record, then writes the selected/new id into the loan. |
| `Loan_Payment_Details` | Initial save creates/updates one first payment row; balance-payment saves append a row. Its sum becomes main-record `Total_Amount_Received`. |
| `Loan_Followup_Details` | Initial save creates/updates a follow-up row; balance-payment saves append one only when a next follow-up date is supplied. |
| inventory and car masters | IDs/text are accepted from the form/autocomplete. The module does not verify an inventory relation before saving. |

`Insert_Update_Loan()` wraps customer, main loan, initial payment/follow-up, and recomputed total in a `TransactionScope`. `Save_Partial_Payment_And_Followup()` separately wraps its appended payment, optional follow-up, and recomputed total in another `TransactionScope`. Audit dates use server `DateTime.Now`; audit user is `SessionInfo.UserId`.

## 4. Screen contract

### 4.1 Main form

The hidden loan id chooses create (`0`) or update. Fields marked `*` are client-required:

| Group | Fields and behavior |
| --- | --- |
| Vehicle | `Car Type` (`New` or `Pre Owned`/value `PreOwned`), year, make, model, variant, registration number, and hidden inventory id. All six visible fields are required. |
| Customer | Hidden customer id; required name and mobile (numeric keyboard restriction, maxlength 13); optional email with client email validation. Customer-name autocomplete fills id, name, mobile and email. |
| Bank | Required bank person name and mobile (numeric restriction, maxlength 13); optional person email; required bank name. Bank-person autocomplete fills name, mobile and email from prior loan records. |
| Commercial | Required entry date, loan amount, payout percentage, calculated read-only payout amount, required initial amount received, and read-only total received. Payout is calculated in the browser as `loanAmount * payoutPercentage / 100`. |
| Payment/follow-up | Required payment status (`Pending` or `Paid`), payment date and follow-up date; optional remark. Dates use a `dd/MM/yyyy` date picker. |
| Search-only fields | Customer name, bank person name, registration number, from date and to date are marked searchable. The same form is posted for both search and save. |

`Total Amount Received` is populated from the saved summary on edit; on a newly entered record the client does not automatically copy `Amount Received` into it. The server recalculates the stored summary from detail rows after save.

### 4.2 Listing and actions

Search results appear only after a result-returning search. They contain serial number; entry date; grouped car, bank, customer, loan/payout, payment and follow-up details; then Edit and Delete. The group headed **Insurance Details** actually displays loan amount, payout percent, payout amount, and a **Pay** button (a legacy label defect).

- **Search** posts to `Search_Loan_Management`.
- **Save / Update** uses client validation then posts to `Save_Update_Loan`; button text changes to Update after inline edit.
- **Reset** posts to `Loan_Management`, returning a new blank model.
- **Edit** copies row values from hidden inputs into the top form client-side and scrolls to the top; it does not request fresh record data.
- **Delete** posts its id to `Delete_LoanMangement` immediately; there is no confirmation.
- **Pay** opens a balance-payment modal for that row.
- **Export to Excel** is shown only with search results and posts current submitted filters to `ExportToExcel_Loan_Details`.
- There is no pagination or declared sort control. The query itself has no `OrderBy`, so database order is not a contract.

## 5. Search, autocomplete and export

### Search semantics

`Search_Loan_Management()` returns exact matches only:

- customer name equals submitted `Customer_Name`, when nonblank;
- bank person name equals submitted `Bank_Person_Name`, when nonblank;
- registration equals submitted `Registration_No`, when nonblank;
- entry date is `>= FromDate` and `<= ToDate` when each bound is supplied.

It returns all rows satisfying those predicates, with no payment-status filter and no paging. Empty filters return all records. The controller issues a not-found warning for an empty list.

### Autocomplete

- Customer autocomplete calls the shared `AutoComplete_Get_Customer_Details`; selecting an item fills customer id/name/mobile/email. Clearing the selection clears those values and sets id to zero.
- Bank autocomplete searches **existing `Loan_Management` rows** where `Bank_Person_Name.StartsWith(term)`. It can return duplicate contact values and fills the bank person’s name/mobile/email, not `Bank_Name`.
- Make, model, and variant each call their respective shared master autocomplete and only set the selected text.

### Export

Export reruns the server search (rather than exporting browser rows) and sends its full matching set to `Utility.GetExcel` as `Loan_Details`. Columns are vehicle fields, registration, customer/contact fields, entry date, loan/payout/payment amounts and status/dates, follow-up date, and remarks. The `Count < 0` empty check is impossible, so export does not show a not-found warning for zero rows.

## 6. Create/update business rules

1. Controller calls `Duplicate_Check()` before persistence. A duplicate is any other loan whose registration is exactly equal. Blank registration is therefore effectively unique too: a second blank record is rejected.
2. Customer lookup is exact name + mobile. If no match exists, a customer is created; the posted hidden customer id does not control that lookup.
3. Main loan fields are inserted or overwritten, including denormalized customer and vehicle snapshots.
4. First save creates a payment detail for `Amount_Received` and a follow-up detail for the current follow-up date/remark. On update, it finds the **first** detail payment for the loan and overwrites it; it similarly finds by `(loan id, current remark)` and overwrites/creates a follow-up object. Thus editing can alter a historical first payment rather than append an adjustment.
5. The main `Total_Amount_Received` is always recalculated as `SUM(Loan_Payment_Details.Amount_Paid)`.
6. Client-side save rejects an initial amount plus displayed current total when it is greater than payout. Equality is allowed despite the warning wording saying “less than.” This check is not repeated server-side.

## 7. Balance payment and follow-up workflow

Clicking **Pay** copies main-row loan amount, payout amount, total received and bank name into readonly modal fields. It displays balance as:

`Payout Amount - Total Amount Received`

The operator enters a new received amount, status (`Pending`/`Paid`), optional next follow-up date and optional remark; payment date is readonly and initialized to the model’s current date. The client shows the prospective new total and rejects a total greater than payout.

On save the server:

1. appends a `Loan_Payment_Details` row using the modal amount/status/current server-side fields;
2. appends a follow-up only if next follow-up date is non-null;
3. recomputes the main total as the sum of all payment detail amounts;
4. updates main follow-up date and remarks only when a next follow-up was supplied.

There is no server-side overpayment check, positive-amount check, or requirement for a follow-up/remark. A crafted request can bypass the client guard.

## 8. Validation, errors and edge cases

- Shared `validate()` enforces `.req` fields, numeric/numeric-decimal keyboard behavior and the client email rule. The controller/model do not independently enforce required values, numeric ranges, dates, status vocabulary, payout formula, uniqueness beyond registration, or max lengths.
- `Payout Amount` is readonly in the DOM but posted and trusted by persistence; it is not recomputed server-side.
- `Delete_Loan_Management()` hard-deletes main loan then payment rows then follow-up rows in separate saves, without a transaction. A failure can leave orphaned child rows or a partial delete; it returns true whenever the supplied id is nonzero, even if no main row existed.
- Several nullable database fields are converted with `Convert.ToDateTime`, `Convert.ToInt32`, and `Convert.ToDecimal` during search; legacy rows with nulls can fail the screen.
- Errors are logged with `Exceptioncatch.create`; actions use generic TempData error/contact-system messages. Save methods retain an exception on the model for controller logging.

## 9. Verification checklist

- Permission/session denial follows the legacy redirect behavior, while bank autocomplete remains separately tested for its missing gate.
- New save creates/reuses customer, main loan, first payment, first follow-up and a summed main total atomically.
- Exact search and inclusive from/to date bounds work; blank filters return every loan.
- Duplicate registration prevents create/update, including the blank-registration edge case.
- Payout calculation and client overpayment guard behave as documented, and direct requests demonstrate their absence server-side.
- Balance payment appends a detail and recomputes total; optional follow-up changes the main follow-up only when supplied.
- Delete behavior and its non-transactional/orphan risk are consciously retained or replaced.

## 10. SSOT rule

This is the existing-system SSOT for legacy Loan Management. Migration work must preserve these proven behaviors or explicitly approve a replacement. In particular, payment-history mutations, summary recomputation, duplicate semantics, hard deletion, access behavior, and the client/server validation divide must not be inferred from the UI alone.
