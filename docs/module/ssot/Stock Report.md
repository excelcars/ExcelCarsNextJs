# SSOT - Stock Report Module
## Status: Next.js implemented; current-state behavior documented

**Module:** `reports/stock`  
**Project:** `ExcelCarsNextJs`  
**Primary route:** `/reports/stock`  
**Related API route:** `GET /api/reports/photos`  
**Legacy reference:** `docs/module/existing_ssot/StockReport.md`  
**Source of truth for this document:** `app/(dashboard)/reports/stock/page.tsx`, `src/features/reports/stock/queries.ts`, `src/features/reports/stock/StockReportClient.tsx`, `app/api/reports/photos/route.ts`, `src/components/Layout.tsx`, `src/lib/access/accessCatalog.ts`, `src/lib/access/accessControl.ts`, `app/(dashboard)/layout.tsx`, `middleware.ts`, `src/features/inventory/queries.ts`, `src/components/ui.tsx`, and the relevant models in `prisma/schema.prisma`.

## 1. Purpose and scope

Stock Report is an authenticated, read-only inventory report. It applies URL-backed inventory filters, exports the matching rows as CSV, and previews accessible photos for a selected inventory row.

It owns:

- the current Next.js page at `/reports/stock`
- inventory report loading from Prisma
- client-side search and status filtering
- stock-row presentation
- client-side CSV export
- photo-count display
- lazy photo-metadata loading through `/api/reports/photos`
- a modal that previews accessible images, opens them at full size, downloads them, and lists their filenames

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
- The photo modal previews images when their current or configured legacy storage path is accessible.
- The report has URL-backed server filters and pagination, but no editable form, row navigation, sorting control, or report-specific mutation action.

## 3. Navigation and access

### 3.1 Sidebar entry

The shared dashboard sidebar defines the Reports item:

- label: `Stock Report`
- href: `/reports/stock`
- group: `Reports`

The sidebar filters report children against `accessibleRoutes`. The Stock Report item is therefore shown only when the current user has the route permission resolved from the access profile. The active-state styling marks the link active when the pathname is `/reports/stock` or a descendant path.

There are no Stock Report links from the table rows to inventory editing or another detail page. The only row-level action is the photo-count button.

### 3.2 Page-level authorization

`app/(dashboard)/reports/stock/page.tsx` calls `canCurrentUserAccessRoute('/reports/stock')`. The access catalog maps this route to the function name `Stock_Report`. If access is denied, the page redirects to `/dashboard` before calling `listStockPage`.

The dashboard layout separately requires an authenticated session and computes accessible routes from the current user's database role permissions. Middleware protects non-API routes from unauthenticated access and redirects unauthenticated users to `/login`.

### 3.3 Photo API authorization

`GET /api/reports/photos` calls `auth()` and returns `401` with `{ error: 'Unauthorized' }` when there is no session. It then calls `canCurrentUserAccessRoute('/reports/stock')` and returns `403` with `{ error: 'Forbidden' }` unless the user has the `Stock_Report` function permission. This matches the report page's authorization boundary.

## 4. Implementation surface

| Surface | Implementation | Behavior |
|---|---|---|
| Page | `app/(dashboard)/reports/stock/page.tsx` | Checks access, reads URL-backed report filters, loads matching inventory, serializes Decimal values, renders client component. |
| Query module | `src/features/reports/stock/queries.ts` | Builds the inventory query and loads photo rows. |
| Client component | `src/features/reports/stock/StockReportClient.tsx` | Owns filter form state, table, CSV download, photo modal, and client fetch. |
| Photo API | `app/api/reports/photos/route.ts` | Authenticated lookup of photos by inventory ID. |
| Export API | `app/api/reports/stock/export/route.ts` | Re-runs the URL filters for an authorized user and returns rows for CSV download. |
| Suggestions API | `app/api/reports/stock/suggestions/route.ts` | Returns permission-gated, prefix-matched suggestions for structured report filters. |
| Shared layout | `src/components/Layout.tsx` | Sidebar navigation, active route state, profile menu, sign-out, and dashboard shell. |
| Shared UI | `src/components/ui.tsx` | Page header, button, search input, badge, table, and modal primitives. |

No Stock Report server action, row-query route handler, or report-specific database write exists.

## 5. Server page-load and query behavior

### 5.1 Page flow

`StockReportPage()`:

