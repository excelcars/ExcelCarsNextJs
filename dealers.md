# SSOT - Dealer Management Module (Current Next.js Implementation)

## Status: Implemented current-state behavior

**Module:** `config/dealers`  
**Project:** `ExcelCarsNextJs`  
**Primary sources:** `app/(dashboard)/config/dealers/page.tsx`, `src/features/dealers/DealersClient.tsx`, `src/features/dealers/actions.ts`, `src/features/dealers/queries.ts`, `src/lib/access/accessControl.ts`, `src/lib/access/accessCatalog.ts`, and `prisma/schema.prisma`  
**Database model:** Prisma `DealerMaster` mapped to `dealer_master`

## 1. Purpose and implemented scope

The current module is an authenticated dashboard screen for dealer-master CRUD. It provides a server-filtered dealer list, CSV export of the active result set, modal create/edit forms, duplicate prevention, and confirmed hard delete.

It does not implement a dedicated detail route, XLSX export, bulk actions, or soft delete/status.

## 2. Route, navigation, and authorization

- The page is served at `GET /config/dealers`; the dashboard layout links to it as **Dealers**.
- The access catalog maps this route to function name `Dealer_Management`.
- Page rendering calls `canCurrentUserAccessRoute('/config/dealers')`. A user without an authenticated active `userTable` record, a role, or an assigned `Dealer_Management` access function is redirected to `/dashboard`.
- Every server action independently calls `getAuthorizedUserIdForRoute('/config/dealers')`. Therefore direct invocation without a valid active user and route permission returns `{ success: false, error: 'Not authorized.' }`.
- Middleware redirects unauthenticated non-API page traffic to `/login`; it does not itself enforce the module permission.

## 3. Data model and persistence

`DealerMaster` is mapped to `dealer_master` with the fields below. Business fields are nullable in the schema, although actions enforce Name and primary Mobile for normal writes.

| Field | Current use |
| --- | --- |
| `dealerId` | Autoincrement key; used for table keys and update/delete targets. |
| `dealerName`, `dealerMobileNo` | Required by server action; used for duplicate detection and client search. |
| `dealerMobileNo_2`, `dealerEmail`, `dealerAddress`, `dealerCompanyName`, `dealerWebsite` | Optional input fields; empty strings are persisted as `null`. |
| `createdBy`, `createdDate` | Set on create to authorized user ID and current server time. |
| `updatedBy`, `updatedDate` | Set on create and update to authorized user ID/current server time. |

Both audit-user relationships reference `user_table`. The module reads paged/filterable `dealer_master` results and a complete filtered set for export. No transaction wraps duplicate detection plus write. The Prisma model does not declare the normalized duplicate constraint, but `prisma/add_dealer_normalized_name_mobile_unique.sql` creates it in PostgreSQL.

## 4. User interface and interactions

### List

The server page accepts optional `search` and `page` URL query parameters and loads `listDealersPaged`. The query returns Name-ascending/dealer-ID-ascending pages of 25 records. The header subtitle reports the total matching count (`N dealers`). Previous/Next controls preserve the search query and the server clamps invalid page numbers to the available range.

The table uses five compact columns: Name, Contact, Company, Address, and Actions. Contact stacks primary mobile, optional secondary mobile, and optional email; Company stacks company name and optional website. Address is truncated with its full value available as a hover title. Missing primary values render as an em dash. URL navigation, pagination, filtering, sorting, and successful saves refresh the server-rendered result data without a browser full-page reload.

The list has a responsive, labeled filter panel with URL-backed `search`, `field`, and `sort` controls. **Search in** chooses the field that the **Search value** box will query; selecting a field without typing a value does not narrow the result set. The Search value box has a dynamic placeholder (for example, “Type company name...”), is debounced by 400 ms, and requests a new server render using a trimmed value. The field selector defaults to **All fields** but can restrict the search to Name, Primary mobile, Mobile 2, Email, Company, Address, or Website. The sort selector defaults to **Name: A–Z** and also offers Name: Z–A, Newest added, and Oldest added. Both controls reset the page to one and apply identically to list pagination and export. **Reset Filters** appears whenever a search, field, or sort selection differs from the defaults; it restores the empty search, All fields, Name A–Z, and page one. The database query filters case-insensitively by:

- dealer name;
- primary mobile (literal substring; no lowercasing needed for digits);
- secondary mobile;
- email;
- company name.
- address;
- website.

All listed business text fields are searchable. The global SearchBar has no suggestions; form Name/Mobile autocomplete is described separately below.

The **Export All** button exports every matching dealer when the search box is blank. **Export Filtered** exports every record matching the active server search, including results beyond the current page. The generated CSV is named `dealers-{row-count|filtered}-{YYYY-MM-DD}.csv` and uses the legacy-compatible columns Name, Mobile, Mobile 2, Address, Email, Company Name, and Website. Export is disabled for zero results, displays pending/error feedback, and fetches its full result set from the authorized `GET /api/dealers/export` endpoint.

### Create and edit modal

**Add Dealer** opens a modal with a blank form. The row pencil opens the same modal prefilled from the selected row and preserves the row ID in component state.

The form fields are Name*, Mobile*, Mobile 2, Email (email keyboard hint with custom validation), Company Name, Website, and Address. Its buttons are Cancel and Save Dealer (shown for both create and edit; the modal title distinguishes Add vs Edit). If form values differ from the opening state, Cancel, close-button, Escape, and backdrop-close requests open a **Discard unsaved changes?** confirmation instead of silently losing the edits.

