# Customer Module — Deferred Legacy-Parity Backlog

## Status: Current implementation documented in `customer.md`; legacy-parity items deferred on 2026-09-21

## Review scope and evidence

This document preserves optional legacy-parity differences. It does not indicate that the current Customer Configuration module is incomplete: implemented behavior is documented in `customer.md`.

This document compares:

- Legacy SSOT: `docs/module/existing_ssot/customers.md` (the requested `docs/module/existing/_ssot/customers.md` path does not exist in this repository).
- Current SSOT: `docs/module/ssot/customer.md`.
- Current implementation: `app/(dashboard)/config/customers/page.tsx`, `src/features/customers/CustomersClient.tsx`, `src/features/customers/adminQueries.ts`, `src/features/customers/adminActions.ts`, `src/features/customers/validation.ts`, `src/features/customers/actions.ts`, `src/features/customers/queries.ts`, `src/components/CustomerPicker.tsx`, `app/api/customers/search/route.ts`, access-control files, and `prisma/schema.prisma`.

Two review passes were completed. Pass 1 inventoried route behavior, controls, data, queries, actions, validation, permissions, and related picker behavior. Pass 2 verified each candidate gap against the actual current code and excluded legacy defects and functionality that is already covered by a stronger Next.js implementation.

## Executive summary

The main confirmed legacy capabilities not currently available in the Next.js Customer Configuration experience are:

1. Exporting the current customer result set to Excel.
2. The legacy multi-criteria search contract (independent Name, exact Mobile, Type, Comments, and Company criteria combined with AND).
3. Legacy autocomplete suggestions for distinct customer names, primary mobiles, and company names.
4. A reset action with the legacy blank-form/cleared-results behavior.
5. The legacy result-table presentation, including serial number and direct display of address, secondary mobile, email/comments, and both dates.

The current implementation also has intentional behavior differences that should be accepted or explicitly decided during approval: it initially loads paged records, uses one debounced fuzzy search, adds a read-only view modal and delete confirmation, permits email-only customers, restricts new types to Contact/Customer, enforces stronger validation, and uses function-based authorization instead of the legacy role-4 UI convention.

## Detailed gaps and improvements

### 1. Customer result export to Excel

**Feature / Business Logic Name:** Export Customer Details.

**Existing System Behavior:** When search results exist, the legacy screen shows Export to Excel. It posts the current search criteria to `ExportToExcel_Customer_Details`, reruns the same matching query for all rows, and exports ten columns: Type, Customer Name, Customer Address, Customer Mobile, Mobile 2, Customer Email, Customer DOB, Customer Anniversary Date, Comments, and Company Name. Missing dates are exported as empty strings.

**Current Next.js Status:** Missing. `customer.md` explicitly states there is no export control, and `CustomersClient.tsx` has no export action or button.

**Missing Functionality or Logic:** There is no downloadable export of the filtered customer set, no server-side export query, no column mapping, and no export authorization boundary.

**Required Improvement:** Add a write-independent, view-authorized server export action/route that accepts the same supported filters as the listing, streams or returns an `.xlsx` file, includes all legacy export columns, safely formats nullable dates, and prevents exporting records outside the authorized customer scope. Decide whether export should be available for an empty result and document the behavior.

**Relevant Existing Code Location:** Legacy behavior is described in `docs/module/existing_ssot/customers.md`, section 5. Current listing query is `src/features/customers/adminQueries.ts`; current page UI is `src/features/customers/CustomersClient.tsx`.

**Priority / Impact:** High — operational/reporting capability is absent.

### 2. Legacy multi-criteria search workflow

**Feature / Business Logic Name:** Independent Customer Search Criteria.

**Existing System Behavior:** The legacy form has separate Name, Mobile, Type, Comments, and Company Name criteria. Nonblank criteria are combined with AND. Name, Comments, and Company use substring matching; Mobile and Type use exact matching. Address, Mobile 2, Email, and dates are not search criteria. Search posts the form and retains criteria/results.