1. Checks `canCurrentUserAccessRoute('/reports/stock')`.
2. Redirects to `/dashboard` if the check is false.
3. Reads the optional report filters, page, and page-size from the URL, then calls `listStockPage`.
4. Converts truthy Prisma Decimal values for `kmsDriven` and `price` to strings; null/falsy values become `null`.
5. Passes the result page, total count, pagination metadata, and applied filters to `StockReportClient`.

The report filters are URL-backed. A browser refresh preserves the applied filters; a route with no filter parameters loads the complete unfiltered dataset.

### 5.2 `listStock` filters

The query function accepts quick `search`, `status`, and nine structured filters: `make`, `model`, `variant`, `colour`, `fuelType`, `ownerType`, `ownerName`, `ownerMobile`, and `registrationNo`.

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

Each filled structured filter uses trimmed, case-insensitive `contains` matching. Structured filters are combined with one another, status, and quick search using `AND` semantics. Make, model, and variant each match either the legacy text field or its normalized vehicle-master relation, so legacy inventory records remain searchable. Quick search remains an `OR` group across its supported fields.

### 5.3 Inventory query

`listStock` calls `prisma.inventoryManagement.findMany` with:

- the constructed `where` object
- related `carVariantMaster`, including `carMakeMaster` and `carModelMaster`
- `_count.inventoryPhotos`
- `orderBy: { inventoryId: 'desc' }`

There is no `select`, so Prisma returns all scalar fields of `InventoryManagement` in addition to the included vehicle-master relations and photo count. The client report consumes only the fields listed in Section 6.

`listStockPage` first counts matching rows, then loads only the selected page with `skip` and `take`. The allowed page sizes are 25, 50, and 100; invalid page or page-size values are normalized to page 1 and 25 rows. A requested page beyond the final page is normalized to the final page. Export remains unpaged and uses `listStock` so it includes every matching row.

## 6. Data model and displayed fields

### 6.1 Direct database sources

- `inventory_management` through Prisma model `InventoryManagement`: report row source.
- `car_variant_master`: variant relation.
- `car_make_master`: make relation.
- `car_model_master`: model relation.
- `inventory_photos`: photo count, filename, and preview lookup.

The `InventoryManagement` model also contains legacy text fields such as `makeLegacy`, `modelLegacy`, and `variantLegacy`, but Stock Report display/search uses the normalized vehicle-master relations for make, model, and variant. Those legacy fields are not rendered by the client component.

### 6.2 Row fields consumed by the client

Each row uses:

- `inventoryId` as the React key and photo lookup ID
- `sku`
- `registrationNo`
- `colour`
- `year`
- `month`
- `fuelType`
- `kmsDriven`
- `noOfOwners`
- `tax`
- `insuranceType`
- `price`
- `status`
- `otherRemarks`
- `internalComments`
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
4. `Year / Month`
5. `Fuel`
6. `KM Driven`
7. `Owner Count`
8. `Owner Name`
9. `Tax`
10. `Insurance`
11. `Price`
12. `Status`
13. `Remarks`
14. `Internal Comments`
15. `Photos`

The core Vehicle, combined Year / Month, KM Driven, Price, and Status columns are always visible. Owner Count and Owner Name are adjacent when selected. A client-side **Columns** menu lets the user show or hide the remaining detail columns for the current browser session; this preference does not alter the query or export fields. Users who also have `/inventory` permission receive an **Open inventory** action that opens the matching registration in the Inventory module; users without that permission do not see the action.

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

When the user selects **Apply Filters**, the quick search is added to the URL and evaluated on the server as a case-insensitive, trimmed substring match against:

- registration number
- SKU
- normalized make
- normalized model
- owner name (`ownedBy`)

The quick-search term is trimmed before querying. It is an OR group, but it is ANDed with every filled structured filter and with the selected status.

Quick search does not match variant, customer name, year, or price. The dedicated structured filters cover variant, colour, fuel type, and owner mobile.

### 7.2 Structured filters

The report provides optional inputs for Make, Model, Variant, Colour, Fuel Type, Owner Type, Owner Name, Owner Mobile, and Registration No. They are URL-backed and server-filtered when **Apply filters** is selected. Every filled field uses case-insensitive partial matching; all filled structured fields combine with AND semantics. **Reset filters** removes every filter and returns to the unfiltered report.

Each structured input supplies native autocomplete suggestions after two typed characters. Suggestions are requested from `GET /api/reports/stock/suggestions`, debounced by 250 ms, and do not constrain manually typed values. Make, Model, and Variant suggestions combine normalized master records with legacy inventory text; the other fields use distinct inventory values. The endpoint requires the `Stock_Report` route permission. Apply filters and Reset filters are grouped together in the filter grid; Reset filters clears all values and restores 25 rows per page.

