# SSOT - Stock Report Module
## Status: Next.js implemented; current-state behavior documented

**Module:** `reports/stock`  
**Project:** `ExcelCarsNextJs`  
**Primary route:** `/reports/stock`  
**Related API route:** `GET /api/reports/photos`  
**Legacy reference:** `docs/module/existing_ssot/StockReport.md`  
**Source of truth for this document:** `app/(dashboard)/reports/stock/page.tsx`, `src/features/reports/stock/queries.ts`, `src/features/reports/stock/StockReportClient.tsx`, `app/api/reports/photos/route.ts`, `src/components/Layout.tsx`, `src/lib/access/accessCatalog.ts`, `src/lib/access/accessControl.ts`, `app/(dashboard)/layout.tsx`, `middleware.ts`, `src/features/inventory/queries.ts`, `src/components/ui.tsx`, and the relevant models in `prisma/schema.prisma`.

## 1. Purpose and scope

Stock Report is an authenticated, read-only inventory report. It loads inventory rows, lets the user filter the loaded rows by free text and status, exports the currently filtered rows as a browser-generated CSV, and displays stored photo filenames for a selected inventory row.

It owns:

- the current Next.js page at `/reports/stock`
- inventory report loading from Prisma
- client-side search and status filtering
- stock-row presentation
- client-side CSV export
- photo-count display
- lazy photo-metadata loading through `/api/reports/photos`
- a modal that lists photo filenames

It does not own:

- inventory creation, editing, status mutation, or deletion
- photo upload or deletion
- vehicle-master maintenance
- customer maintenance
- checklist, insurance, RTO, loan, inquiry, or payment workflows
- server-side report filtering or export generation
- inventory image rendering from the report modal

This is separate from the Stock Tracking report at `/reports/tracking`. Stock Report does not load or display checklist, insurance, RTO, or loan detail records.

## 2. Locked current scope

- The page is served at `/reports/stock` inside the authenticated dashboard route group.
- The page performs a permission check for the `Stock_Report` access function before loading inventory.
- The initial server query is unfiltered: `search: ''`, `status: 'All'`.
- All subsequent search and status filtering happens in the browser over the initial dataset.
- The report is read-only from the report surface.
- The report has one free-text search field and five status buttons plus `All`.
- The report has a client-side `Export` button.
- The report has a photo-count action per row when the row has one or more photo records.
- Photo details are loaded only after the user clicks a photo count.
- The photo modal lists filenames; it does not render image previews.
- There is no pagination, sorting control, URL-backed filter state, editable form, row navigation, or report-specific mutation action.

## 3. Navigation and access

### 3.1 Sidebar entry

The shared dashboard sidebar defines the Reports item:

- label: `Stock Report`
- href: `/reports/stock`
- group: `Reports`

The sidebar filters report children against `accessibleRoutes`. The Stock Report item is therefore shown only when the current user has the route permission resolved from the access profile. The active-state styling marks the link active when the pathname is `/reports/stock` or a descendant path.

There are no Stock Report links from the table rows to inventory editing or another detail page. The only row-level action is the photo-count button.

### 3.2 Page-level authorization

`app/(dashboard)/reports/stock/page.tsx` calls `canCurrentUserAccessRoute('/reports/stock')`. The access catalog maps this route to the function name `Stock_Report`. If access is denied, the page redirects to `/dashboard` before calling `listStock`.

The dashboard layout separately requires an authenticated session and computes accessible routes from the current user's database role permissions. Middleware protects non-API routes from unauthenticated access and redirects unauthenticated users to `/login`.

### 3.3 Photo API authorization

`GET /api/reports/photos` calls `auth()` and returns `401` with `{ error: 'Unauthorized' }` when there is no session. The API checks authentication only; it does not call `canCurrentUserAccessRoute('/reports/stock')` or enforce the `Stock_Report` function permission. An authenticated user who lacks the Stock Report route permission could therefore call the endpoint directly if they know its URL.

## 4. Implementation surface

| Surface | Implementation | Behavior |
|---|---|---|
| Page | `app/(dashboard)/reports/stock/page.tsx` | Checks access, loads initial inventory, serializes Decimal values, renders client component. |
| Query module | `src/features/reports/stock/queries.ts` | Builds the inventory query and loads photo rows. |
| Client component | `src/features/reports/stock/StockReportClient.tsx` | Owns search, status state, table, CSV export, photo modal, and client fetch. |
| Photo API | `app/api/reports/photos/route.ts` | Authenticated lookup of photos by inventory ID. |
| Shared layout | `src/components/Layout.tsx` | Sidebar navigation, active route state, profile menu, sign-out, and dashboard shell. |
| Shared UI | `src/components/ui.tsx` | Page header, button, search input, badge, table, and modal primitives. |

