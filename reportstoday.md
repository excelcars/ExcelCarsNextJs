# SSOT - Today's Activity Report (Current Next.js)

## Status: Implemented current-state behavior documented

**Module:** `/reports/today`  
**Project:** `ExcelCarsNextJs`  
**Source of truth:**
- `app/(dashboard)/reports/today/page.tsx`
- `src/features/reports/today/queries.ts`
- `src/features/reports/today/TodayClient.tsx`
- `src/lib/access/accessCatalog.ts`
- `src/lib/access/accessControl.ts`
- `src/lib/access/inquiryOwnership.ts`
- `app/(dashboard)/layout.tsx`
- `middleware.ts`
- `prisma/schema.prisma`

## 1. Purpose And Scope

This authenticated, read-only report renders follow-up-history activity at `/reports/today`. It reads `followup_inquiry` rows by `updatedDt`, joins parent inquiry/customer/vehicle/user data through Prisma relations, and presents a legacy-compatible grouped table.

Current scope includes:
- URL-backed From, To, and Updated By filters;
- a Today reset button;
- row display for follow-up-history activity and selected parent inquiry context;
- route-specific access check; and
- legacy-compatible row restriction for users whose `roleId` is `4`.

Current scope excludes:
- pagination, total count beyond loaded rows, sort controls, text search, row actions, drill-through, and saved filters;
- client-side filtering without an explicit Search action.

## 2. Access And Navigation

`Layout` includes a Reports child named `Today's Activity` that links to `/reports/today`. It is visible only when the user has that accessible route.

The access catalog's canonical permission for `/reports/today` is `Today_Activity_Report`. Route access also accepts the legacy `Todays_Inquiry_Followup_Report` permission, preserving migrated legacy role grants without exposing a duplicate item in the configurable catalog. The dashboard layout requires an authenticated session; middleware redirects unauthenticated non-public routes to `/login`. The page then calls `canCurrentUserAccessRoute('/reports/today')`; an authenticated but unauthorized user is redirected to `/dashboard`.

`GET /api/reports/today/export` returns an authorized `.xlsx` export. The page itself calls Prisma directly.

## 3. URL And Initial Load Contract

The page accepts:

| Parameter | Type | Default |
| --- | --- | --- |
| `fromDate` | date-only string | current `Asia/Kolkata` calendar date |
| `toDate` | date-only string | same as From |
| `userId` | numeric string | no user filter |
| `search` | literal `1` | omitted; no query runs |

Initial load and Reset render the default `Asia/Kolkata` date filters with no result table. The report query executes only when `search=1` is present. Filters are locally editable until Search pushes the filtered URL with that marker. Today returns to the current India date with no selected user and no result table. Export appears only after a non-empty searched result set.

## 4. Data Query And Row Shape

`listTodayFollowups` converts the submitted date strings to explicit `Asia/Kolkata` start/end boundaries (`00:00:00.000+05:30` through `23:59:59.999+05:30`) and queries `prisma.followupInquiry.findMany` with:

```text
updatedDt >= from AND updatedDt <= to
```

Rows are ordered deterministically by `updatedDt DESC`, then `pkFollowupId DESC` when timestamps match.

The query orders by `updatedDt DESC`, then `pkFollowupId DESC`, and includes:
- follow-up history fields: id, follow-up date, status, sub-status, classification, comments, updated date, and updater;
- parent inquiry: inquiry number, inquiry date, legacy customer name/mobile/email/budget, creator, linked customer, and all inquiry-car records; and
- each car's normalized variant, make, and model relations plus legacy vehicle fields for fallback.

The returned client row shape is:
- `pkFollowupId`, `followupDate`, `followupStatus`, `followupSubStatus`, `followupClassification`, `comments`;
- `updatedDt`, `updatedByName`;
- `inquiryNo`, `dateOfInquiry`, `website`, `customerName`, `mobileno`, `email`, `budgetOfCustomer`, `visitedDateOfCustomer`, `createdDt`, `createdByName`; and
- `carDetails`, a comma-separated make/model/variant/year label.

Customer display falls back from the linked customer name to `customerNameLegacy`. Updater and creator display fall back from `displayName` to `userName`. Each car-detail make, model, and variant resolves independently from its normalized relation and then its matching legacy field. Placeholder legacy values such as `null`, `na`, and `n/a` are not displayed.

## 5. User Filter And Row Restriction