**Current Next.js Status:** Partially covered with materially different behavior. Next.js has one `search` field matching Name, Mobile, Email, Company, or Comments with case-insensitive substring matching, plus a separate Type filter. It does not expose independent criteria or exact-mobile semantics.

**Missing Functionality or Logic:** Users cannot express the legacy query combinations, especially exact primary-mobile search, simultaneous independent field criteria, or a search restricted to one of the legacy searchable fields without cross-field matches. Current search also adds email matching, which changes results compared with legacy.

**Required Improvement:** Add separate URL/query parameters and UI controls for `name`, `mobile`, `type`, `comments`, and `companyName`; combine them with AND; preserve submitted criteria across search, pagination, and export; use exact matching for primary mobile and type and substring matching for the other three fields. If the product intentionally keeps the unified search, obtain approval for the behavior change and document it as a replacement rather than a parity implementation.

**Relevant Existing Code Location:** Legacy contract: `docs/module/existing_ssot/customers.md`, section 5. Current unified query: `src/features/customers/adminQueries.ts:14-45`; current controls: `src/features/customers/CustomersClient.tsx:289-300`.

**Priority / Impact:** High — affects finding the correct customer set and export parity.

### 3. Customer name autocomplete

**Feature / Business Logic Name:** Distinct Existing Customer Name Suggestions.

**Existing System Behavior:** The legacy Name field provides autocomplete while typing. It calls a dedicated endpoint using `Cust_Name.StartsWith(term)`, returns distinct names, and does not itself execute the main search.

**Current Next.js Status:** Missing in Customer Configuration. The admin page has a plain search input. The shared `CustomerPicker` searches customer records, but uses a combined contains search and returns customer rows rather than a distinct name suggestion list.

**Missing Functionality or Logic:** No name-only prefix suggestion workflow exists for the Customer Configuration search form; duplicate names are not collapsed into distinct suggestions.

**Required Improvement:** Add a name suggestion endpoint/query with trimmed prefix matching, distinct values, deterministic ordering, and an explicit result limit. Wire it only as a selection aid; selecting a suggestion must not silently submit the main search.

**Relevant Existing Code Location:** Legacy contract: `docs/module/existing_ssot/customers.md`, section 5. Shared current search: `src/features/customers/queries.ts:3-18`; picker UI: `src/components/CustomerPicker.tsx:53-86`.

**Priority / Impact:** Medium — improves legacy search speed and reduces typing errors.

### 4. Primary-mobile autocomplete

**Feature / Business Logic Name:** Distinct Primary Mobile Suggestions.

**Existing System Behavior:** The legacy Mobile field provides autocomplete using `Cust_Mobile.StartsWith(term)`, returning distinct primary mobile strings.

**Current Next.js Status:** Missing in Customer Configuration. The shared picker can find a customer by a combined substring query, but does not expose a mobile-only distinct suggestion list and is not attached to the admin search form.

**Missing Functionality or Logic:** No mobile prefix suggestion workflow exists for the configuration search experience.

**Required Improvement:** Add a mobile-only prefix query with distinct values, deterministic ordering, a result limit, and the same authentication/authorization policy as the current customer search API.

**Relevant Existing Code Location:** Legacy contract: `docs/module/existing_ssot/customers.md`, section 5. Current API: `app/api/customers/search/route.ts`; current picker query: `src/features/customers/queries.ts`.

**Priority / Impact:** Medium — important for operational users who identify customers by phone.

### 5. Company-name autocomplete

**Feature / Business Logic Name:** Company Name Suggestions.

**Existing System Behavior:** The legacy Company Name field provides autocomplete using `Company_Name.Contains(term)`, returning distinct company names. It is separate from the customer row picker.

**Current Next.js Status:** Missing in Customer Configuration. Company is only a field in the add/edit modal and a token in the unified list search; no company suggestion control exists.

**Missing Functionality or Logic:** Users cannot select distinct existing company values while searching or entering customer data.

