# Inventory Management — Existing vs Next.js Gap Analysis

## Scope and review method

This document is the improvement list only. It does not replace or modify either SSOT:

- Existing system: `docs/module/existing_ssot/Inventory_Management.md`
- Current implementation: `docs/module/ssot/Inventory_Management.md`

The comparison was completed in two passes. Pass one cross-referenced the two SSOTs by route, screen, control, workflow, persistence behavior, and edge case. Pass two re-read the relevant Next.js page/client, server actions, queries, API routes, Prisma schema, and the legacy controller/view/model paths to verify each reported difference. Items below are limited to behavior evidenced by those sources.

Priority meanings: **P0** blocks core correctness or creates a material security/data-loss risk; **P1** is important functional parity; **P2** is useful parity or quality improvement.

## 1. Authorization parity for API routes

1. **Feature / Business Logic Name:** Inventory permission enforcement on APIs
2. **Existing System Behavior:** The legacy module is entered through the admin session and `AuthorizeFilter(DatabaseFunctionname = "Inventory_Management")`; controller operations are protected by the legacy access model, although some legacy JSON endpoints have inconsistent protection.
3. **Current Next.js Status:** The `/inventory` page and server actions use `canCurrentUserAccessRoute('/inventory')` / `getAuthorizedUserIdForRoute('/inventory')`. Inventory detail, photo, inquiry, export, and catalog API routes currently check only whether a session exists.
4. **Missing Functionality or Logic:** A signed-in user without the Inventory function permission may be able to call those APIs directly.
5. **Required Improvement:** Apply the same route/function authorization check to every Inventory API route, including catalog lookups used by the form, or explicitly document and enforce a deliberate read-only policy.
6. **Relevant Existing Code Location:** Legacy `ExcelCars/ExcelCars/Controllers/AdminController.cs`; Next `src/lib/access/accessControl.ts`, `app/(dashboard)/inventory/page.tsx`, `app/api/inventory/**/route.ts`.
7. **Priority / Impact:** P0 — authorization/data exposure.

## 2. Legacy inventory status coverage

1. **Feature / Business Logic Name:** `RTO Process` inventory status
2. **Existing System Behavior:** The legacy status list includes `In Stock`, `Booked`, `Sold`, and `RTO Process`; the value is stored, displayed, searchable, and exportable.
3. **Current Next.js Status:** The current status options contain `In Stock`, `Booked`, and `Sold`; `RTO Process` is not an available form/filter option.
4. **Missing Functionality or Logic:** Existing RTO Process records cannot be selected through the normal status control and may be difficult to manage consistently.
5. **Required Improvement:** Add `RTO Process` to the shared status options, filter options, validation, display mapping, and any status-transition logic.
6. **Relevant Existing Code Location:** Legacy `ExcelCars/ExcelCars/Views/Admin/Inventory_Management_View.cshtml`; Next `src/features/inventory/InventoryClient.tsx` and `src/features/inventory/queries.ts`.
7. **Priority / Impact:** P1 — business workflow parity.

## 3. Inventory number and SKU generation

1. **Feature / Business Logic Name:** Legacy inventory/SKU generation rules
2. **Existing System Behavior:** The legacy system derives the next inventory number from existing records and generates SKU from make/model/colour, incrementing the final hyphen-separated number when a matching vehicle combination exists; otherwise it builds a fallback prefix from the vehicle text.
3. **Current Next.js Status:** Create first inserts the row, then assigns `Inventory/{inventoryId}` and `EC-{zero-padded inventoryId}` in a second update. Update preserves the generated values.
4. **Missing Functionality or Logic:** The legacy business identifiers and vehicle-combination SKU sequencing are not reproduced. The two-step create also is not one atomic transaction.
5. **Required Improvement:** Confirm the identifier policy for migration. If legacy parity is required, implement the legacy sequencing and collision behavior in a transaction/locked operation. If the new identifiers are intentional, record an explicit approved rule and migration mapping.
6. **Relevant Existing Code Location:** Legacy `Inventory_ViewModel.cs` and `Inventory_Management.cs`; Next `src/features/inventory/actions.ts` (`createInventory`).
7. **Priority / Impact:** P1 — identifiers, integrations, and reporting.

## 4. Registration duplicate rule

