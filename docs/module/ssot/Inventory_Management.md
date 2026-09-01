# SSOT - Inventory Management

## Status

Next.js implemented; current-state behavior documented from source code.

## Approved final business rule

For the final Next.js workflow, Make, Model, and Variant are all compulsory. A new or edited inventory record must have a valid linked Variant, and that Variant must belong to the selected Model and Make. Inventory records without a Variant, including the legacy `Inventory/538` record, remain valid historical data until migrated or separately handled.

## Route and scope

**Route:** `/inventory`  
**Primary page:** `app/(dashboard)/inventory/page.tsx`

Inventory Management maintains vehicle inventory records and provides listing/search, add, edit, view, and delete. Vehicle image upload/photo management is currently **On Hold**. The module also provides vehicle-email sending and read-only matching-inquiry lookup from each inventory row. It does not directly manage checklist, insurance, RTO, loan, or DSA records; those are related records and can block inventory deletion.

## Source of truth

- `app/(dashboard)/inventory/page.tsx`
- `src/features/inventory/InventoryClient.tsx`
- `src/features/inventory/actions.ts`
- `src/features/inventory/queries.ts`
- `app/api/inventory/[inventoryId]/route.ts`
- `app/api/inventory/photos/route.ts`
- `app/api/inventory/inquiries/route.ts`
- `app/api/inventory/export/route.ts`
- `app/api/catalog/models/route.ts`
- `app/api/catalog/variants/route.ts`
- `app/api/customers/search/route.ts`
- `src/components/CustomerPicker.tsx`
- `src/features/customers/actions.ts`
- `src/lib/email/sendMail.ts`
- `src/lib/email/templates.ts`
- `src/lib/vehicleEmailLinks.ts`
- `src/features/vehicleEmailLinks/service.ts`
- `src/lib/access/accessCatalog.ts`, `src/lib/access/accessControl.ts`
- `src/lib/validation.ts`
- `prisma/schema.prisma`

## Authorization and navigation

The page calls `canCurrentUserAccessRoute('/inventory')`; unauthorized users are redirected to `/dashboard`. The access catalog maps `/inventory` to the `Inventory_Management` function. The page is inside the authenticated dashboard route group.

Mutating server actions call `getAuthorizedUserIdForRoute('/inventory')`, which requires an active authenticated user whose role grants the route's allowed function. Inventory detail, catalog, photo, and inquiry API routes call `auth()` and return `{ error: 'Unauthorized' }` with HTTP 401 when no session exists. The API routes do not repeat the route-function authorization check; their boundary is session authentication.

The page has no separate local navigation links. Row actions open modals. Customer and dealer configuration pages are only revalidated after an email address is changed; no navigation is performed by Inventory Management itself.

## Data ownership and relations

`InventoryManagement` is the primary record. Important fields are:

- identity: `inventoryId`, `inventoryNumber`, `sku`, `registrationNo`
- vehicle: `fkVariantId`, `makeLegacy`, `modelLegacy`, `variantLegacy`, `year`, `month`, `colour`, `fuelType`
- condition/financial: `noOfOwners`, `tax`, `isCarRegistered`, `kmsDriven`, `insuranceType`, `price`, `status`
- ownership: `ownedType`, `ownedBy`, `mobileNoOwnedBy`, `emailIdOwnedBy`
- customer/comments: `customerId`, `customerName`, `internalComments`, `otherRemarks`
- audit: created/updated dates and user relations

The list includes the optional `Customer` relation (`custId`, name, mobile, email), optional `CarVariantMaster` with make/model relations, and an inventory-photo count. Detail loading also includes up to 10 newest `VehicleEmailLink` rows, up to 50 newest interactions per link, and a computed interaction summary.

Inventory photos use `InventoryPhotos`, with `documentId`, `fkInventoryId`, `inventoryNumberLegacy`, and `path`. The schema has a unique inventory number. Downstream checklist, insurance, loan, RTO, and DSA relations use the inventory ID and may impose referential-integrity restrictions on deletion.

