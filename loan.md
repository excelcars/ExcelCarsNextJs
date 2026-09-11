# SSOT - Loan Management

## Status: Next.js implemented; current-state behavior documented

**Route:** `/loan`  
**Evidence:** `app/(dashboard)/loan/page.tsx`, `src/features/loan/LoanClient.tsx`, `src/features/loan/LoanCustomerLookup.tsx`, `actions.ts`, `queries.ts`, `customerLookup.ts`, `app/api/loan/history/route.ts`, `app/api/loan/customer-search/route.ts`, `src/lib/access/accessControl.ts`, and `prisma/schema.prisma`.

## 1. Purpose and access

The module manages loan-referral records, their linked customer, bank partner/contact, optional stock vehicle, payment history, follow-up history, CSV export, and hard deletion.

- The route requires an active authenticated user granted access to `/loan`; otherwise the server redirects to `/dashboard`.
- Server actions authorize through `getAuthorizedUserIdForRoute('/loan')` before mutation.
- The dashboard middleware/layout also require an authenticated session.
- `GET /api/loan/history` requires both authentication and the `/loan` function permission; an authenticated user without it receives `403 Forbidden`.
- No per-record ownership restriction exists: any authorized loan user can list, edit, delete, and log payments for every record.

## 2. Data and relations

The main model is `loanManagement`. It stores bank/contact and customer/vehicle snapshot data, relationship ids, amounts, current payment/follow-up summary, remarks, and audit ids/dates.

- `customerId` links `customer` for every newly created loan; linked customer display values take precedence in reading the UI/export. Legacy rows may still have only snapshot fields until they are edited and linked.
- `fkPartnerId` optionally links `partnerMaster`; a selected Bank partner fills the contact snapshot, but a verified manual bank-contact snapshot may be saved when no partner record exists.
- `inventoryId` and `fkVariantId` may link an inventory vehicle/variant. The UI treats vehicle linkage as optional if a registration is entered manually.
- `loanPaymentDetails` contains appended payment entries; `loanFollowupDetails` contains appended follow-up entries.
- `createdBy`/`updatedBy` are populated from the authorized actor. Listing separately resolves those user names for the view dialog.

## 3. Page, listing and filters

`page.tsx` applies filters and pagination server-side, then passes the current page plus inventory vehicles to the client component. Filter state is URL-backed; successful save/payment still reloads the page.

The visible list has registration, customer, bank, loan amount, payout, total received, payment status, follow-up, and action columns. It shows the server-paged matching rows. Monetary values use Indian formatting; zero is displayed as `₹0`, while missing/invalid values render as `—`.

Server-side case-insensitive substring filters are:

- global search over registration, resolved customer name, and bank name;
- registration number; customer name; customer mobile; bank name; bank contact person; payment status; inclusive entry-date from/to bounds.

Reset clears all filters. Filtered count is the subtitle. All filters are URL-backed. Pagination supports 25, 50, or 100 rows per page. Export uses the same full server-side filtered set, not only the visible page.

## 4. Actions and forms

### Create and edit

**Add Loan** and **Edit** open a modal. The form exposes bank name; required Bank partner/contact picker; editable contact snapshot fields; a mobile-first customer lookup; optional inventory picker/registration lookup; vehicle fields; commercial/payment fields; and remarks. **Add Loan** also requires an initial amount received.

- The customer section searches Customer Master and Inquiry Management by mobile number. It returns each Customer Master person and inquiry separately, even when they share a mobile number, so the operator chooses the correct named person. Inquiry results show their number and available vehicle context.
- An inquiry already linked to a Customer Master record can be selected directly. An unlinked inquiry can only become a customer through the explicit **Create Customer from Loan** confirmation; it pre-fills the inquiry identity and vehicle context but never creates a master record silently. Customer creation validates name/contact and prevents a same-name/same-primary-contact duplicate.
- New loans require a Customer Master link. Selecting an inquiry vehicle copies its linked stock vehicle, or its inquiry car make/model/variant/year, into the loan form; the loan schema has no inquiry-id relation, so the inquiry itself is displayed as lookup context rather than persisted as a fabricated link. Existing legacy loans without a customer link must be linked to a selected or newly created customer before an edit can be saved.
- Selecting a Bank partner copies partner id/name/mobile/email. It is optional; `Bank Name` remains client-required and manual contact fields remain editable.
- Selecting stock vehicle fills inventory/variant id, make/model/variant/year and registration. A user may enter vehicle details manually, but registration is required in every case.
- Vehicle lookup normalizes registration by stripping non-alphanumerics and uppercasing; no match is informational and does not block manual continuation.
- Car type options are `New` and `PreOwned`; default is `PreOwned`.
- Payout is displayed as a client-recomputed two-decimal value whenever both loan amount and percentage are present: `round(loanAmount * percentage / 100, 2)`. On create/update, the server independently performs that calculation and ignores the submitted payout amount.
- Payment status options are `Pending` and `Paid`; entry, initial-payment, and follow-up dates default to today. Initial amount received must be positive and no greater than the computed payout.