1. **Feature / Business Logic Name:** Registration-number duplicate validation
2. **Existing System Behavior:** Before save, legacy checks exact registration equality against another inventory record only when the trimmed registration length is greater than five. Short values can repeat; the current record is excluded during update.
3. **Current Next.js Status:** Next server actions require a non-empty registration but do not implement the legacy duplicate query or short-value exception. Prisma marks `inventoryNumber` unique, but `registrationNo` is nullable and not unique in `prisma/schema.prisma`; `P2002` is generically described as a registration duplicate.
4. **Missing Functionality or Logic:** Duplicate registrations can be stored, and a database error may be reported as a registration conflict even when another unique constraint caused it.
5. **Required Improvement:** Implement an explicit normalized/exact duplicate check with the approved legacy length rule, exclude the edited row, define case/whitespace behavior, and report actual constraint failures accurately.
6. **Relevant Existing Code Location:** Legacy `Inventory_Management.cs`; Next `src/features/inventory/actions.ts`, `prisma/schema.prisma` (`InventoryManagement.registrationNo`).
7. **Priority / Impact:** P0/P1 — data integrity.

## 5. Vehicle master/autocomplete workflow

1. **Feature / Business Logic Name:** Free-text vehicle master maintenance
2. **Existing System Behavior:** Make, model, variant, colour, and fuel type are editable text fields with autocomplete. Legacy save upserts vehicle master records using exact text values. Make/model/variant/colour suggestions are available from the legacy endpoints; vehicle suggestions are not parent-scoped.
3. **Current Next.js Status:** The form provides searchable Make/Model/Variant picker inputs with explicit `+ Add` actions. New Models require the selected Make, and new Variants require the selected Make and Model; created values are selected immediately. Colour and fuel master/autocomplete behavior is not reproduced.
4. **Missing Functionality or Logic:** The core make/model/variant master workflow is now present, but colour/fuel autocomplete and a single transaction covering picker creation plus inventory save are not present.
5. **Required Improvement:** If full legacy parity is required, add verified colour/fuel suggestions and make picker creation plus inventory persistence atomic or compensating. Preserve the ability to manage historical/unmapped values.
6. **Relevant Existing Code Location:** Legacy `CommonFor_Model_Color_Variant.cs`, `Inventory_Management.cs`, and `Inventory_Management_View.cshtml`; Next `src/features/inventory/actions.ts`, `InventoryClient.tsx`, and `app/api/catalog/**`.
7. **Priority / Impact:** P1 — master-data consistency.

## 6. Form validation and required-field rules

1. **Feature / Business Logic Name:** Complete save validation
2. **Existing System Behavior:** Legacy client validation marks SKU, year, make, model, colour, price, status, owner type, and owner as required; numeric required fields must be non-zero; email fields are validated. Sold inventory additionally requires customer name. Server behavior can still be reached by bypassing client validation, but these are the implemented UI rules.
3. **Current Next.js Status:** Implemented. The form marks Make, Model, and Variant as required, and both create/update server actions reject saves without a linked Variant.
4. **Missing Functionality or Logic:** No remaining optional-Variant save path is intended. Historical records without a Variant remain readable, but editing them requires selecting or creating a valid linked Variant before saving.
5. **Required Improvement:** None for the approved strict Variant rule. The server also verifies that the selected Variant belongs to the submitted Make and Model; retain fallback display/search behavior for historical unlinked records.
6. **Relevant Existing Code Location:** Legacy `Validations.js` and `Inventory_Management_View.cshtml`; Next `src/lib/validation.ts`, `InventoryClient.tsx`, and `src/features/inventory/actions.ts`.
7. **Priority / Impact:** P0/P1 — invalid and incomplete records.

## 7. Customer/contact data model parity

1. **Feature / Business Logic Name:** Inventory customer fields and customer upsert
2. **Existing System Behavior:** The legacy form accepts customer name, address, mobile, and email. Save looks up an exact customer match and creates or updates the customer record, then persists the inventory’s customer fields. Customer details are also displayed and exported.
3. **Current Next.js Status:** The form uses a linked `CustomerPicker`, `customerId`, `customerName`, and `customer/source` text. Quick create can create a separate customer record. Inventory save connects/disconnects the selected customer but does not upsert typed customer address/mobile/email fields, and the inventory form does not expose the complete legacy customer contact set.
4. **Missing Functionality or Logic:** Legacy customer-contact capture, exact-match/upsert behavior, and inventory-level persistence are not equivalent.
5. **Required Improvement:** Define whether Customer is now relation-only. If parity is required, add the missing fields, implement the approved exact-match/upsert behavior transactionally, and expose the values in detail/list/export where required.
6. **Relevant Existing Code Location:** Legacy `Inventory_Management.cs` and `Inventory_Management_View.cshtml`; Next `src/features/inventory/actions.ts`, `src/features/customers/CustomerPicker.tsx`, and `prisma/schema.prisma`.
7. **Priority / Impact:** P1 — customer history and communication data.