## Listing page

`InventoryPage` reads URL search parameters, defaults status to `All`, page to 1, and page size to 25, then loads inventory rows, makes, and dealers in parallel. The query orders by `inventoryId desc`. Rows are serialized so Prisma Decimal values for kilometres and price become strings before reaching the client.

The table displays:

- Inventory No, SKU, Registration No
- vehicle make/model and variant/colour, preferring catalog relation values over legacy text
- Year, Fuel, KM, formatted rupee Price, Status badge
- Customer name, Owner name
- View, Search Inquiry, Manage Photos, Send Email, Edit, and Delete actions

The client additionally filters the loaded page in memory. Therefore the visible rows can be a subset of the server-returned page; the total/page count remain based on the server query.

There is no user-controlled sort. Pagination shows current page, page count, total records, rows-per-page options 25/50/100, Prev, and Next. The query clamps page size to 100 but does not explicitly clamp an out-of-range page to the final page.

## Search and filters

### Quick controls

- Search is debounced by 400 ms and is URL-backed.
- Status options are `All`, `In Stock`, `Booked`, `Loan Process`, `Not Available`, and `Sold`.
- Make, Model, and Fuel are select controls.
- Make change clears Model.
- More Filters expands the remaining controls.
- Clear All routes to `/inventory` and resets filters.
- Active filter chips can clear individual filters; clearing Make also clears Model.

### Advanced controls

Inventory No, SKU, Registration No, Variant, Colour, Year, Month, No. of Owners, Tax, Car Registered, KM Min, KM Max, Insurance Type, Price Min, Price Max, Owner Type, Owned By, Owner Mobile, Owner Email, Customer / Source, Linked Customer, Internal Comments, and Remarks.

Filter option lists are derived from the currently loaded client data. Owned By, Customer / Source, and Linked Customer also expose datalist suggestions. They are not independent all-database lookup lists.

### Server query semantics

`buildInventoryWhere` combines active conditions with `AND`:

- status: exact stored value unless `All`
- fuel, colour, month, tax, insurance type, and owner type: case-insensitive equality
- make/model: case-insensitive equality against either legacy text or the related catalog make/model
- variant: case-insensitive equality against either legacy variant or catalog variant
- search: case-insensitive `contains` over inventory number, registration, SKU, customer/source name, owner name, legacy make/model/variant, and catalog make/model
- inventory number, SKU, registration, owner name/mobile/email, customer/source name, linked customer name, internal comments, and remarks: case-insensitive `contains`
- year and owner count: numeric equality when the input parses as a finite number
- registered: only `yes`/`no` are recognized, mapped to true/false
- KM and price: inclusive `gte`/`lte` ranges for finite numeric bounds; invalid bounds are ignored

The client repeats equivalent filtering over the loaded rows using normalized text, numeric comparisons, and catalog-preferred vehicle names. This can cause client/server display differences where legacy and catalog values differ or where a filter option is derived only from the current page.

## Add and edit workflow

### Form

Add opens an empty modal with default year equal to the current year, default owner count 1, and status `In Stock`. Edit first loads detail data and hydrates the form. The form contains read-only Inventory No and SKU, required-marked Registration No, Status, catalog Make/Model/Variant selectors, Year, Month, Colour, Fuel Type, No. of Owners, Tax, Car Registered, KM Driven, Insurance Type, Price, Owner Type, Owned By, Owner Mobile, Owner Email, Linked Customer, Internal Comments, and Remarks. Legacy Make/Model/Variant columns are retained only as compatibility data and are not user-editable fields.