The Name and primary Mobile fields are authorized autocompletes. After two characters, each debounces 300 ms and calls `GET /api/dealers/names?q=...` or `GET /api/dealers/mobiles?q=...`. Each endpoint checks the same `/config/dealers` permission and returns up to ten distinct case-insensitive `contains` matches, sorted by the suggested value. Selecting a suggestion replaces only that field. The client displays loading, no-match, and request-error states; a no-match panel automatically closes after 1.8 seconds so it does not obstruct the remaining form fields. The mobile endpoint correctly searches primary mobile values, unlike the legacy implementation, which accidentally filtered by dealer name. Keyboard selection is not implemented.

Save calls `createDealer` when no edit ID is set, otherwise `updateDealer`. While pending it disables the primary button and shows **Saving...**. Browser-native email validation is deliberately disabled in favor of the module's own validation. Client validation errors are shown only beneath their respective fields with a matching red input border; form-level feedback is reserved for server-side save failures such as duplicate records. A successful save closes the modal, refreshes the server data, and displays a dismissible page-level **Dealer saved successfully** or **Dealer updated successfully** alert.

### Delete

The row trash button opens the shared `ConfirmDialog` with **Delete dealer?** and a permanent-deletion warning. Confirmation keeps the dialog open, disables both choices, and changes the action label to **Deleting...** until the server action succeeds or fails. On success, the page is refreshed so the server-filtered list is current. On failure, a visible page-level red alert is shown above the table. Starting another delete attempt clears the prior delete alert.

## 5. Server actions and business rules

### Read

`listDealersPaged` calls Prisma with a selected-field or all-fields case-insensitive `contains` filter over Name, primary/secondary Mobile, Email, Company, Address, and Website. Its sort options are Name ascending (then ID ascending), Name descending (then ID ascending), newest ID first, and oldest ID first; the page size is fixed at 25. `listDealersForExport` uses the identical filter/sort without a page limit. Their queries have no authorization inside them; authorization is enforced by the page/export route before the call.

### Create

`createDealer(input)`:

1. Rejects blank-after-trim Name or primary Mobile with `Name and mobile are required.`
2. Obtains an authorized user for `/config/dealers`; failures return `Not authorized.`
3. Looks for any dealer whose stored Name equals the normalized Name and whose stored Mobile equals the normalized primary Mobile.
4. On a match, returns `A dealer with this name and mobile already exists.`
5. Creates the record with the normalized business values, both audit timestamps set to `new Date()`, and both audit user relations connected to the authorized user.
6. Revalidates `/config/dealers` and returns success.

### Update

`updateDealer(id, input)` follows the same required-field, authorization, and duplicate rules, but excludes `dealerId = id` from the duplicate query. It updates all business fields plus updated audit relation/time, retains create audit fields, revalidates the path, and returns success.

### Delete

`deleteDealer(id)` first requires authorization, then directly deletes `dealer_master` by ID. It is a hard delete. A Prisma foreign-key violation (`P2003`) returns `This dealer has related records and cannot be deleted.` Other database failures return the generic `Something went wrong saving this record.` It revalidates the route only after a successful deletion. A nonexistent ID and most known error types receive the generic message.

Before validation and persistence, all dealer text fields are trimmed. Empty optional strings are stored as `null`, so whitespace-only optional values are not persisted. Duplicate matching and saved Name/Mobile values use the same normalized values.

## 6. Validation, failures, and edge cases

- Required Name/Mobile validation exists on both the client and server, so it cannot be bypassed by skipping browser validation.
- Primary Mobile must contain 10 to 11 digits. Optional Mobile 2, when supplied, must also contain 10 to 11 digits. The form uses numeric keyboard input and an 11-character limit for mobile fields.
- Optional Email must match a basic email-address format. Optional Website must be a valid HTTP(S) URL; bare domains are accepted for validation (for example, `example.com`) and the submitted text is retained after trimming.
- Client validation prevents a save request and displays the message in the modal; server validation independently enforces the same rules for direct action calls.
- The duplicate check uses normalized (trimmed) Name/Mobile values. The database also enforces a partial unique expression index over `lower(btrim(dealer_name))` and `btrim(dealer_mobile_no)` when both values are non-empty. This closes the concurrent-write race; a Prisma `P2002` constraint error is returned as the same duplicate message as the proactive application check.
- A stale edit/delete ID is handled through caught Prisma errors, not an explicit not-found result.
- Failure in the initial list query is not caught locally and will fail page rendering through Next.js error handling.
- A successful deletion refreshes the result list. Failed deletion feedback remains visible above the table until the next delete attempt.
- Search, field/sort changes, filter resets, and pagination are server-routed transitions; the table shows a non-blocking **Loading dealers...** overlay and disables pagination while data is loading. Export and save/delete controls each show their own pending states.

## 7. Verified integration boundaries

- Inventory code reads `dealerMaster` for dealer-recipient-related workflows, so deletion can be blocked by a database foreign key where such a relation exists.
- `GET /api/dealers/names`, `GET /api/dealers/mobiles`, and `GET /api/dealers/export` enforce the `Dealer_Management` route permission. Mutations remain Next.js server actions.
- Permission grants are stored through the access-control data model and are checked against `Dealer_Management`, preserving the legacy function-name identity.

## 8. Verification checklist

- An unauthenticated visitor is redirected to `/login`; an authenticated user without `Dealer_Management` is redirected to `/dashboard` and cannot mutate through the actions.
- The table defaults to all dealers sorted Name A–Z, 25 per page; filters/sort selections are URL-backed and export uses the same values.
- Create/update reject invalid normalized values and duplicate normalized Name + primary Mobile pairs, including concurrent writes blocked by the database index.
- Create sets both audit pairs; update retains creation audit values and updates modification audit values.
- Edit uses the selected row; successful save refreshes server data and displays a dismissible success message.
- Deletion requires a confirmation click, permanently deletes only when database relations allow it, and displays an inline error when deletion fails.
