# SSOT - Customers Module (Current Next.js Implementation)

## Status: Next.js implemented; current-state behavior documented

**Route:** `/config/customers`  
**Project:** `ExcelCarsNextJs`  
**Source of truth:** `app/(dashboard)/config/customers/page.tsx`, `src/features/customers/{CustomersClient,adminActions,adminQueries,actions,queries}.ts(x)`, `app/api/customers/search/route.ts`, `src/components/CustomerPicker.tsx`, `src/lib/access/{accessCatalog,accessControl}.ts`, and `prisma/schema.prisma`.

> This describes observed implementation, including the customer-picker helper used by other modules. It does not claim intended legacy parity.

## 1. Purpose and data ownership

The page is the customer-master administration screen. It lists, creates, updates, and hard-deletes `customer` rows. It owns the same core customer fields as legacy: type, name, address, two mobiles, email, DOB, anniversary date, comments, company name, and audit values. The Prisma model also exposes `fkStateId`, but this screen neither displays nor writes it.

Customer master records are referenced by checklist documents, feedback, DSA, inquiries, insurance, inventory, vehicle-email links, loans, and RTO records. This module does not manage those related records or expose a customer history/detail view.

## 2. Access and navigation

- `APP_ACCESS_CATALOG` maps `/config/customers` to the view permission `Customer_Management` and provides a separate, non-navigation write permission: `Customer_Management_Write`.
- The server page calls `canCurrentUserAccessRoute('/config/customers')`; an unauthenticated, inactive, role-less, or non-permitted user is redirected to `/dashboard`.
- The page requires the view permission. Add, Edit, Delete, and `quickCreateCustomer` require the separate write permission through their server actions; the page hides all mutation controls for view-only users.
- The shared layout removes Customer navigation unless the signed-in role has the mapped function. Middleware/auth remain responsible for login redirect.
- Read-only access is now capability-based rather than hard-coded to legacy role id 4. Administrators assign the view and write permissions independently through Role Access.

## 3. Administration UI and list contract

The server page reads `search`, `type`, and `page` URL parameters, fetches a page of rows, and hydrates `CustomersClient`.

| Surface | Actual behavior |
| --- | --- |
| Add Customer | Opens a blank modal. Default type is `Customer`. |
| Edit | Opens the same modal filled from the row. Every form field is editable. |
| Delete | Opens a confirmation dialog. Confirming calls the hard-delete action. |
| Search | A 400ms-debounced toolbar search changes URL state and refetches server data. It searches name, primary mobile, email, company, and comments case-insensitively by substring. |
| Type filter | Button group: `All`, `Contact`, `Customer`. Non-All filter is exact. |
| Pagination | Server-side, newest `custId` first, 25 rows per page. Prev/Next and `Page N of M` appear when more than one page exists. Filter/search changes reset page to 1; the implementation does not clamp an out-of-range requested page. |
| Table | Displays Name, Type, primary mobile/email, Company, DOB, Anniversary, and action buttons. A View icon is available to every user with page access and opens a read-only detail modal containing the omitted address, secondary mobile, and comments. Edit/Delete appear only to users with customer write permission. |
| Modal close/cancel | If form fields are unchanged, closes immediately. If Add or Edit fields have changed, the X/Cancel action opens a confirmation dialog before discarding them. Successful save closes modal and calls `router.refresh()`. |

There is no sorting control, export, standalone field filters, inline autocomplete on the admin form, or customer detail screen.

## 4. Form contract and validation

The Add/Edit modal contains Type, Name, Mobile, Mobile 2, Email, Company Name, DOB, Anniversary Date, Address, and Comments.