Make, Model, and Variant are required searchable inputs using the shared `CatalogTextPicker` input/dropdown component also used by RTO. An exact Make match loads `/api/catalog/models?makeId=...`; an exact Model match loads `/api/catalog/variants?modelId=...`; changing a parent clears the dependent selection. Each picker offers `+ Add “…”` for a typed value. Adding a Make creates it immediately; adding a Model requires and links the selected Make; adding a Variant requires and links the selected Make and Model. A new or edited inventory record must have a linked Variant before it can be saved. The newly created value is selected in the picker before the inventory save. The selected catalog variant ID and vehicle text values are submitted. Customer selection uses `CustomerPicker`, which searches `/api/customers/search` after at least two characters with a 300 ms debounce and can create a new customer through `quickCreateCustomer` when allowed.

Colour is a required free-text input. Fuel Type is required and is selected from the dropdown options Petrol, Diesel, or CNG. If an existing historical value falls outside those options, it is temporarily retained as an edit option so the record remains editable. No. of Owners is required and accepts a whole number only; the minimum is 1. Tax is a dropdown with `Individual` and `Corporate`. Car Registered is a dropdown with `Select`, `Yes`, and `No`; when `Yes` is selected, Tax and KM Driven are required. KM Driven accepts decimal values, displays Indian-style comma grouping while typing, and cannot be negative.

Insurance Type remains free text and is required when Car Registered is checked. Price is required, numeric, and must be greater than zero. While typing, the Price input displays Indian-style comma grouping (for example, `12,50,000`) while the form stores a numeric value for validation and saving; up to two decimal places are supported. Owner Type is a dropdown with `Excel Cars`, `Dealer`, and `Individual`; historical values outside those options are retained as an edit option. Selecting `Excel Cars` fills Name of Owner with `Excel Cars` and clears dealer contact details. Selecting `Dealer` shows the shared input-plus-dropdown picker; selecting a dealer fills Name of Owner, Owner Mobile, and Owner Email from Dealer Master. Owner Mobile is optional numeric text capped at 11 characters, and Owner Email is optional but format-validated. The server also restricts Owner Type to the three supported values.

Customer is managed only through the Customer picker. The picker can search existing customers or create a new Customer Master record, then submits the resulting Customer ID with the inventory record. There is no separate manual Customer / Source field in the form; the legacy `customerName` value is retained for historical compatibility.

Catalog fetch handlers directly parse the response JSON and do not display a dedicated non-OK/error state if either catalog endpoint fails. `CustomerPicker` does display search errors, ignores stale responses using a request ID, closes on outside interaction, and supports cancelling the create-customer panel.

### Client validation

Before save, the client requires Registration No, Make, Model, Variant, Year, Colour, Fuel Type, and No. of Owners. It validates Year through `isValidYear` (1900 through current year + 1), requires No. of Owners to be a whole number of at least 1, rejects negative KM, requires positive Price when supplied, and validates owner mobile/email when supplied. Errors are shown by field and stop the action. The server repeats these required-field and numeric checks.

Make, Model, and Variant are passed into the save payload as compatibility text values. The final save rule requires a valid catalog Variant, with its parent Make and Model, before persistence.

### Server save logic

`createInventory` and `updateInventory` require a trimmed Registration No and vehicle identity, then require route authorization. They write empty strings as null, preserve nullable numeric values, optionally connect a catalog variant and customer, and write audit dates/user relations.

For a new record, the form previews the next legacy-style inventory number (`Inventory/<number>`) and keeps it read-only. On save, `createInventory` obtains the next number from the latest stored inventory number and saves it in the create operation. SKU is also read-only: after make, model, and colour are entered, the client requests `getInventorySku`. The server looks for the latest matching legacy make/model/colour SKU and increments its final numeric segment; when none exists it builds `<first 3 make>-<first 3 model>-<first 3 colour>-1` (using the full value when shorter than three characters). Catalog make/model names are used for SKU generation when legacy text is empty. Update preserves the existing inventory number and SKU unless other code changes them. Update explicitly connects or disconnects the customer and catalog variant. Neither action updates the Customer master from manually entered Customer / Source text nor upserts vehicle masters.

