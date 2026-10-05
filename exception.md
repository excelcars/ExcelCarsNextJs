# SSOT - Exception Log (Current Next.js)

## Status: Implemented current-state behavior documented

**Module:** `/reports/exception`  
**Project:** `ExcelCarsNextJs`  
**Source of truth:**
- `app/(dashboard)/reports/exception/page.tsx`
- `src/features/reports/exception/queries.ts`
- `src/features/reports/exception/ExceptionClient.tsx`
- `src/lib/access/accessCatalog.ts`
- `src/lib/access/accessControl.ts`
- `app/(dashboard)/layout.tsx`
- `middleware.ts`
- `prisma/schema.prisma`

## 1. Purpose and scope

This authenticated, read-only report renders persisted `exception_logging` records at `/reports/exception`. It supports URL-backed date and user filters and server-side paging. It does not create, modify, acknowledge, delete, export, or drill into exception records, and this feature contains no exception-capture/writer implementation.

## 2. Access and navigation

The dashboard Layout has a Reports child named **Exception Log** linking to `/reports/exception`; it is rendered only when that route is in the current profile's accessible routes. The catalog's canonical configurable permission is `Exception_Log_Report`, and route access also accepts the migrated legacy `System_Exception_Report` permission. The legacy name does not create a duplicate catalog item.

Middleware redirects unauthenticated dashboard routes to `/login`. The dashboard layout also requires an authenticated session. The page then calls `canCurrentUserAccessRoute('/reports/exception')`; it loads the current active user's role grants from `AccessFunctionRole` and redirects an authenticated user without an accepted exception-report grant to `/dashboard`.

The approved data-access policy is **all details for every authorized report user**: any active user holding either accepted route grant can view all matching exception rows and all fields exposed by this report, including Error details. The route has no ownership, role-name, user-filter, or redaction restriction beyond the report permission itself.

There is no report-specific API route: the server component calls Prisma directly.

## 3. URL and initial-load contract

The page accepts these query parameters:

| Parameter | Parsing and default |
| --- | --- |
| `fromDate` | optional valid `YYYY-MM-DD`; absent becomes `''` (no lower date bound) |
| `toDate` | optional valid `YYYY-MM-DD`; absent becomes `''` (no upper date bound) |
| `userId` | positive-integer string when supplied; otherwise `null` (no user filter) |
| `page` | positive integer; invalid/missing values become `1` |

The approved workflow queries immediately on every valid render. A direct load with no filters therefore retrieves the first 25 exception rows across all dates and users. Filter changes immediately push a new `/reports/exception?...` URL; there is no Search/Apply submit button. Each filter change forces `page=1`; pager interactions supply the requested page. **Clear filters** appears whenever any date or user filter is present and removes all three filters while returning to page one. The legacy blank initial screen, default-selected day, and explicit Search action are intentionally not retained. Invalid dates, reversed date ranges, and invalid user ids do not reach Prisma: the page shows a validation message and an empty table until filters are cleared or corrected.

## 4. Data query and pagination

`listExceptions` builds a Prisma `ExceptionLoggingWhereInput`:

- a supplied `fromDate` becomes `datetime >=` the start of that date in `Asia/Kolkata` (`00:00:00.000+05:30`);
- a supplied `toDate` becomes `datetime <=` the end of that date in `Asia/Kolkata` (`23:59:59.999+05:30`);
- a truthy numeric `userId` becomes `userId = userId`; and
- the two Prisma operations run concurrently: `findMany` and `count` with the same predicate.

Rows are ordered by stored `datetime DESC`, the same timestamp shown to the user, and limited to `PAGE_SIZE = 25`. The query counts matching records first, calculates `pageCount = max(1, ceil(total / 25))`, clamps the requested page into that range, then loads the resolved page. An overlarge page therefore returns the last page rather than an empty result beside a positive total. The legacy `createDt DESC` order is intentionally not retained because it can differ from the visible event time.

The approved date semantics are this conventional inclusive `Asia/Kolkata` range. The legacy report's anomalous prior-day `23:59:59` through next-day-midnight window is intentionally not reproduced.