- The form and server actions share `validateCustomerInput`, so direct requests cannot bypass the established validation policy.
- Type is required and restricted to `Contact` or `Customer` for new records; quick-create uses `Customer`, eliminating new unfilterable `Individual` records. Existing legacy `Individual` records display their stored type in Edit and can be deliberately updated without forced conversion. An Edit form whose fields are unchanged has its Save button disabled.
- Name is required, trimmed, and has consecutive whitespace collapsed. Its maximum length is 150 characters.
- At least one primary contact is required: a 10-digit primary mobile or a valid email. Every supplied primary/secondary mobile must be exactly 10 digits, and secondary mobile cannot equal primary mobile. Email is trimmed, lowercased, validated, and limited to 254 characters.
- Address, company name, and comments are optional, trimmed, and limited to 500, 150, and 1,000 characters respectively.
- DOB and anniversary use `DD/MM/YYYY` in text inputs with an adjacent custom calendar selector. DOB is optional but its calendar disables dates that would make the customer younger than 18; anniversary selection is bounded by DOB (when present) and today. Typed dates receive the same server validation. Each must be a real calendar date that is not in the future; DOB must establish an age of at least 18, and anniversary cannot precede DOB. Valid submitted dates are normalized to ISO date-only values and stored as midnight UTC.
- Duplicate checks compare a normalized, case-insensitive name with the normalized primary mobile; where no primary mobile exists, they compare the normalized name with lowercased email. The current id is excluded on update.

## 5. Server actions and database effects

### `createCustomer(input)`

After name and permission checks, it performs the optional name+mobile duplicate lookup, creates one `customer` row, and sets `createdDt`, `updatedDt`, `createdBy`, and `updatedBy` from current time/current user. It revalidates `/config/customers` after success.

### `updateCustomer(id, input)`

It applies the same name, permission, and optional duplicate checks, then updates the row by id with all editable fields plus `updatedDt` and `updatedBy`. The action does not first independently confirm record existence; a nonexistent id is caught and returned as a generic save failure. It preserves create audit values and revalidates the page on success.

### `deleteCustomer(id)`

It requires customer-module authority, then executes `prisma.customer.delete`, which permanently deletes the row. Prisma foreign-key error `P2003` becomes `This customer has related records (inquiries, loans, etc.) and cannot be deleted.` Other errors become the generic save message. A failed deletion remains in the confirmation dialog with that error visible; successful deletion closes it and refreshes the route.

## 6. Shared customer search and quick creation

The feature also supplies reusable customer selection behavior outside `/config/customers`.

- `GET /api/customers/search?q=` requires a valid auth session, but does not call the function-permission resolver. It invokes `searchCustomers`, which returns at most 15 matching customer id/name/primary-mobile/email rows when trimmed query length is at least 2. It searches only name, primary mobile, and email case-insensitively; output is name ascending.
- `CustomerPicker` is used by checklist, inquiry, inventory, loan, insurance, RTO, feedback, and message-template clients. It debounces this API by 300ms, provides selection/clear behavior, and offers an inline **Create new customer** form.
- `quickCreateCustomer` runs the same normalized name/contact validation and duplicate decision as the administration form, then inserts a minimal `Customer`-type record. It requires `Customer_Management_Write`, including when invoked from a customer picker in another module.

## 7. Error handling and limitations

- The modal displays client validation feedback immediately below the affected field and highlights that field. Server validation responses carry the related field key, so a server-side validation failure is shown in the same location rather than as a generic modal error. Normal persistence failures are reduced to generic messages, without server logging in this feature.
- The page's list query/render has no local error boundary or catch.
- The administration UI shows save errors inside the modal and retains failed-delete errors in the confirmation dialog.
- No optimistic locking, audit-event history, record merge, soft deletion, or downstream relationship summary is implemented.

## 8. Verification checklist

- A user with `Customer_Management` sees the route/navigation and can CRUD customer master records; another signed-in user is redirected from the page and actions return Not authorized.
- List order, search, type filtering, and 25-row pagination follow the URL parameters.
- Add/edit require a name and reject an exact same-name/same-primary-mobile record only when a primary mobile is provided.
- Deleting a referenced customer is blocked by a database foreign key, although the current list UI does not expose the returned failure message.
- Picker search needs two characters and returns at most 15 basic customer matches; quick-create records are type `Individual` and can be authorized by a consumer module permission.

## 9. Review record

Two implementation-review passes were completed across the page, client component, administration/query actions, picker/API paths, access resolver/catalog, schema, and consumer references. The second pass confirmed the picker’s broader authorization rule, the `Individual` type mismatch, query-specific field differences, hard-delete error visibility gap, and absence of server validation beyond name/duplicate checking.