After success, the client closes the form and reloads. New records or edits whose status becomes `Booked` or `Sold` open the read-only matching-inquiry modal before the final refresh; the user may close it without changing any inquiry.

The edit modal tracks a serialized form/customer baseline and asks for confirmation before discarding dirty changes. Loading detail uses a request ID guard and a per-ID client cache.

## View, delete, and error behavior

View calls `GET /api/inventory/{inventoryId}` lazily and displays catalog and legacy vehicle fields, ownership, customer, comments, price, status, and email-link tracking. The detail API rejects missing/invalid IDs with 400 and missing rows with 404.

Delete opens a confirmation dialog stating the deletion is permanent. `deleteInventory` requires authorization and deletes the inventory row. A Prisma P2003 error is translated to a message saying related checklist, insurance, loan, RTO, or DSA entries prevent deletion. Other failures return a generic save/error message. Successful deletion revalidates `/inventory` and removes the row from the current client data.

## Photo management — On Hold

Vehicle image upload and photo management are excluded from the currently approved implementation scope. The following describes the existing code only and is not an approved workflow until this item is resumed.

The Manage Photos modal loads photos with authenticated `GET /api/inventory/photos?inventoryId=...&inventoryNumber=...`. The API searches by inventory ID and/or legacy inventory number, orders by document ID descending, deduplicates by document ID, and returns file metadata. Legacy paths that do not begin with `/uploads/inventory` are shown as unavailable references rather than rendered images.

The client supports selecting multiple files, local previews, queued/uploading/uploaded/failed states, retry by retaining failed items, and removing queued files. The upload API requires inventory ID, inventory number, and at least one file; accepts only JPEG, PNG, and WEBP; limits each file to 10 MB; creates `public/uploads/inventory/<inventoryId>` as needed; writes a generated timestamp/UUID filename; saves the public path and inventory relation; and returns per-file results. Partial success is possible.

Photo DELETE requires an authenticated request with a document ID. It returns 400 for missing ID, 404 for a missing photo, checks that local paths resolve under the configured upload root before unlinking, tolerates an absent local file, and deletes the database row. The client updates the visible photo list and count after success.

## Email workflow

The Send Email modal is opened per vehicle from the row email action, or for multiple selected visible vehicles from the toolbar `Send Email` action. The same modal supports Customer or Dealer recipient mode and shows the selected vehicle list for bulk sends. A linked customer is suggested for the individual row context. Customer selection uses `CustomerPicker`; dealer data is preloaded by `getDealers`, restricted to dealers with an email, filtered client-side by name, and limited to 20 visible matches. Recipients can be added once per customer/dealer key, removed, and have their email edited.

Updating a recipient email lowercases and validates it (basic email format and maximum 254 characters), then updates either Customer or Dealer Master through `updateInventoryEmailRecipient`. Sending is disabled unless email configuration is present and at least one recipient is selected. Required SMTP environment variables shown to the user are `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM_ADDRESS`.

`sendInventoryEmail` rechecks authorization and vehicle existence, resolves each selected recipient from the database, ignores recipients without an email, deduplicates by lowercase email, creates a token-hashed tracked vehicle email link, renders personalized vehicle details, and calls `sendEmail`. Failed sends delete the newly created tracking link. `sendBulkInventoryEmail` is the server-authoritative bulk wrapper: it reads the environment limits, caps unique vehicles and recipients, rejects batches exceeding the total-message limit, then processes each vehicle and returns sent/failed inventory IDs. It returns a failure if no target has an email or all sends fail; partial sends return sent and failed recipients. Successful sends are shown in the modal.

## Matching inquiries (read-only)

The magnifying-glass `Search Inquiry` action is available on every inventory row. It opens a `Matching Inquiries` modal using that row's linked Variant ID. The API requires a valid Variant ID and only returns inquiries whose inquiry-car details contain that exact Variant. Inquiry status is not used as a restriction, matching the old Inventory inquiry search, so matching FollowUp, Closed, or other-status inquiries can be viewed without loading unrelated vehicles.