`getUsersForFilter(currentRoleId)` returns `UserTable` records whose `roleId >= currentRoleId`, including inactive users, ordered by ascending user id. This preserves the legacy role-hierarchy scope. The dropdown displays `displayName` or `userName`; legacy used username only.

For an authenticated user whose `roleId === 4`, the server:
- hides the Updated By selector;
- ignores any supplied `userId`; and
- adds `inquiry: buildInquiryOwnershipWhere(currentUserId, 'created-only')` to the query.

This predicate allows only parent inquiries whose `createdBy` is the current user. Assigned inquiries are not included merely because they are assigned to that user, matching the legacy role-4 rule.

## 6. User Interface

The page header is `Today's Inquiry & Follow-up`. Its subtitle shows the number of loaded follow-up activities and, for restricted users, `showing your inquiries only`.

Visible filters are:
- From date;
- To date;
- Updated By for non-restricted users; and
- Today reset button.

The table has a serial number and the legacy-compatible grouped columns: Inquiry (number, inquiry date, website), Customer Details (name, mobile, email), Car Details, Budget (budget and visited date), Follow-up State (classification, status, sub-status), Follow-up Detail (date and comments), Created Audit (date and user), and Updated Audit (date and user).

Classification and status use the shared `Badge` component. Missing values use `—`, except a missing visited date which displays `NA`, matching legacy behavior. Sub-status and comments are truncated with HTML title attributes containing their full value. Dates render in `Asia/Kolkata` as `dd/MM/yyyy`; budget uses INR locale formatting. A searched empty result uses the report-specific message `No matching follow-up activities found.`

The header has an Export action. It requests the server export using the current From, To, and Updated By URL filters, downloads `today-inquiry-followup-report.xlsx`, disables while in progress, and displays an inline error if the request fails. The workbook mirrors the table's displayed context/audit fields. There are no links, menus, row buttons, forms, mutation actions, sorting affordances, or paging controls.

## 7. Error Handling And Constraints

- `userId` is accepted only as a positive integer. Empty, zero, negative, decimal, non-numeric, and unsafe values normalize to no user filter.
- Searched date filters must be real `YYYY-MM-DD` values and From must not be after To. Invalid ranges do not query; the page highlights both date inputs and displays an inline error. Export applies the same check and returns `400 Bad Request` for invalid ranges.
- A searched query with no rows displays a report-specific empty state. Query/database failures are caught at the report boundary and displayed inline without rendering the table or Export action.
- Export returns `401` for no session, `403` without report access, and a generic `500` JSON error when workbook generation fails. The client renders an inline export-error message.
- All matching rows are loaded into one response with no pagination or upper bound.
- Date defaults, reset behavior, rendering, export formatting, and query bounds use the explicit `Asia/Kolkata` business time zone.
- The report has no tests under `src/features/reports/today` or a dedicated test suite.

## 8. Write And Cache Interaction

This report does not write data. Inquiry actions call `revalidatePath('/reports/today')` after certain inquiry updates/assignments, so a subsequent render can pick up current records. Export re-runs the query server-side with its received URL filters and applies the same role-4 restriction as the page.

## 9. Tests Required

- unauthenticated access redirects to login and unauthorized access redirects to dashboard;
- the catalog permission maps the report route correctly;
- default and explicit date ranges filter `FollowupInquiry.updatedDt` correctly at both boundaries;
- userId filters by follow-up-history updater;
- the report query applies the date range and updater filter, while role-4 creator ownership takes precedence over a supplied updater filter;
- inquiry/customer/user/vehicle projection has the documented fallback behavior;
- restricted users do not see the user filter and cannot bypass their ownership predicate through query parameters;
- role-4 ownership semantics are explicitly tested as created-only and cannot be bypassed with a `userId` query parameter;
- empty searched data renders the report-specific no-match message, and query failures render an inline error without a table or Export action;
- date behavior and `dd/MM/yyyy` rendering are tested in the intended business time zone;
- report ordering is tested as newest update first with a stable primary-key tie-breaker;
- legacy-only vehicle fields are tested or deliberately excluded.
- export returns an `.xlsx` workbook containing exactly the filtered report rows and respects role-4 creator-only scope.

## 10. SSOT Rule

This file is an actual-current-state description, not an assertion of legacy equivalence. Changes to the route permission, filters, ownership predicate, date semantics, result fields, or export/pagination behavior must update this SSOT and `reportstoday_improvement.md` until the legacy parity review is approved.
