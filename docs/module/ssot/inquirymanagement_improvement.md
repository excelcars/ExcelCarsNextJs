# Inquiry Management - Open Discussion Backlog
## Status: Completed improvements are documented in the current, re-verified `inquirymanagement.md` SSOT as of 2026-09-21

**Module:** `inquiry`  
**Current-state SSOT:** `D:\projects\ExcelCarsNextJs\docs\module\ssot\inquirymanagement.md`
**Legacy reference:** `D:\projects\ExcelCarsNextJs\docs\module\existing_ssot\inquirymanagement.md`

## Purpose
This document is no longer a completion tracker. Completed Inquiry Management improvements are now part of the main SSOT. Keep this file only for business decisions and future work that remain open for discussion.

## Completed And Merged
- multi-vehicle inquiry capture, listing, export, and persistence
- follow-up history and normalized follow-up semantics
- customer auto-link and auto-create policy
- duplicate inquiry warning by normalized mobile, linked customer, and open inquiry overlap
- explicit `Save Only` and `Save & Send Matching` behavior
- durable inquiry-to-inventory links and inventory-backed workflow states
- durable inquiry email, vehicle email, audit, and event history
- inquiry lifecycle: `Open`, `FollowUp`, `Closed`, including database protection
- controlled Inquiry Source Master, legacy mapping, `Unknown` treatment for blank historic websites, and permission-protected CRUD administration
- final legacy verification for Inquiry and Follow-up business logic

## Open For Discussion

### 1. Richer inventory matching workspace
- explain why a vehicle matched a requirement
- surface already emailed, shortlisted, rejected, visited, and booked state before an operator acts
- decide whether a dedicated matching workspace is worthwhile beyond the existing inquiry detail workflow

### 2. Follow-up-first quick workspace
- decide whether today and overdue follow-ups need a faster action surface than the current edit/follow-up flow
- ensure any quick action continues writing normal `followupInquiry` and event-history rows

### 3. Dashboard and reporting outputs
- inquiries by source, classification, and assigned user
- follow-up aging, overdue, and completion reporting
- inquiry-to-inventory and inquiry-to-booking conversion
- email engagement reporting
- dashboard drill-down presets and legacy Own-count behavior

### 4. Email media strategy
- choose tracked links only, inline images, brochure/PDF, or a controlled combination
- define size limits and default behavior before adding attachments

### 5. Database-backed automated tests
- multi-vehicle create/update/remove
- customer auto-link/auto-create and duplicate detection
- follow-up history and event append behavior
- inventory link state and email persistence
- Source Master CRUD and delete protection

### 6. Duplicate inquiry merge workflow
- current duplicate warnings intentionally allow a genuine new inquiry
- decide whether users need a deliberate merge/link workflow later

### 7. Source Master browser import/export
- current controlled source import and historical backfill are command-based
- decide whether business users need a browser-based import/export workflow

## SSOT Rule
When an open item is approved and implemented, move its final business rule and actual behavior into `inquirymanagement.md`, then remove it from this discussion backlog.