The modal displays the inventory vehicle, inquiry number, customer/contact details, the matching interested vehicle/year, classification, and status. For inquiries containing multiple vehicle rows, the UI displays the vehicle detail whose Variant ID matches the inventory row. The optional search field further filters the already variant-matched results by inquiry number, customer name, mobile, or email. The lookup is debounced by 250 ms when text is entered and returns all matching results, consistent with the old workflow.

The modal is read-only. It has no selection, status editing, classification editing, follow-up editing, or save/update operation. Each result has an `Open Inquiry` button, which redirects to `/inquiry?edit={inquiryId}` so permitted edits occur on the Inquiry page. Closing the modal makes no database change. When the modal was opened automatically after saving a Booked/Sold inventory record, closing it refreshes the inventory list so the saved row is visible.

The existing server-side `syncInventoryToInquiry` action remains available in the code for compatibility, but this Inventory row action does not call it.

## Export

The page offers `Export All (count)` or `Export Filtered (count)` depending on active filters. Export calls authenticated `GET /api/inventory/export` with the current filter set. The API rebuilds the same server filter predicates and returns all matching rows, without pagination, ordered by inventory ID descending. The client generates a CSV locally.

CSV columns are Inventory No, Make, Model, Variant, Colour, SKU, Year, Month, Fuel Type, No Of Owners, Tax, Car Registered, Registration No, KM Driven, Insurance Type, Price, Remarks, Status, Owned Type, Owned By, Owner Mobile, Owner Email, Customer ID, Customer Name, and Internal Comments. Values are CSV-quoted with embedded quotes doubled. The filename includes `inventory`, selected status/make/model/fuel/year/month or filter markers, row count when unfiltered, and the current ISO date. This is a CSV export, not an Excel workbook.

## Calculations and normalization

- Money is displayed with an Indian-locale rupee prefix and `toLocaleString('en-IN')`; null/empty values display `—`.
- KM is displayed with Indian-locale grouping.
- Vehicle display prefers catalog values, then legacy values.
- `clean()` trims text and treats literal `null`, `na`, and `n/a` as empty for display/normalization.
- Page count is `max(1, ceil(total/pageSize))`.
- Photo counts are adjusted optimistically in the client after upload/delete.
- Email interaction summaries count call, WhatsApp, and email interactions and expose first/last interaction timestamps through the detail query/service.

## Current implementation boundaries and edge cases

- There is no explicit sort control.
- Server pagination is implemented, but client filtering is applied again only to the loaded page.
- Invalid numeric filter text is ignored server-side rather than reported as an error.
- Catalog model/variant request failures are not explicitly checked by the client before JSON parsing; customer search failures are surfaced in the picker.
- `describeError` uses a generic “Something went wrong saving this record.” fallback for failures from save, email-recipient update, email sending, and inquiry synchronization unless a known Prisma error is mapped.
- Client validation is stronger than server validation; direct server-action calls can bypass several client-only checks.
- The status constant used by the page does not include `RTO Process`, although the legacy value may still exist in stored data and can be handled as an unlisted value.
- Create inventory and assign its generated number/SKU are separate database operations; an error between them can leave a newly inserted row before finalization.
- Photo file writing and database insertion are separate operations; a database failure after file write can leave an orphaned file.
- Photo GET can return a row through either ID or legacy number, while POST requires both values and trusts the submitted inventory number for validation only as a required reference; it stores the database inventory number when available.
- Email recipients without an address are silently excluded until no usable recipients remain.
- Inquiry synchronization deletes additional inquiry car-detail rows by design.
- No inventory-specific audit-history UI, bulk delete, or bulk export selection is implemented. Bulk email selection and sending are implemented through the shared Send Email modal.

## SSOT rule

Update this file whenever the `/inventory` route, displayed fields, filter predicates, save/delete rules, photo API, email workflow, inquiry synchronization, authorization function, or export contract changes.
