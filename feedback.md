# SSOT - Customer Feedback (Current Next.js Implementation)

## Scope and access

**Route:** `/config/feedback`. The dashboard navigation labels it **Feedback**. The page, server actions, and export route require an authenticated active user with either `Customer_Feedback_Management` or legacy-compatible `Feedback_Management` access-function permission. This compatibility preserves migrated legacy roles without changing their records.

Feedback is an independent response/snapshot record. Selecting a customer links `CustomerFeedback.customerId` and copies the displayed contact values into the response; saving Feedback never creates or updates the Customer master. The shared customer-search endpoint requires authentication plus Customer Management or Feedback route access. The Feedback form intentionally disables the picker’s customer-create action.

## Data and queries

`CustomerFeedback` stores the linked customer id when selected, name/mobile/email/DOB/anniversary snapshots, vehicle make/model/variant/year/registration snapshots, optional variant FK, five answer strings, comments, and creation/update audit data.

- `listFeedback` performs a server-side, paginated query (25 rows/page), newest feedback id first.
- A submitted search term is a case-insensitive OR match across customer name, mobile, email, and registration number.
- `listFeedbackForExport` uses the identical search predicate but returns every match.
- The vehicle picker reads inventory id/customer id/registration/SKU/year/variant labels. When a customer is linked, suggestions are limited to inventory records belonging to that customer; without one, all inventory can be searched. Manual vehicle entry remains available for unlisted/historical vehicles.

## Screen contract

The header shows the server-side result count, with Add Feedback and Export actions. Search is applied by submitting the search field; Clear removes it. Pagination keeps search state. The table shows customer/contact, full vehicle label and registration, Answers 1/2/4, plus View, Edit, and Delete. View opens all stored customer, vehicle, five-answer, and comment fields.

### Form

| Area | Behavior |
| --- | --- |
| Customer | Optional link through authenticated customer search. A manually entered response needs a name. Removing a link preserves the response snapshot but clears the FK. |
| Contact and dates | Name, mobile, email, DOB, and anniversary are saved on the feedback row only. DOB and anniversary use date inputs and are visible in the detail view/export. |
| Vehicle | Inventory selection copies variant FK and vehicle snapshots. Removing an inventory selection clears all copied vehicle values. Make, model, variant, year, and registration also remain manually editable. |
| Questions | The five legacy questions/options are retained. New form defaults match legacy: Neutral, Fair, Neutral, Not Sure, and About the Same. |
| Delete | Requires confirmation, permanently deletes only the feedback row, and keeps failures visible. |
| Export | Downloads CSV for all records matching the active server-side search. It includes all customer, vehicle, answer, and comment fields. |

## Validation and writes

Create and update validate server-side before Prisma writes:

- linked customer or nonblank name is required; name maximum is 150 characters;
- supplied mobile must be exactly 10 digits; supplied email must be syntactically valid;
- dates must be valid ISO dates and cannot be future dates;
- year must be an integer between 1886 and next calendar year;
- each answer must be one of that question’s configured options.

Blank strings are normalized to `null`, email is normalized to lowercase, and strings are trimmed. A selected customer/variant FK is connected on create and written on update; invalid/missing relation ids return the generic save error. Successful create, update, and delete authorize the action, revalidate `/config/feedback`, and refresh the displayed data. No customer master row is written by Feedback actions.

## Technical locations

- Page/query/paging: `app/(dashboard)/config/feedback/page.tsx`, `src/features/feedback/queries.ts`
- UI, local CSV generation, filtering controls: `src/features/feedback/FeedbackClient.tsx`
- Authorization and writes: `src/features/feedback/actions.ts`, `src/lib/access/accessCatalog.ts`, `src/lib/access/accessControl.ts`
- Authorized export: `app/api/feedback/export/route.ts`

## Verification checklist

- A role carrying either feedback permission name can open and operate the module; other sessions cannot.
- Save/edit does not create or alter Customer master data.
- A linked customer scopes vehicle suggestions; a manual vehicle can still be recorded.
- Search, paging, export, and result count share the same name/mobile/email/registration predicate.
- DOB/anniversary, all five answers, comments, and full vehicle data survive create/edit and appear in detail/export.