## 8. Owner field behavior and autocomplete

1. **Feature / Business Logic Name:** Owner type/name/contact workflow
2. **Existing System Behavior:** Owner type is selected from legacy options; owner name, mobile, registration, and dealer fields have autocomplete. Dealer ownership causes a dealer-master exact-name upsert during inventory save. Owner fields participate in required validation and search.
3. **Current Next.js Status:** Owner fields are mostly free text, with no equivalent dealer-master upsert on inventory save. Dealer options are loaded for email recipients, not as a save-time owner workflow.
4. **Missing Functionality or Logic:** Dealer ownership no longer maintains dealer master data as a side effect, and legacy owner suggestions/required behavior are absent.
5. **Required Improvement:** Restore the verified owner/dealer master workflow or explicitly replace it with a linked dealer selector and transactional association. Align validation and suggestions with the chosen model.
6. **Relevant Existing Code Location:** Legacy `Inventory_Management.cs`, `Inventory_ViewModel.cs`, and view; Next `src/features/inventory/actions.ts` and `InventoryClient.tsx`.
7. **Priority / Impact:** P1 — ownership and dealer data integrity.

## 9. Inventory list information parity

1. **Feature / Business Logic Name:** Complete inventory result columns
2. **Existing System Behavior:** The legacy result table shows grouped inventory, vehicle, ownership, customer, tax/registration/insurance, remarks, and contact information, with row edit/delete and selection checkboxes.
3. **Current Next.js Status:** The main table shows inventory number, SKU, registration, vehicle, year, fuel, kilometres, price, status, customer, owner, and row actions. Several legacy fields are only available through edit/detail, and there is no row-selection model.
4. **Missing Functionality or Logic:** Users cannot review or select the full legacy result set directly from the list, especially month, colour, owners, tax, insurance, owner contacts, customer contacts, comments, and remarks.
5. **Required Improvement:** Add the approved missing columns/detail affordances and retain the selection model for workflows that require multiple inventory records.
6. **Relevant Existing Code Location:** Legacy inventory view; Next `src/features/inventory/InventoryClient.tsx`.
7. **Priority / Impact:** P2 — operational usability and parity.

## 10. Bulk dealer/customer email workflow

1. **Feature / Business Logic Name:** Bulk inventory email distribution
2. **Existing System Behavior:** Legacy users select multiple inventory rows and multiple dealers or customers. Dealer email eligibility is restricted to non-Dealer-owned vehicles that are `In Stock`; selected vehicles and recipients are sent through the legacy mail helper with photo attachments. Customer email supports from/to budget filters and vehicle/customer criteria.
3. **Current Next.js Status:** Implemented for the approved scope. Users can select visible inventory rows, open the existing Send Email modal, add multiple dealer/customer recipients, and send the selected vehicles. The client invokes the same authorized send action per vehicle and reports successful and failed vehicle identifiers.
4. **Missing Functionality or Logic:** Legacy dealer eligibility rules, budget-based customer search, and photo attachment behavior remain absent; photo attachments are On Hold.
5. **Required Improvement:** If full legacy parity is later approved, add the remaining eligibility/search rules and a dedicated server-side batch operation. The current approved bulk-send workflow is covered.
6. **Relevant Existing Code Location:** Legacy inventory view/controller/mail helper; Next `src/features/inventory/InventoryClient.tsx`, `src/features/inventory/actions.ts`, and `src/lib/email/**`.
7. **Priority / Impact:** P1 — sales workflow and business-rule correctness.

## 11. Inquiry follow-up workflow

1. **Feature / Business Logic Name:** Inventory inquiry search and follow-up update
2. **Existing System Behavior:** Legacy Search Inquiry searches by Make/Model/Variant, shows inquiry/follow-up fields, and lets the user save follow-up status, classification, date, and remarks. Save inserts a `Followup_Inquiry` record and updates the inquiry record.
3. **Current Next.js Status:** Next searches inquiries and syncs a selected inquiry into inventory. Sync copies selected customer/vehicle data, appends an internal note, sets fixed inquiry/follow-up values based on inventory status, and deletes other inquiry car-detail rows. It does not expose the legacy follow-up editor or insert the legacy follow-up record from this inventory workflow.
4. **Missing Functionality or Logic:** Manual follow-up status/classification/date/remarks and the legacy update history behavior are absent; Next’s fixed mapping and deletion of other car details is materially different.
5. **Required Improvement:** Add the follow-up fields and transaction that creates the follow-up history row and updates the inquiry. Preserve all existing car details unless a deliberate replacement rule is approved; document status mapping and avoid hard-coded destructive behavior without confirmation.
6. **Relevant Existing Code Location:** Legacy `AdminController.cs`, inventory view, inquiry model; Next `src/features/inventory/actions.ts`, `app/api/inventory/inquiries/route.ts`, and `InventoryClient.tsx`.
7. **Priority / Impact:** P1 — inquiry history and sales pipeline integrity.

