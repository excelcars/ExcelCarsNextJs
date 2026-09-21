# Vehicle Master — Next.js Improvement / Gap Analysis

## 1. Document status and scope

This document records deferred legacy-parity and hardening decisions. Current implemented behavior is documented in `vehiclemasters.md`; this file does not change that current-state SSOT.

The comparison covered two passes:

1. Legacy vehicle-master lookup, creation, update, deletion, validation, and cross-module behavior from `docs/module/existing_ssot/Vehicle_Master.md`.
2. Next.js catalog page, server actions, Prisma relationships, catalog APIs, and the Inventory, Inquiry, RTO, Insurance, Loan, Follow-up, and report integrations.

Only behavior evidenced by the reviewed code or existing legacy SSOT is listed below. Items marked as improvement recommendations require product confirmation before implementation.

## 2. Reviewed items and agreed scope

### Future Scope VM-01 — Separate permission restriction for Vehicle Master mutations

1. **Feature / Business Logic Name**  
   Vehicle Master authorization for create, update, and delete.

2. **Existing System Behavior**  
   The legacy Vehicle Master values were created as part of Inventory and Inquiry flows. Those flows required their own module access, but no separate Vehicle Master management permission or standalone legacy master CRUD page was found.

3. **Current Next.js Status**  
   The `/config/catalog` page is placed under the authenticated dashboard layout and `Vehicle_Master_Management` is registered in `src/lib/access/accessCatalog.ts`. The current business decision is that users may add or update Vehicle Master records, so a separate permission restriction is not required for the current scope.

4. **Missing Functionality or Logic**  
   No current gap is being raised. If the business later requires restricted Vehicle Master administration, the current server actions would need an explicit permission check.

5. **Required Improvement**  
   Leave open as future scope. If the policy changes, enforce the selected Vehicle Master permission in every catalog mutation server action and add authorization tests. Until then, do not block permitted users from adding or updating master values.

6. **Relevant Existing Code Location**  
   `src/features/catalog/adminActions.ts:9-86`; `src/lib/access/accessCatalog.ts:23`; `app/(dashboard)/layout.tsx:11-20`; `src/lib/access/accessControl.ts`.

7. **Priority / Impact**  
   **Future scope / Not a current implementation blocker.**

### Future Scope VM-02 — Vehicle-master audit actor fields are not populated

1. **Feature / Business Logic Name**  
   Created-by and updated-by audit tracking for Make, Model, and Variant.

2. **Existing System Behavior**  
   Legacy Inventory and Inquiry master upserts populated `Created_By`, `Created_Dt`, `Updated_By`, and `Updated_Dt` from the logged-in user and current time.

3. **Current Next.js Status**  
   Catalog mutations set `createdDt`, `updatedDt`, and `updatedDt` on updates, but do not set `createdBy` or `updatedBy`.

4. **Missing Functionality or Logic**  
   Vehicle-master changes cannot identify the actor who created or last changed a record. The Prisma schema contains the actor columns and relations, so the data model supports the missing behavior.

5. **Required Improvement**  
   Resolve the authorized current user in each mutation. Set both actor IDs on create and `updatedBy` on update. Preserve the existing timestamps and return a clear unauthorized response when no valid active user exists.

6. **Relevant Existing Code Location**  
   `src/features/catalog/adminActions.ts:9-75`; `prisma/schema.prisma:60-104`; legacy behavior summarized in `docs/module/existing_ssot/Vehicle_Master.md:57-79`.

7. **Priority / Impact**  
   **Future scope / Not a current implementation blocker.**

### Future Scope VM-03 — Inventory save no longer performs legacy master upsert

1. **Feature / Business Logic Name**  
   Inventory make → model → variant insert-if-not-found synchronization.

2. **Existing System Behavior**  
   `Inventory_Management.Insert_Update_Inventory()` looked up each submitted text value using the appropriate parent relationship and created missing Make, Model, and Variant master rows before completing the inventory save.

