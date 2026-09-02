# Follow-up Module - Open Discussion Backlog
## Status: Completed improvements merged into `followup.md` on 2026-09-02

**Module:** `followup`
**Current-state SSOT:** `D:\projects\ExcelCarsNextJs\docs\module\ssot\followup.md`
**Legacy reference:** `D:\projects\ExcelCarsNextJs\docs\module\existing_ssot\followup.md`

## Purpose
This document is an open-discussion backlog only. Completed Follow-up improvements are documented in `followup.md`; keep this file for business decisions and future operator experience work.

## Completed And Merged
- function-based route, API, action, and ownership access control
- creator-based restricted-user visibility in the queue
- full multi-car visibility in the queue and export
- normalized `followupInquiry.followupDate` semantics across Inquiry and Follow-up writes
- shared client/server validation for contact outcome, comments, status, classification, `OTHER` sub-status, and next follow-up date
- friendly follow-up outcome/status workflow, including `Open`, `FollowUp`, and `Closed`
- explicit `OTHER` sub-status with stored custom text
- controlled source filtering through Inquiry Source Master, including `Unknown` for blank historic websites
- text and normalized Make/Model/Variant filtering for historic and current vehicle rows
- full follow-up history view alongside the fast recent-history log modal
- export expanded by inquiry-car and history rows, with accurate creator name and creator ID columns

## Open For Discussion

### 1. Dashboard follow-up drill-downs
- decide which legacy buckets still matter: all leads, fresh leads, appointment fixed, follow-up today, pending, upcoming, and closed
- add matching queue presets and `Own` variants only after dashboard requirements are agreed

### 2. Unified sub-status governance
- Follow-up uses approved friendly options and `OTHER`; Inquiry edit uses saved-value suggestions
- decide whether both modules should use a shared controlled sub-status master

### 3. Customer-name autocomplete
- the dedicated customer-name filter is available now
- decide whether operators need legacy-style autocomplete selection instead of free-text matching

### 4. Operator workflow polish
- decide whether the queue needs a standalone car-detail popup
- decide whether pagination at 25 remains appropriate or needs an all-rows/larger-page option
- decide whether a saved-success banner or toast is needed after logging follow-up
- decide whether Inquiry should expose more direct entry links into Follow-up

### 5. Dashboard/reporting and database-backed tests
- implement dashboard metrics only after the dashboard phase is approved
- add database-backed tests for queue filters, ownership, history append, export shape, and action persistence

## SSOT Rule
When an open item is approved and implemented, document the final business rule in `followup.md` and remove it from this discussion backlog.
