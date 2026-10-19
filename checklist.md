# Checklist / Documents — Current Next.js SSOT

## Status, route, and evidence

**Status:** Next.js implemented; current-state behavior documented and code-verified.

This document describes the actual current implementation only, after two code-review passes. Route: `/checklist`.

The route page is a thin authorization/data-loading wrapper. The interactive feature composes focused UI components; the listing is implemented by `ChecklistTable.tsx` rather than embedded in the feature controller.

Evidence: `app/(dashboard)/checklist/page.tsx`, `src/features/checklist/ChecklistClient.tsx`, `actions.ts`, `queries.ts`, `app/api/checklist/detail/route.ts`, `app/api/checklist/export/route.ts`, `src/lib/access/accessControl.ts`, and `prisma/schema.prisma`.

## Access and page load

The server page requires route access for `Checklist_Management`; otherwise it redirects to `/dashboard`. Page loading calls `listChecklists({ search, page })` and `getVehicles()` concurrently. Create, update, and delete server actions independently re-check the same route authorization and return `Not authorized.` when it fails.

The detail/export HTTP routes first return 401 to callers without a signed-in session, then enforce the same `/checklist` route access as the page and mutations. An authenticated caller without `Checklist_Management` receives 403 before any data lookup/export.

## Storage and read model

Prisma maps headers to `check_list_doc_main` (`CheckListDocMain`) and children to `checklist_doc_details` (`ChecklistDocDetails`). Header fields preserve the legacy vehicle/customer snapshot and audit fields; optional relations connect to Inventory and Customer. Details store name, applicability, received state, original/copy, and audit fields.

List rows are newest-first by `documentId`, page size 25. The query computes total document count and SQL aggregates: applicable count (`Yes`, plus transitional historical `Applicable`), applicable-and-received count, and all received count. Audit user IDs are resolved to UserTable display/user names. A detail load returns all child rows ascending by detail ID.

## Listing, search, pagination, export

The table shows Registration No, vehicle make/model/variant, customer name/mobile, `received / document count`, computed status, and View/Edit/Delete controls. Status is `Complete` only when at least one document is applicable (`Yes`, with transitional recognition of historical `Applicable`) and every applicable document is `Yes` received; otherwise it is `Partial`. It is derived at display time and not stored.

The debounced (350 ms) broad search updates URL `search` and resets to page 1. It is a case-insensitive substring search over registration, legacy/customer-relation name/mobile/email, make, model, and variant. A separate Exact Registration No filter uses URL `registration` and database equality; when both filters are supplied, both must match. Exports use the same filters. Colour, year, fuel type, IDs, document text, and status are not searchable. Previous/Next navigation preserves filters; the data query clamps out-of-range page numbers to the final available page.

Export Summary or Export Detail Rows calls `/api/checklist/export` with the current search. The route loads every matching header, then each detail, and returns JSON. Summary export builds a UTF-8 CSV with header/customer snapshot, counts, derived status, and semicolon-separated document summaries. Detail-row export produces one row per child document with the legacy column order: vehicle/customer snapshot, document name, applicability, received, and original/copy; headers with no details emit no data row. Export failures render an inline error; both exports are disabled when total is zero. This is CSV, not the legacy server Excel helper.

## Create and edit form

Add opens a modal populated with the legacy 13 suggested document rows, defaults `No`, `No`, and `Original`. The suggestions are:

- Original Registration Book / RC Card; Original Tax Book for before 97 vehicle; Dealers Invoice; Insurance Certificate (State Comprehensive / Third Party ); Muncipal Tax Receipt (If applicable); TTO Set duly signed all places; Authorised Signatory Letter on Company Letter Head (In case of Company Vehicle); NOC Finance Company (If Hypothecation Case); Owner Authority Letter to Middle Man for selling car; PUC Validity; Duplicate Keys; Manuals; Spare Tyre & Tool Kit.

Registration entry offers normalized, client-side matching over loaded vehicles. An exact normalized registration immediately selects the vehicle and snapshots its make/model/variant/colour/year/fuel type; otherwise it clears inventory and vehicle fields. A second picker searches registration, SKU, make, model, and variant client-side and can select any loaded vehicle. The client list comes from all inventory records, not only sold vehicles; save validation enforces sold status.

Customer data is read-only and derived from the selected Inventory record; the form does not offer an independent customer picker. The server rejects a customer ID that differs from the Inventory customer and, for an Inventory record without a customer ID, rejects a different legacy customer name. Optional mobile/email/year inputs are validated by shared helpers if populated. The form allows adding arbitrary document names and removing any row, including every suggested row. It requires at least one nonblank document server-side; blank-named rows are discarded. Applicable and Received use compact `Yes`/`No` segmented controls, while Original/Copy uses a visually distinct two-option segmented control. Existing `Applicable` values remain visible on edit and count as applicable for status calculations until data is normalized.

Edit opens the same modal, fetches `/api/checklist/detail?documentId=…`, and maps the saved document rows exactly as stored (including custom rows). There is loading/error feedback. Both add/edit warn before discarding changed form/customer/vehicle state. Successful save closes and reloads the browser page.

## Persistence and validation

Before create/update, the server validates registration, vehicle make/model/variant/colour/year/fuel type, either a customer ID or customer name, populated customer mobile/email formats, at least one named document, and each document state. Applicability accepts canonical `Yes`/`No` plus transitional historical `Applicable`/`Not Applicable`; Received accepts `Yes`/`No`; Original/Copy accepts `Original`/`Copy`. It then requires a non-null Inventory ID, a still-existing inventory record with status exactly `Sold`, and a normalized registration equal to that inventory's registration (case and non-alphanumeric characters ignored). It rejects another checklist for the same Inventory ID; unlike legacy, registration is not part of the duplicate predicate.

Create inserts header and all valid details with the authorized actor and current timestamps. Update deletes details, updates the header (including inventory/customer link and snapshot), and creates replacement details within one Prisma transaction. Delete likewise removes children and header within one transaction. A failure rolls back the checklist mutation rather than leaving a partial header/detail state. The action maps known foreign-key errors to a specific message and otherwise returns a generic save error.

Delete first removes children, then the header; the UI presents a destructive confirmation. It is a permanent delete, not a soft delete. Actions revalidate `/checklist` after success.

## View and error behavior

View retrieves fresh detail data and shows vehicle/customer snapshot, created/updated audit time and resolved actor, and the complete detail table. Detail fetch errors show in the modal. The API returns 401 for no session and 404 for missing/invalid IDs or missing records. Create and update run shared server validation for document enum values, customer contact formats, year, required vehicle snapshot fields, inventory/registration consistency, duplicate checklists, and at least one named document.

## SSOT rule

`Authorized Checklist_Management user → selected Inventory record (sold or unsold) or manually entered registration → validated vehicle snapshot → replaceable document-detail set.`

## Approved modernization decisions

The following intentional Next.js improvements are approved and part of the supported module contract: custom document add/remove, detail and audit view, pagination, normalized registration matching for vehicle selection/validation, destructive-action and unsaved-change confirmations, explicit client/API error feedback, atomic update/delete persistence, and detail/export permission enforcement. They replace less safe or less capable legacy behavior and must not be removed solely to reproduce the old UI.

Update this SSOT when authorization, list/search/export behavior, suggested documents, validation, calculated status, or persistence semantics change.
