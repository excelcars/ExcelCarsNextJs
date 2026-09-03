# SSOT - Inventory Management

## Status

Next.js implemented; current-state behavior and the remaining implementation backlog are documented from source code. This file is the single Inventory SSOT and supersedes the former `Inventory_Management_improvement.md` gap-analysis document.

## Approved final business rule

For the final Next.js workflow, Make, Model, and Variant are all compulsory. A new or edited inventory record must have a valid linked Variant, and that Variant must belong to the selected Model and Make. Inventory records without a Variant, including the legacy `Inventory/538` record, remain valid historical data until migrated or separately handled.

## Route and scope

**Route:** `/inventory`  
**Primary page:** `app/(dashboard)/inventory/page.tsx`

Inventory Management maintains vehicle inventory records and provides listing/search, add, edit, view, and delete. Vehicle image upload/photo management is currently **On Hold**. The module also provides vehicle-email sending and an Inventory-to-Inquiry synchronization workflow, which is implemented but has known pending corrections and remains **Pending testing**. Delete cleanup is implemented and **Pending testing**. Direct links to downstream modules remain **On Hold**. The module does not directly manage checklist, insurance, RTO, loan, or DSA records.

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

Mutating Inventory server actions call `getAuthorizedUserIdForRoute('/inventory')`, which requires an active authenticated user whose role grants `Inventory_Management`. Inventory detail, photo, inquiry-search, and export API routes repeat the Inventory route authorization check and return HTTP 401 when it fails. Catalog model and variant read APIs require an authenticated session. Customer search accepts Customers, Feedback, or Inventory route access. Inventory users may search and quick-create customers from the Inventory workflow without a separate Customer Management permission; the same quick-create action also accepts `Customer_Management_Write` for Customer Management callers.

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
- View, Update Inquiry, Manage Photos, Send Email, Edit, and Delete actions

The client additionally filters the loaded page in memory. Therefore the visible rows can be a subset of the server-returned page; the total/page count remain based on the server query.

There is no user-controlled sort. Pagination shows current page, page count, total records, rows-per-page options 25/50/100, Prev, and Next. The query clamps page size to 100 but does not explicitly clamp an out-of-range page to the final page.

## Search and filters

### Quick controls

- Search is debounced by 400 ms and is URL-backed.
- Status options are `All`, `In Stock`, `Booked`, `Loan Process`, `Not Available`, `Sold`, and `RTO Process`.
- The common text search covers Make, Model, Variant, Colour, Owner Name, Owner Mobile, and Registration No.
- Fuel Type, Owner Type, and Status are dropdown filters.
- Clear All routes to `/inventory` and resets filters.
- Active filter chips can clear individual filters; clearing Make also clears Model.

### Advanced controls

The filter panel contains one common text search, a Fuel Type dropdown, an Owner Type dropdown, and a Status dropdown.

The common text search checks Make, Model, Variant, Colour, Owner Name, Owner Mobile, and Registration No. The Fuel Type, Owner Type, and Status dropdowns are applied together with the common text search. Empty filters are ignored.

### Server query semantics

`buildInventoryWhere` combines active conditions with `AND`:

- status: exact stored value unless `All`
- fuel, colour, month, tax, insurance type, and owner type: case-insensitive equality
- make/model: case-insensitive equality against either legacy text or the related catalog make/model
- variant: case-insensitive equality against either legacy variant or catalog variant
- search: case-insensitive `contains` over registration, colour, owner name, owner mobile, legacy make/model/variant, and catalog make/model
- year and owner count: numeric equality when the input parses as a finite number
- registered: only `yes`/`no` are recognized, mapped to true/false
- KM and price: inclusive `gte`/`lte` ranges for finite numeric bounds; invalid bounds are ignored

The client repeats equivalent filtering over the loaded rows using normalized text, numeric comparisons, and catalog-preferred vehicle names. This can cause client/server display differences where legacy and catalog values differ or where a filter option is derived only from the current page.

## Add and edit workflow

### Form

Add opens an empty modal with default year equal to the current year, default owner count 1, and status `In Stock`. Edit first loads detail data and hydrates the form. The form contains read-only Inventory No and SKU, required-marked Registration No, Status, catalog Make/Model/Variant selectors, Year, Month, Colour, Fuel Type, No. of Owners, Tax, Car Registered, KM Driven, Insurance Type, Price, Owner Type, Owned By, Owner Mobile, Owner Email, Linked Customer, Internal Comments, and Remarks. Legacy Make/Model/Variant columns are retained only as compatibility data and are not user-editable fields.