3. **Current Next.js Status**  
   Inventory requires either a selected catalog variant or entered legacy vehicle text. `createInventory` and `updateInventory` connect an existing `fkVariantId` when supplied and otherwise store `makeLegacy`, `modelLegacy`, and `variantLegacy`; they do not create catalog rows from those text values.

4. **Missing Functionality or Logic**  
   A valid manually entered vehicle in Inventory does not become reusable catalog data. Future selectors and reports may therefore continue to miss values captured through the legacy-text path.

5. **Required Improvement**  
   Decide and implement the approved parity rule: on Inventory create/update, normalize the submitted values, resolve or create the hierarchical master records, and save the resulting variant foreign key atomically with the inventory record. Preserve legacy text fields where required for historical compatibility. Prevent blank or partial hierarchy rows and handle concurrent duplicate creation safely.

6. **Relevant Existing Code Location**  
   `src/features/inventory/actions.ts:40-100, 133-199`; Inventory selector UI in `src/features/inventory/InventoryClient.tsx:1787-1795`; legacy behavior summarized in `docs/module/existing_ssot/Vehicle_Master.md:56-70`.

7. **Priority / Impact**  
   **Future scope / Not a current implementation blocker.**

### Future Scope VM-04 — Inquiry save no longer performs legacy master upsert

1. **Feature / Business Logic Name**  
   Inquiry vehicle-detail make → model → variant insert-if-not-found synchronization.

2. **Existing System Behavior**  
   `Inquiry.InsertUpdateInqiury()` repeated the hierarchical insert-if-not-found process for every inquiry detail row and populated audit fields from the logged-in user.

3. **Current Next.js Status**  
   The Next.js Inquiry flow requires catalog IDs for the structured vehicle editor and `resolveInquiryCarDetail` reads the selected variant to copy its names into legacy columns. If no variant is selected, it stores text/sub-variant/year data without creating master records.

4. **Missing Functionality or Logic**  
   Inquiry vehicle text that is valid but not already represented by a catalog variant is not promoted into the vehicle master. This is a behavior difference from the legacy save path.

5. **Required Improvement**  
   Confirm whether Inquiry should retain legacy parity. If approved, resolve/create the hierarchy per inquiry car row in the same transaction as the inquiry detail save, populate actor audit fields, and reject incomplete hierarchy input according to the agreed business rule.

6. **Relevant Existing Code Location**  
   `src/features/inquiry/actions.ts:238-289, 749-930`; editor behavior in `src/features/inquiry/InquiryClient.tsx:1504-1515`; legacy behavior summarized in `docs/module/existing_ssot/Vehicle_Master.md:72-83`.

7. **Priority / Impact**  
   **Future scope / Not a current implementation blocker.**

### Covered VM-05 — Legacy global prefix autocomplete contract

1. **Feature / Business Logic Name**  
   Generic Make, Model, and Variant prefix autocomplete.

2. **Existing System Behavior**  
   The legacy system exposed `AutoCompleteMake`, `AutoCompleteModel`, and `AutoCompleteVariant`. Each used `StartsWith(term)`, trimmed and distincted returned names, and did not constrain Model by Make or Variant by Make/Model.

3. **Current Next.js Status**  
   The current Next.js controls provide searchable catalog pickers and dependent Make → Model → Variant selection. The reviewed modules use those pickers and dependent lookups instead of the old standalone global autocomplete endpoints.

4. **Missing Functionality or Logic**  
   No current UI gap is being raised. The old endpoint contract is not reproduced literally, but the required user-facing search/picker behavior is implemented in the Next.js application.

5. **Required Improvement**  
   No current improvement required. Add backward-compatible endpoints only if a future external integration is found to depend on the old routes.

6. **Relevant Existing Code Location**  
   `app/api/catalog/models/route.ts`; `app/api/catalog/variants/route.ts`; selector calls in `src/features/inventory/InventoryClient.tsx`, `src/features/inquiry/InquiryClient.tsx`, `src/features/rto/RtoClient.tsx`, and `src/features/followup/FollowupClient.tsx`; legacy behavior summarized in `docs/module/existing_ssot/Vehicle_Master.md:31-45`.