## 12. Photo lifecycle and legacy-photo compatibility

1. **Feature / Business Logic Name:** New-record upload, legacy paths, and delete cleanup
2. **Existing System Behavior:** Legacy upload can be initiated from the inventory workflow using the inventory-number convention; save replaces/records photo rows, delete removes physical files and database rows, and the old module uses its established photo paths.
3. **Current Next.js Status:** Next photo POST requires an existing inventory ID and inventory number, accepts only JPG/PNG/WEBP up to 10 MB, stores files under `public/uploads/inventory/{id}`, and writes rows separately. The client manages photos after the vehicle exists. GET can return legacy rows, but the current upload/display flow does not provide a complete legacy-path migration/display guarantee. Inventory delete does not explicitly delete photo rows/files; Prisma `InventoryPhotos.fkInventoryId` is `onDelete: NoAction`.
4. **Missing Functionality or Logic:** Photos cannot be attached before the new record is saved; old physical paths may not render through the new public path; deleting inventory can fail because of photo references or leave files behind.
5. **Required Improvement:** Define a migration/compatibility reader for legacy paths, support the approved new-record workflow, and implement an atomic or compensating delete that removes photo rows and owned files safely before/with inventory deletion.
6. **Relevant Existing Code Location:** Legacy `AdminController.cs`, inventory view, and photo model; Next `app/api/inventory/photos/route.ts`, `src/features/inventory/InventoryClient.tsx`, `src/features/inventory/actions.ts`, `prisma/schema.prisma` (`InventoryPhotos`).
7. **Priority / Impact:** P0/P1 — data loss, orphan files, and delete failures.

## 13. Export parity

1. **Feature / Business Logic Name:** Legacy Excel export
2. **Existing System Behavior:** Legacy export produces an Excel file using the current search result and includes the legacy inventory, vehicle, ownership, customer-contact, registration, tax, insurance, comments, and remarks fields.
3. **Current Next.js Status:** Next export re-queries all rows matching the current filter predicate and downloads a client-generated CSV with a different 25-column shape. It is not an Excel workbook and does not include the complete legacy customer-contact/address set.
4. **Missing Functionality or Logic:** Excel format and legacy column coverage are missing; export semantics are broader because Next exports all matching records rather than the visible selected rows.
5. **Required Improvement:** Confirm the required export contract. If legacy parity is required, implement an XLSX export with the legacy column set and approved scope (visible rows, selected rows, or all filtered rows), including numeric/date formatting and authorization.
6. **Relevant Existing Code Location:** Legacy export action in `AdminController.cs`; Next `app/api/inventory/export/route.ts` and CSV logic in `InventoryClient.tsx`.
7. **Priority / Impact:** P1/P2 — reporting and downstream operations.

## 14. Delete behavior and referential cleanup

1. **Feature / Business Logic Name:** Inventory deletion cleanup
2. **Existing System Behavior:** Legacy delete removes the inventory and performs physical/database photo cleanup through the legacy cleanup path; errors are surfaced through the legacy admin response.
3. **Current Next.js Status:** Next deletes only the `InventoryManagement` row. Related-record failures are mapped to a generic checklist/insurance/loan/RTO/DSA message, and photo references are not explicitly cleaned up.
4. **Missing Functionality or Logic:** Photo cleanup and a complete dependency-aware deletion workflow are absent. The error message does not identify photo references and may not identify the actual blocking relation.
5. **Required Improvement:** Enumerate dependent records, delete only approved owned artifacts, return relation-specific errors, and make the operation transactional/compensating where physical files are involved.
6. **Relevant Existing Code Location:** Legacy controller/model cleanup; Next `src/features/inventory/actions.ts`, `prisma/schema.prisma`, and `InventoryClient.tsx`.
7. **Priority / Impact:** P0/P1 — deletion reliability and orphaned data.

## 15. Search and filtering behavior consistency