Make, Model, and Variant are required searchable inputs using the shared `CatalogTextPicker` input/dropdown component also used by RTO. An exact Make match loads `/api/catalog/models?makeId=...`; an exact Model match loads `/api/catalog/variants?modelId=...`; changing a parent clears the dependent selection. The `+ Add` option is currently hidden in the Inventory form pending confirmation of where catalog creation should be managed. Users can select only existing linked catalog values from this form. A new or edited inventory record must have a linked Variant before it can be saved. The selected catalog variant ID and vehicle text values are submitted. Customer selection uses `CustomerPicker`, which searches `/api/customers/search` after at least two characters with a 300 ms debounce and can create a new customer through `quickCreateCustomer` when allowed.

Colour is a required editable input-plus-dropdown. Its suggestions are distinct, trimmed Colour values already stored in `InventoryManagement`, shown from the current inventory database; the user may select an existing value or type a new value, and the entered value is saved with the inventory record. Fuel Type is selected from Petrol, Diesel, or CNG, with historical values temporarily retained during edit. Tax is a dropdown with `Individual` and `Corporate`. Car Registered is a dropdown with `Select`, `Yes`, and `No`; when `Yes` is selected, Registration No, Fuel Type, No. of Owners, Tax, KM Driven, and Insurance Type are required. When the car is not registered, those six fields are optional and Registration No is read-only. No. of Owners accepts whole numbers and, when required, must be at least 1. KM Driven accepts decimal values, displays Indian-style comma grouping while typing, and cannot be negative.

Insurance Type remains free text and is required when Car Registered is checked. Price is required, numeric, and must be greater than zero. While typing, the Price input displays Indian-style comma grouping (for example, `12,50,000`) while the form stores a numeric value for validation and saving; up to two decimal places are supported. Owner Type is a dropdown with `Excel Cars`, `Dealer`, and `Individual`; historical values outside those options are retained as an edit option. Selecting `Excel Cars` fills Name of Owner with `Excel Cars` and clears dealer contact details. Selecting `Dealer` shows the shared input-plus-dropdown picker; selecting a dealer fills Name of Owner, Owner Mobile, and Owner Email from Dealer Master. Owner Mobile is optional numeric text capped at 11 characters, and Owner Email is optional but format-validated. The server also restricts Owner Type to the three supported values.

Customer is managed only through the Customer picker. `Inventory_Management` authorizes both searching existing customers and quick-creating a new Customer Master record from this workflow; no separate Customer permission is required on the Inventory page. The picker submits the resulting Customer ID with the inventory record. Removing the selected customer clears both its ID and compatibility name. A linked Customer ID is required when Status is `Sold`. There is no separate manual Customer / Source field in the form; the legacy `customerName` value is retained for historical compatibility.

Catalog fetch handlers directly parse the response JSON and do not display a dedicated non-OK/error state if either catalog endpoint fails. `CustomerPicker` does display search errors, ignores stale responses using a request ID, closes on outside interaction, and supports cancelling the create-customer panel.

### Client validation

Before save, the client always requires Make, Model, Variant, Year, Colour, and a positive Price. When Car Registered is `Yes`, it additionally requires Registration No, Fuel Type, No. of Owners, Tax, KM Driven, and Insurance Type. A linked customer is required for Sold inventory. It validates Year through `isValidYear` (1900 through current year + 1), validates owner count when supplied, rejects negative KM, and validates owner mobile/email when supplied. Errors are shown by field and stop the action. The server repeats these conditional, required-field, relation, and numeric checks.

Make, Model, and Variant are passed into the save payload as compatibility text values. The final save rule requires a valid catalog Variant, with its parent Make and Model, before persistence.

### Server save logic

`createInventory` and `updateInventory` require a trimmed Registration No and vehicle identity, then require route authorization. They normalize registration values to uppercase with spaces removed. For normalized values longer than five characters, both actions check for another Inventory record with the same registration; update excludes the current inventory ID. A duplicate blocks saving. Values of five or fewer characters follow the legacy exception and are not duplicate-checked. A PostgreSQL uniqueness migration has been prepared but is not yet an adequate final safeguard because it indexes the raw stored value; normalized database-level uniqueness remains pending. The actions write empty strings as null, preserve nullable numeric values, optionally connect a catalog variant and customer, and write audit dates/user relations.