No Stock Report server action, route handler for report rows, report export endpoint, or report-specific database write exists.

## 5. Server page-load and query behavior

### 5.1 Page flow

`StockReportPage()`:

1. Checks `canCurrentUserAccessRoute('/reports/stock')`.
2. Redirects to `/dashboard` if the check is false.
3. Calls `listStock({ search: '', status: 'All' })`.
4. Converts truthy Prisma Decimal values for `kmsDriven` and `price` to strings; null/falsy values become `null`.
5. Passes the resulting array to `StockReportClient` as `initialData`.

The page does not read search parameters, cookies, form submissions, or client filter state. A browser refresh starts with the complete unfiltered dataset again.

### 5.2 `listStock` filters

The query function accepts `search` and `status`.

Status:

- `status === 'All'` adds no status condition.
- Any other status adds `where.status = status`.

Search:

- leading and trailing whitespace is removed with `trim()`.
- an empty trimmed value adds no search condition.
- a non-empty value is matched case-insensitively with Prisma `contains` semantics.
- the search conditions are combined as one `OR` group across:
  - `registrationNo`
  - `sku`
  - `colour`
  - `fuelType`
  - `ownedBy`
  - `mobileNoOwnedBy`
  - related vehicle make through `carVariantMaster.carMakeMaster.make`
  - related vehicle model through `carVariantMaster.carModelMaster.model`

In the current page, the function is called only with an empty search and `All`, so these server-side filter branches are not used by the visible report workflow. The client applies its own narrower filter contract described below.

### 5.3 Inventory query

`listStock` calls `prisma.inventoryManagement.findMany` with:

- the constructed `where` object
- related `carVariantMaster`, including `carMakeMaster` and `carModelMaster`
- `_count.inventoryPhotos`
- `orderBy: { inventoryId: 'desc' }`

There is no `select`, so Prisma returns all scalar fields of `InventoryManagement` in addition to the included vehicle-master relations and photo count. The client report consumes only the fields listed in Section 6.

There is no `take`, `skip`, count query, pagination metadata, or aggregate query. The full matching result set is loaded into the server-rendered client payload.

## 6. Data model and displayed fields

### 6.1 Direct database sources

- `inventory_management` through Prisma model `InventoryManagement`: report row source.
- `car_variant_master`: variant relation.
- `car_make_master`: make relation.
- `car_model_master`: model relation.
- `inventory_photos`: photo count and modal filename lookup.

The `InventoryManagement` model also contains legacy text fields such as `makeLegacy`, `modelLegacy`, and `variantLegacy`, but Stock Report display/search uses the normalized vehicle-master relations for make, model, and variant. Those legacy fields are not rendered by the client component.

### 6.2 Row fields consumed by the client

Each row uses:

- `inventoryId` as the React key and photo lookup ID
- `sku`
- `registrationNo`
- `colour`
- `year`
- `fuelType`
- `kmsDriven`
- `price`
- `status`
- `ownedBy`
- `mobileNoOwnedBy` (typed in the row shape but not displayed or used by the client search)
- `customerName` (typed in the row shape but not displayed or used by the client search)
- `carVariantMaster.variant`
- `carVariantMaster.carMakeMaster.make`
- `carVariantMaster.carModelMaster.model`
- `_count.inventoryPhotos`

### 6.3 Table columns

The displayed columns are, in order:

1. `SKU`
2. `Reg No`
3. `Vehicle`
4. `Year`
5. `Fuel`
6. `KM`
7. `Price`
8. `Status`
9. `Owner`
10. `Photos`

Rendering rules:

- missing SKU, registration number, year, fuel, owner, and photo count render as `—` where the component has an explicit fallback.
- Vehicle’s first line combines cleaned make and model.
- Vehicle’s second line combines cleaned variant and, when present, `· {colour}`.
- `clean()` suppresses empty values and literal case-insensitive values `null`, `na`, and `n/a` for make, model, and variant.
- Colour is not passed through `clean()`; any non-empty colour value is displayed as supplied.
- KM uses `Number(kmsDriven).toLocaleString('en-IN')` when the value is truthy; otherwise it renders `—`.
- Price uses `₹${Number(price).toLocaleString('en-IN')}` when the value is truthy; otherwise it renders `—`.
- Status uses the shared `Badge` component when truthy; otherwise it renders `—`.
- Badge color is determined by the shared label map; unknown labels receive the shared gray fallback style.
- Rows have hover styling only. Clicking a row itself has no action.

## 7. Search and filters

### 7.1 Free-text search

The shared `SearchBar` is rendered with:

- placeholder: `Reg no, make, model, owner...`
- controlled value: `search`
- setter: `setSearch`

The client filter lowercases the entered string and uses substring matching against:

- registration number
- SKU
- normalized make
- normalized model
- owner name (`ownedBy`)