Client and server validation require a Customer Master selection, vehicle make, model, variant, and valid year, and reject nonpositive entered loan amount, payout percentage outside 0–100, and invalid optional phone/email fields. They do not require entry date, payment date, follow-up date, or a partner link. Both create and update enforce a customer link, so a legacy snapshot-only row must be linked before it can be saved. Both paths enforce registration, bank name, car-type, vehicle make/model/variant/year, optional selected-partner validity, optional contact formats, amount/percentage range, paired amount-and-percentage, and payment-status rules. The server calculates the payout from validated amount/percentage; it never trusts the submitted payout field.

Create and update require registration. The value is canonicalized by stripping whitespace and uppercasing before storage. Duplicate lookup applies that same whitespace-stripped uppercase normalization to stored legacy values before comparison, so it catches case/spacing variations without rewriting existing data. Create then atomically creates the main row, an initial payment-detail row, and an initial follow-up-detail row. Main `totalAmountReceived` is initialized from the validated initial payment; its payment/follow-up dates default to the current server time when a date was not supplied. Update overwrites the main row’s data/relations without creating another initial payment. Both paths revalidate `/loan`.

### View, delete, and export

- **View** opens a read-only modal with customer, bank, vehicle, commercial/payment, remarks, and created/updated audit information.
- **Delete** opens a confirmation. Confirmed deletion hard-deletes all payment details, all follow-up details, and then the main record in one Prisma transaction; a failure rolls back the complete deletion.
- **Export** calls authorized `GET /api/loan/export`, which generates a CSV from every matching server-filtered loan row. It includes the main referral/payment fields, but no payment/follow-up history rows or audit columns.
- Closing an add/edit form with changed form/picker state prompts to discard. The component does not warn before leaving the page or closing the payment modal.

## 5. Payment and follow-up workflow

**Log Payment** opens a modal, fetches `/api/loan/history?loanManagementId=<id>`, and displays the complete payment and follow-up histories, each sorted newest first in a scrollable area.

The operator enters amount paid, a status, optional next follow-up date, and remark. UI validation:

- rejects an entered amount that is `<= 0` or would make browser-calculated history total exceed current payout;
- requires a future-or-today next follow-up if status is not exactly `Received`;
- requires a nonblank remark.

The only selectable statuses are `Pending` and `Paid`. A **Pending** payment requires a non-past next follow-up date and a remark; a **Paid** payment may omit both. The server independently requires a positive finite amount and one of those two statuses, and enforces the Pending-specific follow-up rule. It also rejects a loan with no positive payout amount and, within a serializable transaction, rejects a payment whose resulting detail-payment sum exceeds the current payout. It appends a follow-up only when a date was supplied, aggregates all detail payments, then updates the main total/current status/payment date. A supplied next follow-up replaces the main follow-up/remarks summary; without one, the existing main summary is retained. A failure in any operation rolls back the whole payment workflow.

## 6. Error handling and constraints

- Actions return `{ success, error }`; known foreign-key failures return a specific message, while general save/delete errors return generic text. Payment intentionally returns a generic failure.
- Client errors render in the active modal or export banner. Payment-history load failure shows a generic error and clears history.
- API history returns `401` when unauthenticated, `403` without the Loan permission, and `400` for an invalid/missing numeric id. Database errors bubble from that route.
- `listLoans()` and page load errors bubble to Next.js route handling.
- `src/features/loan/paymentValidation.test.ts` covers the canonical Pending/Paid payment-policy boundary: Pending follow-up/remark requirements, Paid completion without follow-up, invalid amounts, and invalid statuses. `src/features/loan/loanRules.test.ts` covers canonical registration whitespace/case normalization. Both run through `npm test`. Database transaction, authorization, duplicate-registration, filter, export, and deletion integration tests are still absent.

## 7. SSOT rule

This document describes actual current Next.js behavior, including client-only filters and validations, summary/history behavior, and authorization boundaries. Any change to the route permission, amounts, payment workflow, links, relationships, filters, export or deletion must update this file.

## 8. Approved migration decisions

- Payment and deletion mutations are atomic database transactions.
- Pending payments require a nonpast next follow-up and remark; Paid payments may omit them and retain the existing follow-up summary.
- Creating a loan creates its initial payment and follow-up history entries atomically.
- Loan registration is mandatory, whitespace-stripped/uppercased, and duplicate-checked against normalized legacy values.
- Loan list filters, pagination, and full CSV export are server-side and URL-backed.
- Module permission is intentionally broad: any user with `/loan` access can act on all loan records.
- Bank partners remain optional. New loan referrals require an explicit Customer Master link, selected mobile-first from Customer Master/Inquiry Management or created through the explicit Loan customer action. Legacy customer snapshots remain readable for migration only.
- Make, model, variant, and model year are mandatory. Monetary zero is displayed as `₹0`.
- Focused unit tests cover payment status/follow-up validation and registration normalization; broader database integration testing remains future quality work, not a functional requirement.