For a new record, the form previews the next legacy-style inventory number (`Inventory/<number>`) and keeps it read-only. The preview is informational and may change if another user creates inventory first. On save, PostgreSQL atomically allocates the Inventory Number from `inventory_number_seq`. SKU is also read-only: after make, model, and colour are entered, the client requests `getInventorySku` for a preview. PostgreSQL maintains an atomic counter for each normalized Make + Model + Colour combination in `inventory_sku_counters`; the saved SKU uses the first three characters of each displayed value plus the allocated counter, such as `<make>-<model>-<colour>-<number>`. The authoritative Inventory Number and SKU are allocated during the create transaction and saved with the new row. Catalog make/model names are used when legacy text is empty. Update preserves the existing inventory number and SKU unless other code changes them. Update explicitly connects or disconnects the customer and catalog variant. Neither action updates the Customer master from manually entered Customer / Source text nor upserts vehicle masters.

After success, the client closes the form and reloads. New records or edits whose status becomes `Booked` or `Sold` open the Update Inquiry modal before the final refresh; the user may skip synchronization.

The edit modal tracks a serialized form/customer baseline and asks for confirmation before discarding dirty changes. Loading detail uses a request ID guard and a per-ID client cache.

## View, delete, and error behavior

View calls `GET /api/inventory/{inventoryId}` lazily and displays catalog and legacy vehicle fields, ownership, customer, comments, price, status, and email-link tracking. The detail API rejects missing/invalid IDs with 400 and missing rows with 404.

Delete cleanup is **Implemented — testing pending**. The delete action opens a confirmation dialog stating that deletion is permanent and requires Inventory authorization. It checks for protected checklist, insurance, loan, RTO, and DSA dependencies; when a protected dependency exists, deletion is rejected. Otherwise it deletes Inventory photo database rows and the Inventory record in one database transaction, then attempts to remove the owned photo files. Missing files are tolerated and other file-cleanup failures are logged after the database deletion.

## Photo management — On Hold

Vehicle image upload and photo management are excluded from the currently approved implementation scope. The following describes the existing code only and is not an approved workflow until this item is resumed.

The Manage Photos modal loads photos with authenticated `GET /api/inventory/photos?inventoryId=...&inventoryNumber=...`. The API searches by inventory ID and/or legacy inventory number, orders by document ID descending, deduplicates by document ID, and returns file metadata. Legacy paths that do not begin with `/uploads/inventory` are shown as unavailable references rather than rendered images.

The client supports selecting multiple files, local previews, queued/uploading/uploaded/failed states, retry by retaining failed items, and removing queued files. The upload API requires inventory ID, inventory number, and at least one file; accepts only JPEG, PNG, and WEBP; limits each file to 10 MB; creates `public/uploads/inventory/<inventoryId>` as needed; writes a generated timestamp/UUID filename; saves the public path and inventory relation; and returns per-file results. Partial success is possible.

Photo DELETE requires an authenticated request with a document ID. It returns 400 for missing ID, 404 for a missing photo, checks that local paths resolve under the configured upload root before unlinking, tolerates an absent local file, and deletes the database row. The client updates the visible photo list and count after success.

## Email workflow

The Send Email modal is opened per vehicle from the row email action, or for multiple selected visible vehicles from the toolbar `Send Email` action. The same modal supports Customer or Dealer recipient mode and shows the selected vehicle list for bulk sends. A linked customer is suggested for the individual row context. Customer selection uses `CustomerPicker`; dealer data is preloaded by `getDealers`, restricted to dealers with an email, filtered client-side by name, and limited to 20 visible matches. Recipients can be added once per customer/dealer key, removed, and have their email edited.

Updating a recipient email lowercases and validates it (basic email format and maximum 254 characters), then updates either Customer or Dealer Master through `updateInventoryEmailRecipient`. Sending is disabled unless email configuration is present and at least one recipient is selected. Required SMTP environment variables shown to the user are `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM_ADDRESS`.