### 7.3 Status buttons

The status control is a row of buttons generated from:

- `All`
- `In Stock`
- `Booked`
- `Loan Process`
- `Not Available`
- `Sold`

These values come from `INVENTORY_STATUSES` in `src/features/inventory/queries.ts`. Selecting a status immediately adds it to the URL and filters the server query by exact status unless it is `All`.

The selected status button uses the navy active style; inactive buttons use the shared white/gray outline styling.

### 7.4 Empty state

The page header subtitle shows the number of server-filtered rows returned. The shared `Table` displays `No records found` when no rows match the applied filters.

## 8. Export behavior

The header contains an `Export` button with a download icon. It is always rendered, including when the filtered result is empty.

Export is server-backed and client-downloaded:

1. The client calls `GET /api/reports/stock/export` with the currently applied URL filters.
2. The endpoint requires a session and the `/reports/stock` function permission, then calls `listStock` with the same normalized filter contract as the page.
3. The client converts the returned rows into CSV; each cell is wrapped in double quotes and embedded quotes are doubled.
4. A `Blob` is created with `text/csv;charset=utf-8;`, downloaded as `stock-report.csv`, then revoked.
5. An endpoint or malformed-response failure shows an inline export error and does not download a file.

CSV columns, in order:

- `SKU`
- `Reg No`
- `Make`
- `Model`
- `Variant`
- `Year`
- `Month`
- `Colour`
- `Fuel`
- `KM`
- `No. of Owners`
- `Tax`
- `Insurance Type`
- `Price`
- `Status`
- `Remarks`
- `Internal Comments`
- `Owner`

Export values are returned by a fresh server query for the applied filter URL. Make, model, and variant use the same `clean()` helper as the display. Numeric KM and price values are exported as their string values, not the formatted display strings with Indian grouping or the rupee symbol. There is no total row or export of photo metadata/customer fields.

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

`getPhotos` calls `prisma.inventoryPhotos.findMany({ where: { fkInventoryId: inventoryId } })`. No explicit order is requested. The API maps each database photo to `documentId`, a filename, and a preview URL. The preview URL supports current `/uploads/` paths, Firebase storage paths, and legacy `Fileupload/Inventory_Car_Photo` paths through the existing legacy-photo route.

### 9.4 Modal behavior

The shared `Modal` is titled `Photos — {registrationNo}` and opens while `photoRow` is non-null. It can close through the close button, outside click, or `Escape`. Closing clears `photoRow`; it does not clear the current photo array or reset `photosLoading` directly.

The modal displays this note:

`Previews are shown when the stored image is accessible. Files unavailable in the current environment remain listed for reference.`

Body states:

- loading: `Loading...`
- loaded empty: `No photos on file.`
- loaded with rows: a two-column grid with an image preview and filename for each photo

For each photo, the client renders its preview URL in an image element. If the URL is absent or fails to load, that tile changes to `Preview unavailable` while retaining its filename. There is no inline error message when the photo-list fetch itself fails.

## 10. Business logic and calculations

- A summary strip reflects the current server-filtered result set: matching vehicle count, total price across matching rows, and count by inventory status. Price aggregation is calculated in the database; blank prices do not contribute to the total.
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

There are no save, create, edit, delete, or row-selection controls. The page has grouped Apply filters and Reset filters controls, rows-per-page selection, and Previous/Next pagination controls; there are no links in report table cells or modal content.

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

- Export intentionally loads all matching rows and should be monitored if report sizes become exceptionally large.
- There is no sorting control; rows remain in descending inventory ID order.
- The report has no server-side export and export always uses the current browser-filtered data.
- The export button is available for an empty result and creates a header-only CSV.
- A preview is unavailable when a photo has no supported storage path or its legacy/current storage file cannot be reached from the app environment; its filename remains visible.
- Photo lookup has no explicit ordering.
- Photo-list failures show an inline error and always clear the loading state.
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

The second pass confirmed that Stock Report is distinct from Stock Tracking and that all visible actions are covered above. Pagination and URL-backed filters are implemented; no additional Stock Report page or mutation path is present.

## 16. SSOT rule

The current Next.js Stock Report contract is an authenticated and permission-gated, read-only inventory listing that applies URL-backed filters in the server query, exports a fresh authorized server result as CSV, and retrieves photo metadata on demand. Any change to the page route, access function, inventory query, displayed fields, filter predicates, CSV columns, export or photo API contract, or modal behavior should update this document and its corresponding tests.