7. **Priority / Impact**  
   **Covered in the current UI; future compatibility work only if an external consumer is identified.**

### Gap VM-06 — Variant parent hierarchy is not validated on the server

1. **Feature / Business Logic Name**  
   Consistency between Variant `fkMakeId` and its selected Model's `fkMakeId`.

2. **Existing System Behavior**  
   Legacy variant lookup and upsert treated Make + Model + Variant as one hierarchy and required both parent IDs to identify a variant.

3. **Current Next.js Status**  
   The UI normally selects a Model after a Make, but `updateVariant` accepts `makeId` and `modelId` independently and writes both values without loading the Model to verify that it belongs to the selected Make. The database schema has separate foreign keys but no composite constraint enforcing this relationship.

4. **Missing Functionality or Logic**  
   A crafted or stale client request can associate a Variant with a Make different from the Make owning its Model. Duplicate detection also evaluates the submitted pair without first validating the parent relationship.

5. **Required Improvement**  
   On create/update, load the Model and require `model.fkMakeId === makeId` before writing the Variant. Prefer deriving the Make from the Model, or add a database-level composite integrity mechanism if compatible with the existing schema. Add tests for mismatched parent IDs and reassignment of an in-use variant.

6. **Relevant Existing Code Location**  
   `src/features/catalog/adminActions.ts:56-75`; `src/features/catalog/CatalogClient.tsx:63, 80, 94`; `prisma/schema.prisma:92-105`.

7. **Priority / Impact**  
   **P1 / High data-integrity impact.**

### Accepted As-Is VM-07 — Catalog selector API permission policy

1. **Feature / Business Logic Name**  
   Authorization policy for catalog lookup APIs.

2. **Existing System Behavior**  
   Legacy generic autocomplete actions inherited the controller's session-expiry behavior and were used by multiple authorized modules. The reviewed legacy document does not establish a separate Vehicle Master permission for read-only lookup.

3. **Current Next.js Status**  
   The two catalog APIs check only whether `auth()` returns a session. They do not verify that the user is active or that the user has the permission for the consuming module. Catalog-management mutations have the separate issue documented in VM-01.

4. **Missing Functionality or Logic**  
   No change is requested for the current scope. The existing lookup API behavior is accepted as-is.

5. **Required Improvement**  
   No current improvement required. Revisit only if the application security policy changes.

6. **Relevant Existing Code Location**  
   `app/api/catalog/models/route.ts:5-14`; `app/api/catalog/variants/route.ts:5-14`; `src/lib/access/accessControl.ts`; `src/lib/access/accessCatalog.ts`.

7. **Priority / Impact**  
   **Accepted as-is for the current scope.**

## 3. Current business decision

For the current scope, Vehicle Master records may be added or updated by users who can use the relevant system workflows. A separate Vehicle Master permission restriction is deferred to future scope. Audit actor tracking and automatic master creation from Inventory and Inquiry are also future scope. The current picker-based search behavior is considered implemented, and the catalog lookup API policy is accepted as-is.

## 4. Reviewed functionality that is already covered

The following were verified as implemented in the current Next.js catalog surface and are not listed as gaps:

- `/config/catalog` navigation and authenticated dashboard placement.
- Make-level server-side search, ordering, pagination, and URL parameters.
- Hierarchical Make → Model → Variant creation controls.
- Make, Model, and Variant edit/delete actions with confirmation.
- Case-insensitive duplicate checks within the intended parent scope.
- Foreign-key delete protection translated to an in-use error.
- Dependent Make-to-Model and Model-to-Variant selector APIs.
- Cross-module use of catalog foreign keys and display fallbacks in Inventory, Inquiry, RTO, Insurance, Loan, Follow-up, and reporting code.

These implemented behaviors should remain separate from the approved improvements until review is complete.

## 5. Approval boundary

No implementation changes are authorized by this analysis document. After explicit approval, implement only the approved gaps, then update the canonical SSOT as instructed. Do not merge this document into `vehiclemasters.md`, rename it, or remove `customer_improvement.md` without explicit approval.