`sendInventoryEmail` rechecks authorization and vehicle existence, resolves each selected recipient from the database, ignores recipients without an email, deduplicates by lowercase email, creates a token-hashed tracked vehicle email link, renders personalized vehicle details, and calls `sendEmail`. Failed sends delete the newly created tracking link. `sendBulkInventoryEmail` is the server-authoritative bulk wrapper: it reads the environment limits, caps unique vehicles and recipients, rejects batches exceeding the total-message limit, then processes each vehicle and returns sent/failed inventory IDs. It returns a failure if no target has an email or all sends fail; partial sends return sent and failed recipients. Successful sends are shown in the modal.

## Inquiry synchronization — Corrections and testing pending

The Inventory-to-Inquiry workflow is implemented, but **known corrections and testing are pending**. Before the workflow is considered complete, it must apply the approved Inquiry ownership/access rule, create the required `InquiryInventoryLink` in the same transaction, and define safe handling for historical records that already contain a compatibility customer name without a linked customer. The Inventory form now clears both values when a selected customer is removed. Testing must then confirm the search, link creation, inquiry update, multiple-vehicle behavior, and follow-up result against the approved business rule.

In the current code, Update Inquiry opens a modal for any inventory row. The search input is debounced by 250 ms when non-empty. `GET /api/inventory/inquiries` searches inquiry number, legacy customer name, mobile, email, or linked customer using case-insensitive contains. Empty search returns 10 `FollowUp` inquiries; non-empty search returns up to 20 newest inquiries. Results show customer/contact, inquiry number, interested vehicle/year, classification, and status.

The user must select an inquiry. Synchronization is transactional. It:

1. connects the inventory customer when present, otherwise retains an existing inquiry customer or disconnects it;
2. copies inventory customer/source name, owner mobile/email as inquiry contact fallbacks, and appends an inventory-sync note;
3. sets classification to `Hot`;
4. sets `Closed` / `Sold Car` for Sold inventory, otherwise `FollowUp` / `Booked Vehicle`, clearing follow-up date only for Sold;
5. updates the newest inquiry car-detail row, or creates one when none exists, using inventory catalog/legacy vehicle identity and year; and
6. deletes other car-detail rows for that inquiry.

Success revalidates `/inventory` and `/inquiry`. After a status-triggered synchronization, the client refreshes the page when the modal is completed or skipped. The user can also open the workflow manually for any row. The current transaction does not yet create an `InquiryInventoryLink`, and inquiry search/synchronization do not yet apply the Inquiry module's ownership predicate. These behaviors remain pending correction and testing.

## Downstream module links — On Hold

Direct row-level links from Inventory to Checklist, Insurance, RTO, DSA, and Financial are currently **On Hold**. The related modules remain separate and are not opened automatically from Inventory.

## Export

The page offers `Export All (count)` or `Export Filtered (count)` depending on active filters. Export calls authenticated `GET /api/inventory/export` with the current filter set. The API rebuilds the same server filter predicates and returns all matching rows, without pagination, ordered by inventory ID descending. The client generates a CSV locally.

CSV columns now match the old Inventory export and use this order: Make, Model, Variant, Colour, Year, Month, Fuel Type, Kms Driven, No of owners, Registration No, Tax, Price, Insurance Type, Status, Owned Type, SKU, Name of Owner, Mobile No of Owner, Email ID of Owner, Other Remarks, Customer Name, Customer Address, Customer Mobile, and Customer Email. Values are CSV-quoted with embedded quotes doubled. The filename includes `inventory`, selected status/make/model/fuel/year/month or filter markers, row count when unfiltered, and the current ISO date. The column data matches the old export, but the current file format remains CSV rather than an Excel workbook.

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
- Inventory Number uses a PostgreSQL sequence and SKU uses an atomic per-Make/Model/Colour counter table. Both are allocated during create; the read-only client previews can become stale when another user creates a record first. Sequence values may contain gaps when a transaction fails after allocation.
- Photo file writing and database insertion are separate operations; a database failure after file write can leave an orphaned file.
- Photo GET can return a row through either ID or legacy number, while POST requires both values and trusts the submitted inventory number for validation only as a required reference; it stores the database inventory number when available.
- Email recipients without an address are silently excluded until no usable recipients remain.
- Inquiry synchronization deletes additional inquiry car-detail rows by design.
- No inventory-specific audit-history UI, bulk delete, or bulk export selection is implemented. Bulk email selection and sending are implemented through the shared Send Email modal.

