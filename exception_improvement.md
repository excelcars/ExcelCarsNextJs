# Exception Log - Legacy-to-Next.js Gap Analysis

## Status: Review required; do not merge into `exception.md` yet

**Compared sources:**
- Legacy SSOT: `docs/module/existing_ssot/exception.md`
- Current Next.js SSOT: `exception.md`

The two implementations address the same persisted exception-log concept but intentionally differ in several places. Items below distinguish missing parity from existing Next.js improvements; the legacy date-window defect should not be copied without a product decision.

| Priority | Feature / business logic | Existing system behavior | Current Next.js status | Missing functionality or logic / required improvement | Relevant source location |
| --- | --- | --- | --- | --- | --- |
| Done | Legacy permission migration | Menu and actions name `System_Exception_Report`. | Route now accepts `System_Exception_Report` alongside the canonical `Exception_Log_Report`; the sidebar still has one Exception Log item. | Implemented with an access-catalog compatibility alias and focused regression test. No role-data migration is required for route access. | Legacy `ReportController.cs`, menus; Next `src/lib/access/accessCatalog.ts`, `accessCatalog.test.ts` |
| Done | Error detail visibility | Table displays full `Error` (stack trace/inner exception). | `error` is now displayed as an Error column. | Implemented as a one-line truncated value with its full stored text in the cell's HTML `title`, preserving readable rows while making legacy diagnostic data available to authorized viewers. | Legacy `Views/Report/ExceptionLogging.cshtml`; Next `ExceptionClient.tsx` |
| Done | Explicit error-log access policy | Legacy report's declared permission is report-specific, though its custom function enforcement is commented out. | Next uses the report-specific route grant and returns all matching rows/users to authorized users. | Approved policy: every active user with `Exception_Log_Report` or `System_Exception_Report` can view all exception rows and every field exposed by this report, including Error detail. No ownership or role-name restriction applies. | Legacy `AuthorizeFilter.cs`; Next `accessControl.ts`, `queries.ts`, `accessCatalog.ts` |
| Done | Query failure UX | Legacy search has no local catch, so failures follow MVC error handling. | Route-level failure handling is now present. | Added a safe Next.js `error.tsx` boundary with a generic message and `reset()` retry. It does not render raw query/database errors or diagnostic detail. | Legacy `ReportController.cs`; Next `app/(dashboard)/reports/exception/error.tsx` |
| Done | Input/query validation | Legacy marks date/user mandatory but has no robust implementation. | Exception filters are now normalized before query execution. | Implemented real `YYYY-MM-DD` validation, range-order validation, positive integer user/page handling, a user-visible validation alert, and no database query for invalid filter state. | Legacy view/model; Next `rules.ts`, `rules.test.ts`, `page.tsx`, `queries.ts`, `ExceptionClient.tsx` |
| Done | Business time zone | Legacy uses server `DateTime` values and its query window is server-time based. | Filtering and display are now deterministic in `Asia/Kolkata`. | Implemented inclusive Asia/Kolkata start/end-of-day query bounds and explicit time-zone display formatting, with boundary and formatting regression tests. | Legacy `ExceptionLogging.cs`; Next `date.ts`, `date.test.ts`, `queries.ts`, `ExceptionClient.tsx` |
| Done | Selected-date workflow | Legacy starts blank, defaults one Login Date, and requires Search. | Next loads all logs by default with optional From/To filters and immediate URL updates. | Approved divergence: retain the current immediate, URL-backed, paginated workflow. Do not add a blank initial state, default-selected day, or Search/Apply button. | Legacy view/controller; Next page/client |
| Done | Legacy date predicate | Legacy includes a nonstandard window from prior-day 23:59:59 through next-day 00:00:00 for a selected date. | Next implements a conventional optional inclusive `Asia/Kolkata` range. | Approved divergence: retain the corrected current date-range semantics. The legacy boundary defect is intentionally not reproduced. | Legacy `ExceptionLogging.cs`; Next `date.ts`, `queries.ts` |
| Done | Sort contract | Legacy sorts by `Create_Dt DESC`; displayed `DateTime` may differ. | Next sorts by `datetime DESC`, the displayed event timestamp. | Approved divergence: retain current `datetime DESC` ordering so the list order matches the timestamp users see. | Legacy `ExceptionLogging.cs`; Next `queries.ts` |
| Done | User picker contents | Legacy lists all users by raw username, no order/status filter. | Next lists active users ordered by id and prefers display name. | Approved divergence: restrict the picker to `UserTable.status = Active`; inactive/historical users remain visible only through stored names on returned log rows. | Legacy `ExceptionLogging.cs`; Next `queries.ts` |
| Done | Displayed diagnostic fields | Legacy displays serial number, URL, Code, Message, Error, and Source. It stores but does not display IP/session/audit fields. | Next displays date/user, URL, Code, Message, Error, and Source; serial/IP/session/audit fields are absent. | Approved field scope: do not add serial number, IP address, session ID, or create/update audit fields. Retain the current focused diagnostic display. | Legacy view; Next `ExceptionClient.tsx`, Prisma schema |
| Done | Pagination and result scale | Legacy returns all matching records with no paging. | Next uses 25-row pages, total count, and clamps out-of-range pages to the last available page. | Approved improvement: retain fixed-size server-side pagination. No page-size control or export was requested. | Legacy model; Next `rules.ts`, `rules.test.ts`, `queries.ts`, `ExceptionClient.tsx` |
| Done | No-result feedback | Legacy posts a shared `Record_Not_found` warning after an empty search. | Next uses explicit table empty-state text. | A valid empty query now says **No exception logs match the current filters**. An invalid-filter state directs the user to correct the filters, keeping validation distinct from no results. | Legacy controller; Next `ExceptionClient.tsx` |
| Done | Exception write pipeline | Legacy helper records URL, IP, session, user fallback, source, stack/inner-exception, message, and audit fields. | This report does not implement a Next.js exception-capture/writer, and the application has no centralized replacement. | Approved scope decision: do not implement or integrate a centralized exception writer as part of Exception Log report work. Existing application logging behavior remains unchanged. | Legacy `ApModel/Model/Exception/Exceptioncatch.cs`; Next has no corresponding report-feature writer |
| P3 | Automated coverage | Neither source provides focused report tests. | No exception-report tests were found. | Add unit tests for query normalization/bounds/paging and integration tests for access, URL filtering, visible fields, empty/error states, and the approved migration policy. | Legacy/Next report source |

## Recommended approval sequence

1. Permission compatibility is implemented and covered by a focused catalog regression test.
2. Decide the data-exposure policy and implement P1 Error visibility/authorization/validation/time-zone requirements together.
3. Approve intended date and initial-load semantics rather than reproducing the legacy query defect.
4. Treat pagination as retained improvement; add tests and out-of-range handling.
5. Decide separately whether the legacy exception-capture helper must be replaced application-wide. That work is broader than this read-only report.

## Non-parity that is already an improvement

- Server-side pagination and total count avoid rendering every matching exception at once.
- Optional date range is more flexible than one legacy date.
- URL-backed filters support refreshable/shareable report state.
- Next route access performs active-user and role-grant checks; legacy's custom database-function check is commented out.

These are not instructions to preserve every implementation detail. They need approval alongside the prioritized gaps above.