The client search is case-insensitive but does not trim the entered value. Because the search term is used as-is after lowercasing, leading/trailing spaces generally prevent matches unless the data contains those spaces.

The client search does not match variant, colour, fuel type, mobile number, customer name, year, price, or legacy make/model/variant text.

### 7.2 Status buttons

The status control is a row of buttons generated from:

- `All`
- `In Stock`
- `Booked`
- `Loan Process`
- `Not Available`
- `Sold`

These values come from `INVENTORY_STATUSES` in `src/features/inventory/queries.ts`. The selected value is stored in `filterStatus`. A row passes the status filter when the selected value is `All` or the row’s `status` exactly equals the selected value.

Status filtering is client-side and does not update the URL or trigger a new database request. The selected status button uses the navy active style; inactive buttons use the shared white/gray outline styling.

### 7.3 Empty state

The page header subtitle shows the number of currently filtered rows as `{filtered.length} vehicles`. The shared `Table` receives `empty={filtered.length === 0}` and displays `No records found` when the search/status combination yields no rows.

## 8. Export behavior

The header contains an `Export` button with a download icon. It is always rendered, including when the filtered result is empty.

Export is entirely client-side:

1. The button passes the current `filtered` array to `downloadCsv`.
2. `toCsv` creates a header row and one CSV row per filtered inventory row.
3. Each cell is wrapped in double quotes and embedded quotes are doubled.
4. A `Blob` is created with `text/csv;charset=utf-8;`.
5. An object URL and temporary anchor are created, clicked, and revoked.
6. The browser download filename is `stock-report.csv`.

CSV columns, in order:

- `SKU`
- `Reg No`
- `Make`
- `Model`
- `Variant`
- `Year`
- `Colour`
- `Fuel`
- `KM`
- `Price`
- `Status`
- `Owner`

Export values are taken from the current client rows. Make, model, and variant use the same `clean()` helper as the display. Numeric KM and price values are exported as their string values, not the formatted display strings with Indian grouping or the rupee symbol. There is no server-side export endpoint, permission check at export time, export error state, total row, or export of photo metadata/customer fields.

Exporting zero filtered rows produces a CSV containing the header row only.

## 9. Photo count and photo modal

### 9.1 Photo count

The query includes `_count.inventoryPhotos`. If the count is greater than zero, the Photos cell renders a button with an image icon and the count. If the count is zero, the cell renders `—` and has no action.

The button is the only row-level action. It does not navigate to another page and it does not render an image directly.

### 9.2 Photo loading flow

`openPhotos(row)`:

1. Sets `photoRow` to the selected row, opening the modal.
2. Clears the previous `photos` array.
3. Sets `photosLoading` to `true`.
4. Requests `/api/reports/photos?inventoryId={inventoryId}`.
5. Parses the response as JSON and stores it in `photos`.
6. Sets `photosLoading` to `false`.

The request is lazy and is made only after clicking a non-zero photo count. There is no abort handling or protection against an earlier request resolving after a later selection.

### 9.3 Photo API contract

`GET /api/reports/photos`:

- authenticates with `auth()`.
- returns HTTP `401` and `{ error: 'Unauthorized' }` without a session.
- converts the `inventoryId` query parameter with `Number(...)`.
- returns `[]` when the converted value is falsy, including a missing parameter, zero, or `NaN`.
- calls `getPhotos(inventoryId)` otherwise.
- returns the Prisma photo rows as JSON.

`getPhotos` calls `prisma.inventoryPhotos.findMany({ where: { fkInventoryId: inventoryId } })`. No explicit order is requested. The returned model fields include `documentId`, `inventoryNumberLegacy`, `path`, and `fkInventoryId`; the client uses `documentId` and `path`.

### 9.4 Modal behavior

The shared `Modal` is titled `Photos — {registrationNo}` and opens while `photoRow` is non-null. It can close through the close button, outside click, or `Escape`. Closing clears `photoRow`; it does not clear the current photo array or reset `photosLoading` directly.

The modal always displays this note:

`Image files from the legacy system were not migrated to this app's storage — filenames are shown for reference.`

Body states:

- loading: `Loading...`
- loaded empty: `No photos on file.`
- loaded with rows: a list of filenames

For each photo, the client displays the final slash-delimited path segment using `p.path?.split('/').pop()`, falling back to the full path when no final segment is available. It does not create an `<img>` element or use the public legacy-photo route. There is no inline error message when the fetch fails.

## 10. Business logic and calculations

- Result ordering is descending `inventoryId` from the initial Prisma query.
- The report performs no totals, aggregates, balance calculations, derived status calculations, or row grouping.
- The header count is the count of rows remaining after client search and status filtering.
- Price is formatted as Indian-locale numeric text with a rupee prefix for truthy values.
- KM is formatted as Indian-locale numeric text for truthy values.
- Because the formatting helper checks truthiness, numeric/string zero values render as `—` rather than `₹0` or `0`.
- Decimal values are converted to strings on the server before crossing into the client component.
- CSV quoting escapes embedded double quotes but does not add a UTF-8 BOM or a trailing newline.