**Required Improvement:** Add a company-name contains suggestion query with distinct values, deterministic ordering, and a safe result limit. Decide whether this belongs on the search form, the edit form, or both, and document the choice.

**Relevant Existing Code Location:** Legacy contract: `docs/module/existing_ssot/customers.md`, section 5. Current company field: `src/features/customers/CustomersClient.tsx:349`; current query module: `src/features/customers/queries.ts`.

**Priority / Impact:** Medium — useful for company-based lookup and consistent data entry.

### 6. Reset / clear-search workflow

**Feature / Business Logic Name:** Reset Customer Search.

**Existing System Behavior:** Reset posts to `CustomerManagement`, creates a fresh blank view model, clears submitted criteria, and removes results. The legacy initial route also renders a blank form and does not load records until Search.

**Current Next.js Status:** Missing as an explicit action. Search can be cleared through the input and Type can be changed to All, but there is no Reset control. The page initially loads the first paged customer list rather than a blank result state.

**Missing Functionality or Logic:** No one-click way to restore the initial state, and initial-load/empty-state behavior differs from the legacy workflow.

**Required Improvement:** Add a Reset action that removes customer query parameters, restores all search controls to defaults, and establishes an approved result-state policy: either preserve legacy blank-until-search behavior or explicitly retain the current initial paged listing. If preserving parity, do not issue the initial list query until Search is submitted.

**Relevant Existing Code Location:** Current query initialization: `app/(dashboard)/config/customers/page.tsx:8-19`; current query manipulation: `src/features/customers/CustomersClient.tsx:177-190` and `289-300`.

**Priority / Impact:** Medium — affects usability and makes repeated searches slower.

### 7. Legacy result-table information density

**Feature / Business Logic Name:** Direct Result-Row Customer Details.

**Existing System Behavior:** Each result row displays serial number, type, name, address, primary mobile, secondary mobile, email plus comments, DOB plus anniversary, company name, and edit/delete actions.

**Current Next.js Status:** Partially covered. The table displays Name, Type, primary mobile/email, Company, DOB, Anniversary, and actions. Address, Mobile 2, and Comments are only visible after opening the read-only view modal. There is no serial-number column.

**Missing Functionality or Logic:** The current listing no longer exposes all legacy row-level information at a glance, which changes scanning and comparison workflows.

**Required Improvement:** Add the omitted columns or obtain explicit approval for the compact-table/view-modal replacement. If adding columns, retain responsive behavior and nullable-value rendering; include a serial number that is stable within the current result page and clarify whether it is page-relative or global.

**Relevant Existing Code Location:** Current headers/row projection: `src/features/customers/CustomersClient.tsx:302-325`; current view modal: `src/features/customers/CustomersClient.tsx:365-396`.

**Priority / Impact:** Medium — affects daily customer review efficiency.

### 8. Quick-create picker refresh behavior

**Feature / Business Logic Name:** Shared Customer Master Cache/Listing Refresh After Quick Create.

**Existing System Behavior:** Legacy autocomplete and main screen are separate requests, so a newly saved customer becomes available on the next request/search. The current SSOT states quick creation is part of the shared picker behavior.

**Current Next.js Status:** The quick-create action writes successfully and returns a new ID, but `quickCreateCustomer` does not call `revalidatePath` or otherwise invalidate a customer cache. The picker selects the returned client-side object immediately, so the current picker selection works; other already-rendered customer lists or cached consumers may remain stale until refreshed by their own mechanism.

**Missing Functionality or Logic:** There is no explicit post-create cache invalidation/revalidation contract for all Customer consumers.

**Required Improvement:** Define and implement the approved invalidation behavior for quick creation (at minimum, revalidate the customer configuration path and any customer search/data cache used by operational pickers), while preserving immediate selection in the originating picker.

**Relevant Existing Code Location:** `src/features/customers/actions.ts:20-59`; comparison with revalidation in `src/features/customers/adminActions.ts:91-92` and `118-119`.

