# Today's Inquiry And Followup Report - Legacy vs Next.js Gap Analysis

## Comparison Basis

| Legacy SSOT | Current Next.js SSOT |
| --- | --- |
| `docs/module/existing_ssot/reportstoday.md` | `reportstoday.md` |

Legacy source route: `/Report/Todays_Inquiry_Followup_Report`  
Current route: `/reports/today`

This document records differences observed in source code. It does not authorize product-code changes. The two SSOT files remain separate until approval.

## Summary

The Next.js report preserves the core data source and central filter concept: it filters `FollowupInquiry.updatedDt`, uses a date range, supports an Updated By filter, and displays one row per history record. It does **not** yet provide full legacy functional parity. The highest-impact differences are a permission-key migration that may orphan existing grants, creator-only row security changing to creator-or-assignee access, no export, reduced report fields, different user-picker scope, and unpinned date/time-zone semantics.

## Gaps And Required Decisions

| Priority | Feature / business logic | Existing behavior | Current Next.js status | Required improvement | Relevant code |
| --- | --- | --- | --- | --- | --- |
| Resolved | Permission-function compatibility | Legacy menu and all actions require `Todays_Inquiry_Followup_Report`. | The route now accepts both `Today_Activity_Report` and the legacy permission, while the current name remains the only catalog entry. | Implemented with a route-level compatibility alias and regression test. Keep the alias until legacy grants have been migrated and audited. | Legacy `Menu.cshtml:127-130`, `ReportController.cs:488`; current `accessCatalog.ts`, `accessCatalog.test.ts` |
| Resolved | Restricted-user row security | Role id `4` retains rows only when parent `Inquiry.Created_By == login user`. | The report now identifies restricted users by role id `4` and applies a `created-only` inquiry predicate. The user filter remains hidden and ignored for restricted users. | Implemented. Add an integration test with a role-4 user, an assigned-but-not-created inquiry, and a supplied `userId` query parameter when report test infrastructure is added. | Legacy model lines 255-260; current `page.tsx`, `queries.ts`, `inquiryOwnership.ts` |
| Resolved | Excel export | Export button is shown after results; server re-runs the filtered query and generates Excel. | The report now has an Export action and an authorized server-generated `.xlsx` route. It re-runs the current date/user filters and applies role-4 creator-only scope. | Implemented. Its workbook currently mirrors the current compact Next.js table; remaining legacy field omissions are tracked separately below. | Legacy view lines 22-25, 95-100; `ReportController.cs:541-584`; current `api/reports/today/export/route.ts`, `TodayClient.tsx` |
| Resolved | Report field parity | Legacy table shows website, inquiry date, customer email, visited date, inquiry-created audit, and explicit follow-up date/remark, as well as budget and full car detail. | The table and workbook now show inquiry date, website, email, visited date, follow-up date, parent-inquiry created date/creator, history updated date/updater, budget, comments, and car interest. | Implemented. Legacy raw-vehicle fallback remains separately tracked below. | Legacy view lines 115-145, 156-224; current `queries.ts`, `TodayClient.tsx`, `api/reports/today/export/route.ts` |
| Resolved | Legacy vehicle data fallback | Legacy renders raw `Inquiry_Car_Details.Make/Model/Variant/Year` for every vehicle. | Car labels now resolve each make, model, and variant independently from the normalized relation and then the matching legacy field. | Implemented. `Sub_Variant` remains excluded because the legacy report did not render it. | Legacy model lines 269-295; current `queries.ts`; Prisma schema lines 525-541 |
| Resolved | Updated By picker scope | Dropdown contains users with `Role_ID >= current role ID`, with no active-status filter. | The picker now receives the current role ID and returns users with role ID greater than or equal to it, including inactive accounts. | Implemented. The dropdown continues to prefer display name over username as a presentation modernization. | Legacy model lines 54-86; current `page.tsx`, `queries.ts` |
| Resolved | Calendar/time-zone contract | Legacy uses SQL `TruncateTime` and `DateTime.Now` in the application/server's local calendar. | Defaults, reset, rendering, export dates, and query bounds now use a shared `Asia/Kolkata` helper. A selected India date maps to `00:00:00.000+05:30` through `23:59:59.999+05:30`. | Implemented with direct boundary tests. | Legacy model lines 42-46, 103-105; current `date.ts`, `date.test.ts`, `page.tsx`, `queries.ts`, `TodayClient.tsx`, export route |
| Resolved | Search workflow and initial state | Initial GET is blank. Search explicitly posts. Reset returns blank form with fresh default dates. | Initial load and Reset now show filters without a result table. Search explicitly loads data through a URL marker, and Export is available only after a non-empty search. | Implemented. Today resets filters to the current India date without loading results. | Legacy view lines 11-25, 42-99; current `page.tsx`, `TodayClient.tsx` |
| Resolved | Date input validation | Legacy fields are picker-controlled read-only text fields, but backend errors are caught and converted to TempData error. No range-order rule is present. | Searched date filters are now validated as real date keys with `fromDate <= toDate`. Invalid page requests show a focused inline error and do not query; export returns `400`. | Implemented with malformed and reversed-date unit coverage. | Legacy `ReportController.cs:520-524`; current `date.ts`, `date.test.ts`, `page.tsx`, export route |
| Resolved | Result feedback | Legacy shows a no-record warning after Search and a generic error message after a caught search exception. | A searched empty result now says `No matching follow-up activities found.` Query failures are caught at the report boundary and shown inline while the table and Export action remain hidden. | Implemented. | Legacy `ReportController.cs:513-524`; current `page.tsx`, `TodayClient.tsx` |
| Resolved | User query normalization | Legacy model binds an integer field; no manual parsing code exists. | Page and export now accept only positive integer `userId` values. Invalid values normalize to no user filter before reaching Prisma. | Implemented with direct parser coverage. | Current `filters.ts`, `filters.test.ts`, `page.tsx`, export route |
| Resolved | Result ordering | Legacy query has no explicit order. | Rows now use an intentional, deterministic newest-update-first order, with `pkFollowupId DESC` breaking same-timestamp ties. | Implemented as a stability improvement; it does not claim to reproduce SQL's unspecified legacy order. | Legacy model lines 97-141; current `queries.ts` |
| Resolved | Presentation format | Legacy groups multiple values in dense cells and uses `dd/MM/yyyy`; visitor date missing value is `NA`. | The current table now uses the same grouped column layout, serial number, `dd/MM/yyyy` dates in the India business time zone, and `NA` for a missing visited date. Badges, truncation/tooltips, and INR budget formatting remain intentional readability improvements. | Implemented with accessibility and readability improvements retained. | Legacy view; current `TodayClient.tsx` |

## Confirmed Parity

- The report is read-only.
- Both versions select from follow-up history joined to parent inquiries.
- Both filter on history-row `UpdatedDt` / `Updated_Dt`, inclusive by selected date range.
- Both support an optional history-row Updated By filter for unrestricted users.
- Both keep multiple qualifying history rows for the same inquiry as distinct report rows.
- Both show follow-up-history classification, status, sub-status, comments, updater, customer/mobile, budget, and vehicle information.

## Items Not Gaps

- Legacy has no report pagination, free-text search, table sort control, row edit control, or drill-through link. Their absence in Next.js is not a legacy-parity gap.
- Current descending `updatedDt` sort is a deterministic improvement over legacy's unspecified query order.

## Approval Gate

Do not merge this file into `reportstoday.md`, delete it, or implement any row-security, permission, export, or presentation change until the owner approves the desired scope. At approval time, retain the current SSOT as an implementation record and update it alongside the approved code changes.