1. **Feature / Business Logic Name:** Result-set filtering semantics
2. **Existing System Behavior:** Legacy search uses ten exact-equality fields: Make, Model, Variant, Colour, Fuel Type, Owned Type, Owned By, owner mobile, Registration No, and Status. Empty inputs are ignored; there is no pagination, sort, or result limit.
3. **Current Next.js Status:** Next provides broader contains/range filters, URL state, pagination, and a debounced global search. The server filters one page, then the client applies another filter pass to the loaded page. Filter options are derived from currently loaded rows; no explicit sort control exists.
4. **Missing Functionality or Logic:** Results, option lists, and visible counts can diverge because client filtering is applied after server pagination. This is not equivalent to either the legacy exact search or a fully server-side paged search.
5. **Required Improvement:** Make one server-side predicate authoritative for filtering, counts, options, and export. Preserve the broader Next filters only if desired, but define exact/contains semantics and add explicit sorting if operationally required.
6. **Relevant Existing Code Location:** Legacy inventory view/controller; Next `src/features/inventory/queries.ts` and `InventoryClient.tsx`.
7. **Priority / Impact:** P1 — users can miss records or see misleading counts.

## 16. Status-triggered inquiry synchronization

1. **Feature / Business Logic Name:** Booked/Sold transition behavior
2. **Existing System Behavior:** Legacy inquiry search/update is an explicit workflow initiated from the inquiry controls; the update carries user-entered follow-up values.
3. **Current Next.js Status:** After save, Next prompts for inquiry synchronization when status is `Booked` or `Sold`. The prompt calls the fixed sync workflow; a manual row-level inquiry action is also available.
4. **Missing Functionality or Logic:** Status changes do not reproduce the legacy follow-up capture/history behavior and can make a destructive car-detail replacement flow appear as a simple sync.
5. **Required Improvement:** Keep the prompt if approved, but require the correct follow-up data, show the exact records to be changed, preserve history, and make status-triggered sync idempotent and auditable.
6. **Relevant Existing Code Location:** Next `src/features/inventory/actions.ts` (`syncInventoryToInquiry`) and `InventoryClient.tsx`; legacy inventory/inquiry controller code.
7. **Priority / Impact:** P1 — workflow and audit correctness.

## 17. Server-side input normalization and validation defects

1. **Feature / Business Logic Name:** Defensive action validation
2. **Existing System Behavior:** Legacy UI trims/validates selected fields through JavaScript and uses exact database comparisons; bypass behavior is inconsistent but visible rules are defined in the page scripts.
3. **Current Next.js Status:** `buildData` uses several input values with `|| null`, but server actions do not consistently trim text, validate numeric ranges, validate email/phone/year, or verify related customer/catalog IDs before persistence. Client-only validation can be bypassed by calling server actions directly.
4. **Missing Functionality or Logic:** Invalid or whitespace-only values can be persisted, and relation/input errors are discovered late or as generic failures.
5. **Required Improvement:** Validate and normalize the complete input contract on the server, use schema validation shared with the client, verify related IDs, and return field-level errors where possible.
6. **Relevant Existing Code Location:** Next `src/features/inventory/actions.ts`, `src/lib/validation.ts`, `InventoryClient.tsx`; legacy `Validations.js`.
7. **Priority / Impact:** P1 — data quality and predictable error handling.

## 18. Missing legacy downstream navigation

1. **Feature / Business Logic Name:** Inventory-to-operations links
2. **Existing System Behavior:** Each legacy inventory row exposes links/actions to Checklist, Insurance, RTO, DSA, Financial, and related inquiry/customer workflows, with the inventory/registration context passed forward.
3. **Current Next.js Status:** The current Inventory table exposes edit, delete, photos, email, and inquiry actions. The documented implementation does not expose equivalent row-level links to all of those downstream modules.
4. **Missing Functionality or Logic:** Users must leave Inventory and manually locate the vehicle in downstream modules, or the navigation is unavailable.
5. **Required Improvement:** Add verified links with the correct inventory ID/registration query parameters and preserve downstream permission checks. Do not add links to modules that cannot consume the context safely.
6. **Relevant Existing Code Location:** Legacy inventory view; Next `src/features/inventory/InventoryClient.tsx` and downstream routes under `app/(dashboard)`.
7. **Priority / Impact:** P1/P2 — operational workflow continuity.

## Approval boundary

Approved items implemented so far are recorded in the current SSOT. The remaining items in this document are still separate gap items and require explicit approval before implementation. After all desired items are approved and implemented, update the current SSOT and remove this improvement document as requested.