**Priority / Impact:** Medium — can produce stale customer search results after creation.

## Verified differences that are not missing functionality

These are real differences, but the current implementation already covers the underlying capability or deliberately strengthens it. They should not be added to the improvement backlog unless product approval requires legacy behavior exactly.

| Area | Legacy behavior | Current Next.js behavior | Assessment |
|---|---|---|---|
| Initial listing | Blank form/results until Search | Loads a descending `custId` paged list | Behavior change; addressed under Reset/initial-state gap. |
| Pagination | None | 25 rows/page with Prev/Next and total/page count | Enhancement, not a missing legacy feature. |
| Ordering | Not specified | Descending `custId` | Current deterministic enhancement. |
| Search matching | Separate AND criteria; mobile exact | One cross-field case-insensitive contains search plus Type | Covered as a search-contract gap above. |
| Email search | Not a legacy criterion | Included in unified search | Current additional behavior; not a missing feature. |
| Type values | Contact/Customer | New records Contact/Customer; edit can preserve legacy Individual | Current compatibility behavior. |
| Required contacts | Primary mobile required in browser | Mobile or email required, enforced client and server | Deliberate current business-rule change; stronger server boundary. |
| Validation | Mostly client-only: required type/name/mobile, email/date format | Shared client/server validation, lengths, exact 10-digit mobiles, duplicate secondary check, date age/order/future rules | Current enhancement, not a gap. |
| Duplicate detection | Exact database name + primary mobile; no normalization | Normalized name and normalized primary mobile/email fallback | Stronger current rule; confirm product acceptance because it can reject legacy-allowed duplicates. |
| Add/edit UI | Inline form; edit copies row into form | Modal; dirty-form discard confirmation; unchanged edit disabled | Current workflow redesign. |
| View | No separate view action; row already dense | Read-only detail modal | Current replacement for some row visibility. |
| Delete | Immediate, no confirmation | Confirmation dialog | Safety improvement. |
| Delete referential failure | Generic contact-system error | Specific related-record message for Prisma P2003 | Current improvement. |
| Authorization | `Customer_Management` on legacy actions; role 4 hides mutations but direct mutation calls are not independently blocked; autocomplete guards are absent | View route access; separate `Customer_Management_Write`; server actions independently authorize; picker search requires authenticated permitted route | Current security improvement. Do not reintroduce legacy authorization gaps. |
| API search | Three legacy autocomplete endpoints with no visible auth guard | Authenticated `/api/customers/search`, permitted for Customer or Feedback route, max 15 rows | Current API is a deliberate consolidated replacement, but it does not provide the three legacy suggestion contracts. |
| Transactions | Save/update wrapped in .NET `TransactionScope` | Single Prisma create/update/delete operation | No multi-table workflow currently requires a transaction; add one only if approved behavior expands beyond a single write. |
| Audit fields | Server sets created/updated timestamps and users | Server sets created/updated timestamps and authorized users | Covered. |
| State | `FK_State_ID` exists but legacy module neither displays nor writes it | Prisma field exists but current customer UI/actions do not use it | Not a gap relative to legacy. |
| Hard delete | Permanent delete | Prisma hard delete with foreign-key failure handling | Covered, with safer confirmation and clearer error. |

## Legacy defects intentionally excluded from required improvements

The legacy SSOT records two defects that should not be copied into Next.js unless explicitly requested:

- Legacy export checks `count < 0`, so its intended zero-result warning can never execute. A Next.js export should implement a correct, explicit empty-result policy.
- Legacy save-model exceptions are swallowed before the controller can inspect them, and the update path can null-dereference when an ID is absent. Next.js should retain its current structured error handling and add a specific not-found response if needed, rather than reproduce the defect.

## Approval boundary

This document is intentionally separate from `docs/module/ssot/customer.md`. No improvement listed here has been merged into the current SSOT, and the improvement document must remain until the user explicitly approves the scope and implementation. After approval, implement only the approved items, update the current SSOT with verified behavior, and then remove this file.