The Prisma model maps directly to `exception_logging`: `loggins_id`, session id, user id/name, URL, code, message, error, datetime, source, IP address, and create/update audit fields. The query fetches complete model rows but the client receives and renders only its declared subset.

## 5. User filter

`getUsersForFilter()` reads only `UserTable` rows whose `status` is exactly `Active`, selects `userId`, `displayName`, and `userName`, and sorts ascending by `userId`. It has no role-hierarchy or report-permission filter. The dropdown has **All Users** plus each active user, displaying `displayName` when present and otherwise `userName`. Inactive/historical users remain represented in existing exception rows through their stored `userName`, but cannot be selected as a filter value.

After server-side normalization, no user id results in no user predicate and a supplied positive integer adds an exact `userId` predicate. Invalid, zero, negative, fractional, and non-numeric ids are rejected before the query. The route does not separately verify that a selected active user still exists; an unmatched valid id simply produces no matching rows.

## 6. User interface and rendered data

The page header is **Exception Log** and its subtitle is the formatted total matching count: `N logged exceptions`.

Visible controls are From date, To date, User, and conditional Clear filters. The table uses the shared `Table` component. A valid query with no rows says **No exception logs match the current filters**; an invalid-filter state instead directs the user to correct filters above. It renders these columns:

| Column | Field and presentation |
| --- | --- |
| Date/Time | `datetime`, formatted in `Asia/Kolkata` with `en-IN` locale; null shows `—` |
| User | stored `userName`; null shows `—` |
| Code | `code`; null shows `—` |
| Message | `message`; null shows `—`, truncates visually, full text in HTML `title` |
| Error | `error`; null shows `—`, truncates visually, full text in HTML `title` |
| Source | `source`; null shows `—` |
| URL | `url`; null shows `—`, truncates visually, full text in HTML `title` |

When more than one page exists, the page shows `Page X of Y` and Previous/Next buttons with disabled boundary states. The approved field scope excludes serial-number, IP-address, session, and create/update audit columns. There are also no links, sort controls, text search, loading indicator, bulk action, or detail view. A route-level error boundary shows a safe **Unable to load the exception log** message and **Try again** button for rendering/query failures; it deliberately does not expose the underlying error content.

## 7. Validation, error handling, and constraints

- Dates are validated as real `YYYY-MM-DD` dates and a From date after To is rejected before Prisma execution. User ids must be positive integer strings, and page values normalize to a positive integer.
- Date filtering and display are explicitly pinned to the organization time zone, `Asia/Kolkata`. A date range includes the complete local calendar day from `00:00:00.000+05:30` through `23:59:59.999+05:30`.
- Invalid filters render an alert and no result query is run; Clear filters restores a valid unfiltered state.
- Query/database failures are caught by the route-level `error.tsx` boundary, which presents a generic recovery message and `reset()` retry. The raw error/digest is not rendered to the user.
- All matching rows are counted, but only 25 data rows are loaded per response. No caching, revalidation, report API endpoint, or report test suite exists for this feature.

## 8. Write and cache interaction

This route is read-only. The source has no exception-write route/helper and no `revalidatePath('/reports/exception')` call. The application currently has no centralized Next.js writer for `exception_logging`; exception capture remains explicitly out of scope for this report work. Existing `exception_logging` data may originate from other application code or migration data.

## 9. Tests required

- unauthenticated access redirects to login and unauthorized access redirects to dashboard;
- both `Exception_Log_Report` and `System_Exception_Report` grants expose and authorize the route without creating a duplicate catalog item;
- unfiltered, date-boundary, and user-filtered results use the documented predicates;
- date/time behavior is tested at `Asia/Kolkata` boundaries and rendering;
- every 25th/26th matching row, page-boundary control, and out-of-range-page clamp is correct;
- malformed/reversed dates, invalid user ids, and zero/negative/decimal page values are normalized or rejected before query execution;
- all seven rendered fields, truncation titles, and null fallbacks are correct;
- omission of serial, IP, session, and audit fields is intentional; and
- empty and query-failure states have intentional user-visible outcomes, including a safe retry screen.

## 10. SSOT rule

This document describes actual current implementation, not legacy equivalence. Approved changes must update this file and remove `exception_improvement.md` only after the user directs that merge.