## Pending implementation and deferred work

This section is part of the SSOT. Items marked **Pending implementation** are known correctness gaps that should be addressed. Items marked **Deferred / approval required** are not approved requirements and must not be implemented solely for legacy parity.

### Pending implementation

1. **P1 — Inquiry access and ownership:** Apply the approved Inquiry ownership rule to Inventory inquiry search and synchronization, or record an explicit business decision that Inventory permission grants access to every inquiry.
2. **P1 — Normalized registration uniqueness:** Replace the pending raw-column partial unique index with a PostgreSQL partial unique expression index over the normalized registration value. Preserve the exception for null and normalized values of five or fewer characters, perform a normalized duplicate preflight, and then apply the migration.
3. **P2 — Permanent inquiry link:** Create the approved `InquiryInventoryLink` inside the same transaction as inquiry synchronization. Use a database uniqueness constraint or link-type-aware upsert to make repeated synchronization idempotent.
4. **P2 — Historical customer fallback:** The Inventory picker now clears both `customerId` and the compatibility `customerName`, and Sold inventory requires a linked customer. Inquiry synchronization must still define how to handle older records that already have a stale compatibility name without a customer relation.
5. **P2 — Server validation audit:** Continue aligning direct server-action validation with the client contract, including normalization, numeric ranges, relation verification, and field-level errors. Required Year, registered-vehicle dependencies, and Sold-customer selection have been corrected.

### Implemented — verification or documentation pending

1. **Inquiry synchronization:** Runtime testing remains pending after the three inquiry/customer corrections above. Testing must cover search authorization, repeated synchronization, multiple vehicle details, status mapping, history behavior, and permanent link creation.
2. **Delete and photo cleanup:** Runtime testing is pending because the required server environment was unavailable. Confirm protected-dependency rejection, database rollback behavior, file deletion, missing-file tolerance, and cleanup-error logging.
3. **Pagination sanitization:** The page now passes the sanitized `page` and `pageSize` returned by `listInventory` to `InventoryClient`. An out-of-range page is still not clamped to the final page.
4. **Single and bulk email limits:** Both paths use environment-backed vehicle, recipient, and total-message limits. Runtime configuration should be verified in the deployed environment.

### Deferred / approval required

- **Vehicle catalog creation from Inventory:** Make/Model/Variant `+ Add` remains hidden. Creating catalog records from Inventory, colour/fuel master behavior, and atomic catalog-plus-inventory creation require a separate approved workflow.
- **Legacy customer-contact parity:** The approved Next.js workflow is relation-based through `CustomerPicker`. Reintroducing manual inventory-level customer address/mobile/email capture or legacy exact-match upsert behavior requires approval.
- **Legacy owner/dealer side effects:** The current Dealer picker fills ownership details but Inventory save does not upsert Dealer Master as a legacy side effect. Any linked-dealer persistence rule requires approval.
- **Additional list columns:** The current table intentionally shows the operational subset; other legacy fields remain available through view/edit. Adding more columns requires a defined usability need.
- **Legacy email rules:** Dealer eligibility rules, budget-based customer selection, and photo attachments are outside the approved bulk-email scope. Photo attachments remain tied to the photo-management decision.
- **Legacy follow-up editor/history:** Manual follow-up status, classification, date, remarks, and history-row creation are not reproduced by the current fixed synchronization. Any replacement must define how existing inquiry vehicle details and history are preserved.
- **Legacy photo compatibility/new-record upload:** Legacy path migration/display guarantees and attaching photos before the Inventory record exists remain deferred with photo management.
- **XLSX export:** The accepted export is CSV with legacy-equivalent columns. XLSX requires separate approval.
- **Exact legacy filtering:** The approved UI uses common partial search plus dropdown filters. Ten separate exact-match legacy fields are not required; fully server-authoritative filtering can be considered separately.
- **Downstream navigation:** Direct Inventory links to Checklist, Insurance, RTO, DSA, and Financial remain On Hold until those workflows and permission rules are approved.

## SSOT rule

This is the only current Inventory SSOT. Update both the implemented-behavior sections and the backlog whenever the `/inventory` route, displayed fields, filter predicates, save/delete rules, photo API, email workflow, inquiry synchronization, authorization function, or export contract changes. Move an item out of the backlog only after its implementation and required verification are complete.
