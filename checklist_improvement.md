# Checklist / Documents — Legacy vs Next.js gap analysis

## Comparison basis

This compares the verified legacy SSOT at `docs/module/existing_ssot/checklist.md` with the current implementation SSOT at `checklist.md`. It intentionally remains separate pending approval. Differences that improve safety/usability are recorded as decisions, not requests to restore known legacy defects.

## Priority gaps and decisions

### 1. Legacy fixed document catalogue parity — High

**Status: implemented on 2026-09-10.** Add now uses the exact 13 legacy names, including legacy spelling and whitespace. Existing saved custom/current rows remain editable and are not rewritten.

- **Existing behavior:** exactly 13 hard-coded rows, including `Muncipal Tax Receipt`, `PUC Validity`, `Duplicate Keys`, `Manuals`, and `Spare Tyre & Tool Kit`.
- **Current status:** Add uses the exact 13 legacy default rows.
- **Missing/different logic:** None for the approved default-catalogue scope.
- **Required improvement:** completed; preserve the exact strings unless an explicitly approved catalogue migration is performed.
- **Locations:** legacy `ApModel/Model/CheckList_Document/Check_List_Documents.cs`; current `src/features/checklist/ChecklistClient.tsx` (`LEGACY_DOCS`).

### 2. Applicability value contract — High

**Status: implemented on 2026-09-10.** New and newly added document rows use legacy `Yes`/`No`; status calculations recognize both `Yes` and historical Next.js `Applicable` values. Existing values are not rewritten.

- **Existing behavior:** persisted dropdown values are `Yes` and `No`.
- **Current status:** persisted values for newly created/added rows are `Yes`/`No`; completion recognizes both canonical `Yes` and historical `Applicable`.
- **Missing/different logic:** Existing historical `Applicable` values are retained rather than being destructively rewritten.
- **Required improvement:** completed for runtime compatibility. Plan and approve a data migration separately only if canonicalizing historical records is desired.
- **Locations:** legacy view; current `ChecklistClient.tsx` (`APPLICABILITY_OPTIONS`) and `queries.ts` aggregate SQL.

### 3. Detail/export authorization gap — Critical

**Status: implemented on 2026-09-10.** The two endpoints now enforce `canCurrentUserAccessRoute('/checklist')` after their existing authentication check and return 403 for authenticated callers without permission. This entry is retained until the full approved improvement scope is complete.

- **Existing behavior:** page, export, and protected actions require `Document_CheckList` authorization; detail JSON lacked an explicit filter.
- **Current status:** page, mutations, detail API, and export API require `Checklist_Management` after authentication.
- **Missing logic:** None for this approved item.
- **Required improvement:** completed; retain the checks as part of the route contract.
- **Locations:** `app/api/checklist/detail/route.ts`, `app/api/checklist/export/route.ts`, `src/lib/access/accessControl.ts`.

### 4. Atomic update/delete persistence — High

**Status: implemented on 2026-09-10.** Update and delete now execute their header/detail operations inside `prisma.$transaction`, so an error rolls back the complete mutation.

- **Existing behavior:** legacy update intends a TransactionScope; legacy delete itself is non-atomic.
- **Current status:** update and delete are atomic Prisma transactions.
- **Missing logic:** None for the approved atomicity scope.
- **Required improvement:** completed; retain transaction boundaries for any future checklist persistence changes.
- **Locations:** `src/features/checklist/actions.ts`.

### 5. Server-side field validation — High

**Status: implemented on 2026-09-10.** Create/update now validate required header snapshot fields, customer/mobile/email, year, at least one named document, and permitted document values before querying/persisting.

- **Existing behavior:** client `validate()` marks registration, make, model, colour, and customer name required, although it is bypassable.
- **Current status:** server-side validation covers the approved header, customer, and document-state rules. Transitional applicability values remain accepted to preserve existing records.
- **Missing logic:** None for the approved server-validation scope.
- **Required improvement:** completed; keep validation co-located in `src/features/checklist/validation.ts` and update it whenever the checklist contract changes.
- **Locations:** legacy view/shared `validate()`; current `src/features/checklist/actions.ts` and `ChecklistClient.tsx`.

### 6. Customer association policy mismatch — Medium-High

**Status: implemented on 2026-09-10.** Customer data is now derived from the selected Inventory record, is read-only in the checklist form, and is enforced server-side against that Inventory customer.

- **Existing behavior:** selection fills customer details from the sold inventory vehicle; user cannot independently select another customer.
- **Current status:** independent reassignment is not available; create/update enforces the selected Inventory customer.
- **Missing/different logic:** None for the approved legacy-parity customer-association scope.
- **Required improvement:** completed; any future reassignment workflow requires an explicit approved business rule and audit trail.
- **Locations:** legacy autocomplete/model; current `ChecklistClient.tsx`, `actions.ts`.

### 7. Export contract mismatch — Medium

**Status: implemented on 2026-09-10.** The existing summary CSV is retained and the UI now also offers **Export Detail Rows**, a legacy-compatible one-row-per-document CSV with the legacy export columns. It uses the current broad-search scope; exact-registration filter behavior remains tracked separately.

- **Existing behavior:** server Excel export emits one row per detail, filtered only by exact registration, using an inner join.
- **Current status:** summary CSV and legacy-compatible detail-row CSV are both available. Detail-row CSV omits headers with no detail rows, as the legacy inner join did.
- **Missing/different logic:** Exact-registration filter semantics remain tracked in item 8.
- **Required improvement:** completed for the approved detail-row export scope; retain both export choices unless product retires one deliberately.
- **Locations:** legacy controller/model export; current export route and `ChecklistClient.tsx`.

### 8. Search contract mismatch — Medium

**Status: implemented on 2026-09-10.** The original broad search remains available, and a separate Exact Registration No filter now applies database equality and is shared by exports.

- **Existing behavior:** blank search lists all headers; a registration searches exact equality only.
- **Current status:** broad, case-insensitive search and exact registration equality are separate, combinable controls.
- **Missing/different logic:** None for the approved exact-registration filter scope.
- **Required improvement:** completed; preserve the explicit filter distinction in future search changes.
- **Locations:** legacy `Search_ChecklistDetails`; current `src/features/checklist/queries.ts`.

### 9. Out-of-range pagination handling — Low

- **Existing behavior:** no pagination.
- **Current status:** page is clamped to >= 1 but not <= pageCount; `/checklist?page=9999` shows an empty table despite matching data.
- **Required improvement:** clamp to computed page count or redirect to the last valid page.
- **Locations:** `app/(dashboard)/checklist/page.tsx`, `queries.ts`.

### 10. Intentional modernizations to retain — Decision required

The Next.js version adds view detail/audit display, pagination, normalized registration matching, custom document add/remove, unsaved-change protection, delete confirmation, client CSV errors, and inventory selection that is validated as sold on save. These did not exist in legacy and should be retained unless product explicitly requires strict UI parity. Legacy defects that should not be reintroduced include unbounded server autocomplete, no delete confirmation, unauthenticated detail endpoint behavior, `Count < 0` export logic, and non-transactional deletion.

## Approval rule

Do not merge this document into `checklist.md`, delete it, or implement its proposals without explicit approval. After approved implementation, update `checklist.md` to the new actual behavior and remove this improvement document only when the approved scope is complete.