## 11. Forms, buttons, links, and actions

There is no submitted form in Stock Report.

Visible controls:

- Search input: updates local free-text state on every change.
- `All`: clears the status restriction.
- `In Stock`, `Booked`, `Loan Process`, `Not Available`, `Sold`: apply the selected exact status locally.
- `Export`: downloads the currently filtered rows as `stock-report.csv`.
- Photo count button: opens the photo modal and loads photo metadata.
- Modal close button: closes the photo modal.

There are no reset, save, create, edit, delete, sort, pagination, row-selection, or inventory-detail buttons. There are no links in report table cells or modal content.

## 12. Validation and error handling

Validation:

- The search input has no length, pattern, or required validation.
- Status values are limited by the generated button list.
- The photo API performs only numeric coercion and a falsy check; it does not validate that the inventory ID is an integer, positive, or an existing inventory record.
- There is no report form submission validation.

Error handling:

- `listStock` and `getPhotos` do not use local `try/catch` blocks.
- The page does not catch database-load errors.
- The photo API does not catch database errors; an unhandled query failure follows the route/runtime error behavior.
- `openPhotos` does not check `res.ok`, does not validate the JSON shape, and has no `try/catch/finally`.
- A failed photo request or JSON parse can reject the handler and leave `photosLoading` set to `true` while the modal remains open.
- A non-OK JSON response such as the API's unauthorized payload is assigned to `photos` despite not being an array; the render then relies on the resulting runtime shape.
- There is no visible photo-fetch error state.
- The table itself has a normal empty state for zero filtered rows.

## 13. Permissions and database interactions

### 13.1 Access data path

The page permission check resolves the current session user ID, loads the active user and role from `userTable`, loads the role’s `accessFunctionRole` rows, and checks for the `Stock_Report` function name. The same access profile drives sidebar route visibility.

Authentication is enforced at three relevant layers:

- middleware redirects unauthenticated non-API requests to `/login`;
- the dashboard layout redirects when `auth()` has no session;
- the Stock Report page performs its route-function permission check and redirects unauthorized users to `/dashboard`.

The photo API enforces session authentication but currently omits the report-function permission check.

### 13.2 Read-only data path

Stock Report reads from `inventory_management`, vehicle-master relations, and `inventory_photos`. It performs no insert, update, delete, transaction, or database-side export operation.

## 14. Current constraints and known gaps

- The full inventory result set is loaded server-side before browser filtering; there is no pagination or result limit.
- Search/status changes do not re-query the database and are not represented in the URL.
- The client search is narrower than the server query helper: it omits colour, fuel type, mobile, and several fields supported by `listStock`.
- The client search does not include variant or colour even though both are displayed.
- There is no sorting control; rows remain in descending inventory ID order.
- The report has no server-side export and export always uses the current browser-filtered data.
- The export button is available for an empty result and creates a header-only CSV.
- Photo records are shown as filenames only because legacy image files were not migrated into this app's storage.
- Photo lookup has no explicit ordering.
- Photo API route authorization is session-only, not function-permission-aware.
- Photo loading has no error UI and can leave a stale loading state after a failure.
- The UI’s truthiness checks display zero KM/price as `—`.
- `mobileNoOwnedBy` and `customerName` are present in the client row type but unused in the report UI.
- Prisma returns more inventory scalar data than the report renders, but there is no explicit `select` projection in the query.
- No report-specific tests were found alongside the Stock Report implementation.

## 15. Second-review verification record

The implementation was reviewed a second time after the initial source trace by rechecking:

- every file that references `/reports/stock`, `Stock_Report`, `listStock`, `getPhotos`, or `/api/reports/photos`;
- the route access catalog and current-user access resolution;
- the exact status constant list;
- the page serialization of Prisma Decimal values;
- the client’s rendered columns, controls, search predicates, export headers, modal states, and fetch path;
- the `InventoryManagement` and `InventoryPhotos` Prisma model fields;
- the dashboard middleware/layout interaction.

The second pass confirmed that Stock Report is distinct from Stock Tracking, that all visible actions are covered above, and that no additional Stock Report page, API, form, sort, pagination, or mutation path is present in the current Next.js codebase.

## 16. SSOT rule

The current Next.js Stock Report contract is an authenticated and permission-gated, read-only inventory listing that loads data once on the server, filters it in the browser by free text and status, exports the filtered rows locally as CSV, and retrieves photo metadata on demand. Any change to the page route, access function, inventory query, displayed fields, client filter predicates, CSV columns, photo API contract, or modal behavior should update this document and its corresponding tests.

