# SSOT - Inquiry Management Improvements
## Status: Completion tracker for current Next.js module, reviewed against legacy on 2026-09-01

**Module:** `inquiry`  
**Project:** `ExcelCarsNextJs`  
**Base SSOT:** `D:\projects\ExcelCarsNextJs\docs\module\ssot\inquirymanagement.md`  
**Legacy reference:** `D:\projects\ExcelCarsNextJs\docs\module\existing_ssot\inquirymanagement.md`

## 1. Purpose
This document defines the improvement scope for the current Next.js Inquiry Management module and tracks what is already done vs still pending.

It exists to:
- close important behavior gaps between legacy `.NET Admin/InquiryManagement` and the current Next.js module
- separate durable business rules from temporary implementation shortcuts
- identify which improvements are required for parity, data quality, and maintainability
- provide an ordered direction for future implementation work

## 2. Current Completion Snapshot
Done:
- multi-vehicle inquiry support in UI and persistence
- follow-up history append behavior through `followupInquiry`
- duplicate warning using normalized mobile, linked customer, and open inquiry overlap
- customer auto-create / auto-link policy during inquiry save
- explicit `Save Only` vs `Save & Send Matching`
- persistent inquiry-to-inventory links with currently used states `matched` and `emailed`
- inquiry detail now shows follow-up timeline and linked inventory history
- durable inquiry email attempt history in inquiry detail
- public vehicle email links work without dashboard login
- inquiry listing layout moved closer to legacy grouped columns
- inquiry export moved closer to legacy row format
- DB-level unique protection for `inquiry_no`
- inventory workflow states are stored only for vehicles that exist in inventory
- inquiry lifecycle is normalized to `Open`, `FollowUp`, and `Closed`
- durable inquiry audit/event logging is available
- controlled Source Master, legacy source mapping, exact source filters, and an unmapped legacy bucket are available
- final legacy Inquiry and Follow-up verification pass completed on 2026-09-01

Partial:
- inventory matching workspace is present but not yet rich enough for operator decisions
- automated coverage now protects validation, source-master rules, public email links, and text vehicle filters; database-backed workflow tests are still needed
- docs are aligned to this implementation pass; dashboard reporting closure remains a later phase

Pending:
- reporting outputs
- final email media strategy
- database-backed automated tests for create/update/email/link persistence
- optional Source Master administration UI

## 3. Improvement Themes
The current module is functional, but several structural improvements still remain. The main themes are:

- restore missing business capabilities where they are still required
- improve data modeling so inquiry workflow is durable and auditable
- reduce coupling between inquiry UI behavior and implicit side effects
- normalize inquiry-to-vehicle and inquiry-to-customer relationships
- make the module easier to report on, extend, and test

## 4. Required Product Gaps To Address

### 4.1 Multi-vehicle inquiry support
Current state:
- done in current Next.js code
- one inquiry now supports multiple `inquiryCarDetails` rows

Legacy behavior:
- one inquiry could hold multiple vehicle-interest rows

Recommended improvement:
- keep this behavior stable
- improve only if row-level diff or reorder persistence is later needed

Why this matters:
- this is one of the biggest behavioral differences from the old system
- it reflects how sales teams capture a single customer’s interest across several vehicles
- it improves future inventory matching and customer follow-up relevance

### 4.2 Durable follow-up history
Current state:
- partially complete
- current inquiry saves do append `followupInquiry`
- current inquiry row still also carries the latest summary state

Legacy behavior:
- `Followup_Inquiry` rows were appended when follow-up date existed

Recommended improvement:
- keep current append behavior
- ensure reporting and follow-up screens consistently use history where appropriate

Why this matters:
- sales follow-up is historical, not just point-in-time
- reporting, accountability, and auditability depend on event history
- it reduces data loss on repeated edits

### 4.3 Customer upsert and contact normalization
Current state:
- done, but should stay documented clearly
- inquiry can link existing customer
- inquiry can auto-link by normalized mobile
- inquiry can auto-create customer when name exists and no match is found

Legacy behavior:
- inquiry save upserted customer by name + mobile

Recommended improvement:
- keep the current controlled auto-create / auto-link policy unless business changes
- document exact identity rules and preserve inquiry-time snapshot behavior

Why this matters:
- current free-text fallback can fragment customer data
- legacy upsert was convenient but weakly keyed
- a modern policy should preserve usability without multiplying duplicates

### 4.4 Persistent inquiry-to-inventory association
Current state:
- partially complete
- durable inquiry-to-inventory links now exist
- current durable states effectively used are `matched` and `emailed`

Legacy behavior:
- no normalized persisted link existed, but the workflow combined inquiry and inventory closely

Recommended improvement:
- extend current relation usage to additional business states such as:
- `shortlisted`
- `visited`
- `booked`
- `rejected`

Why this matters:
- once a vehicle is actually shown or sent to a customer, that business event should be queryable
- this improves follow-up quality and sales conversion reporting

### 4.5 Explicit source and lead-channel governance
Current state:
- partial
- source is suggestion-driven using preferred defaults plus distinct saved values

Recommended improvement:
- define a controlled source taxonomy
- support:
  - canonical source value
  - optional sub-source / campaign / reference details
- prevent accidental duplication such as `CarDekho`, `cardekho`, `Car Dekho`

Why this matters:
- reporting on lead quality and lead channel performance needs normalized source data

## 5. Required Data Model Improvements

### 5.1 Preserve one-to-many inquiry car details
Recommended rule:
- `inquiryCarDetails` must be treated as a true child collection, not collapsed to one row

Required changes:
- done for multi-row collection support
- still pending if we want row-identity diff updates instead of replace-all semantics

### 5.2 Introduce inquiry follow-up history table
Recommended minimum table:
- `inquiryFollowups`

Minimum fields:
- `inquiryFollowupId`
- `inquiryId`
- `followupDate`
- `status`
- `subStatus`
- `classification`
- `remark`
- `nextFollowupDate` (nullable)
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Recommended rule:
- current equivalent behavior is already happening through `followupInquiry`
- no new table is needed unless naming or schema redesign is explicitly required

### 5.3 Introduce inquiry-inventory relation table
Recommended minimum table:
- `inquiryInventoryLinks`

Minimum fields:
- `inquiryInventoryLinkId`
- `inquiryId`
- `inventoryId`
- `linkType`
- `isActive`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Suggested `linkType` values:
- `matched`
- `emailed`
- `shortlisted`
- `visited`
- `booked`
- `rejected`

Current state:
- table exists and is in use
- broader lifecycle states are still pending

### 5.4 Strengthen customer identity handling
Recommended improvements:
- normalize mobile numbers before duplicate checks
- optionally store inquiry-time snapshot fields even when linked customer exists
- distinguish:
  - canonical linked customer data
  - inquiry-time captured contact snapshot

### 5.5 Add audit/event logging
Recommended minimum event coverage:
- inquiry created
- inquiry updated
- inquiry deleted
- inquiry car detail added
- inquiry car detail removed
- follow-up recorded
- inventory linked
- inventory email sent

Why this matters:
- current module has useful workflow but weak business traceability

## 6. Required Workflow Improvements

### 6.1 Separate save from side effects
Current state:
- mostly addressed
- current main UX exposes explicit save actions
- legacy-style silent side effects are no longer the only save path

Recommended improvement:
- make email behavior explicit and configurable
- do not hide important communication behind silent save side effects

Recommended options:
- `save only`
- `save and send inquiry car email`
- `save and send selected inventory vehicles`

### 6.2 Better duplicate inquiry handling
Current state:
- mostly addressed
- duplicate check is informational and now uses normalized mobile, linked customer, and open inquiry overlap

Recommended improvement:
- upgrade duplicate detection to include:
  - normalized mobile
  - linked customer id
  - recent open inquiry overlap
- allow the user to:
  - continue with new inquiry
  - open existing inquiry
  - merge into existing inquiry

### 6.3 Better lifecycle semantics
Current state:
- statuses are only `FollowUp` and `Closed`
- classification is separate but loosely governed

Recommended improvement:
- define a clearer inquiry lifecycle
- keep statuses simple, but map sub-status and follow-up actions more deliberately

Suggested approach:
- top-level statuses:
  - `Open`
  - `FollowUp`
  - `Closed`
- closed reasons via sub-status
- optional sales-stage tracking if business needs it

### 6.4 Inquiry detail view should show full history
Recommended improvement:
- inquiry detail should show:
  - current inquiry summary
  - full car-interest list
  - follow-up timeline
  - linked inventory history
  - email history
  - creator/updater audit info

Current state:
- everything above is present except full email history / outcome timeline

## 7. UI/UX Improvements

### 7.1 Multi-row vehicle interest editor
Add:
- repeatable car-interest rows
- row-level make/model/variant selectors
- row-level year and sub-variant
- row removal and add-another actions

### 7.2 Stronger inventory match panel
Improve match panel to show:
- why each vehicle matched
- vehicle availability state
- whether already emailed for this inquiry
- whether already linked/shortlisted

### 7.3 Follow-up-first workspace
Recommended improvement:
- surface today’s and overdue follow-ups more prominently
- allow quick next-action updates without reopening full edit modal

### 7.4 Better error and confirmation behavior
Add explicit confirmations for:
- deleting inquiry
- sending customer emails
- overwriting customer/contact values from linked customer

## 8. Reporting Improvements
Recommended reporting additions:
- inquiries by source
- inquiries by classification
- inquiries by assigned user
- follow-up completion/overdue aging
- inquiry-to-inventory conversion
- inquiry-to-booking conversion
- emailed vehicle engagement by inquiry

Why this matters:
- current filters are useful operationally
- durable reporting requires normalized relations and history

## 9. Email Improvements

### 9.1 Make inquiry email flows explicit
Recommended improvements:
- distinguish inquiry-interest email from concrete inventory email
- show send preview before dispatch
- record send result against inquiry timeline

### 9.2 Multi-vehicle inventory email support
Recommended improvement:
- support sending more than one selected inventory vehicle in one inquiry email workflow
- optionally persist each linked vehicle as `emailed`

Current state:
- done for selected inventory vehicles
- still pending if grouped one-message multi-vehicle email becomes required

### 9.3 Attachments and media strategy
Recommended improvement:
- decide whether inquiry-driven inventory emails should include:
  - tracked links only
  - inline images
  - downloadable brochure/PDF
- avoid unbounded attachment behavior

## 10. Prioritized Implementation Order

### Phase 1 - parity and data safety
- restore multi-vehicle inquiry support
- add follow-up history table and append behavior
- normalize duplicate check by mobile/customer
- remove silent save-side email as the only first-save mechanism

### Phase 2 - relationship durability
- add inquiry-inventory relation table
- record inventory email/link history against inquiry
- improve inquiry detail view with timeline/history

### Phase 3 - reporting and workflow optimization
- normalize source taxonomy
- add richer reports and dashboards
- improve follow-up-first operational workflow

## 10A. Execution TODO
Use this as the one-by-one delivery checklist for completing Inquiry Management.

### Step 1 - Apply inquiry number database protection
- status: done
- DB-level duplicate inquiry number protection is now applied and verified
- keep current retry logic in application layer

### Step 2 - Restore complete multi-vehicle inquiry UX
- status: done
- visible multi-row vehicle editor exists
- one inquiry maps to multiple `inquiryCarDetails`
- detail/list/export now handle multi-row inquiry data materially better

### Step 3 - Add durable follow-up history
- status: done using existing `followupInquiry` table
- append behavior exists on meaningful workflow changes
- current inquiry summary fields are preserved
- inquiry detail shows historical follow-up timeline

### Step 4 - Normalize duplicate inquiry detection
- status: mostly done
- normalized mobile, linked customer id, and open inquiry overlap are checked
- `View` existing inquiry is available
- merge flow is still pending

### Step 5 - Define customer resolution policy
- status: done for current implementation
- current policy is controlled auto-link / auto-create by normalized mobile and name presence
- snapshot vs canonical behavior remains documented, but can still be refined later if business asks

### Step 6 - Make save vs send behavior explicit
- status: mostly done
- explicit `Save Only` and `Save & Send Matching` are implemented
- separate explicit inquiry-interest email flow is still less prominent than inventory-send flow

### Step 7 - Add persistent inquiry-to-inventory links
- legacy `.NET` system did not persist durable inquiry-to-inventory links; inventory search and customer email were transient workflow actions only
- status: mostly done
- table/model exists and is in use
- `matched` and `emailed` are persisted
- inventory-backed lifecycle states are now also persisted:
  - `shortlisted`
  - `visited`
  - `booked`
  - `rejected`
- this workflow is intentionally limited to vehicles that actually exist in inventory
- non-inventory partner/dealer handling stays in follow-up and remarks
- treat this as a deliberate Next.js improvement beyond parity, not a legacy restoration item

### Step 8 - Record email and inventory history in inquiry detail
- status: mostly done
- linked inventory history is shown
- tracked inventory email history is now shown in inquiry detail
- generic inquiry-email attempts are now stored and shown durably in inquiry detail
- inventory workflow states are stored for actual in-stock inventory only
- partner/dealer sourcing remains a remark/follow-up process by business decision and does not create an inventory link

### Step 9 - Improve inventory matching workspace
- status: partial
- basic match results and availability are visible
- richer operator state for already linked inventory is now visible in inquiry detail
- match explanation and deeper workspace cues are still pending

### Step 10 - Improve inquiry lifecycle semantics
- status: done
- lifecycle is `Open`, `FollowUp`, and `Closed`
- follow-up logging writes the selected next date only for `FollowUp` and clears it for `Closed`
- classification and sub-status remain supporting information, not a second lifecycle model

### Step 11 - Add audit and event logging
- status: mostly done
- log inquiry created
- log inquiry updated
- log inquiry deleted
- log vehicle row added/removed
- log follow-up recorded
- log inventory linked
- log email sent
- inquiry detail now shows a durable event log backed by `inquiry_activity_log`
- remaining gap is mainly broader reporting/analytics use of this event data, not missing storage

### Step 12 - Normalize source / lead channel governance
- status: done for the approved master-data baseline
- `inquiry_source_master` provides stable source codes, labels, categories, active state, and detail requirements
- `legacy_inquiry_source_mapping` maps historic raw values; historic blank Website rows are assigned to `Unknown`, distinct from user-selected `Other`
- a restricted source-master administration screen is optional future work

### Step 13 - Build follow-up-first workspace improvements
- status: pending
- surface today’s follow-ups
- surface overdue follow-ups
- allow quick next-action updates without opening full edit each time

### Step 14 - Add reporting outputs
- status: pending
- inquiries by source
- inquiries by classification
- inquiries by assigned user
- follow-up aging and completion
- inquiry-to-inventory conversion
- inquiry-to-booking conversion
- emailed vehicle engagement by inquiry

### Step 15 - Decide email media strategy
- status: pending
- decide tracked links vs inline images vs brochure/PDF
- document limits and default behavior
- avoid oversized or unbounded email attachments

### Step 16 - Add automated coverage
- status: partial
- current Node tests cover inquiry/follow-up validation, `OTHER` sub-status behavior, Source Master invariants, public email links, and legacy text-vehicle filter construction
- remaining database-backed tests: multi-vehicle create/update/remove, duplicate detection, customer upsert, history append, inventory-link persistence, and save/send email flows

### Step 17 - Update SSOT during each completed slice
- status: done for this implementation pass
- update `D:\projects\ExcelCarsNextJs\docs\module\ssot\inquirymanagement.md` whenever current behavior changes
- keep this improvement document marked against actual completion state

### Step 18 - Final legacy business-logic verification
- status: done on 2026-09-01
- re-read `D:\projects\ExcelCars\ExcelCars\Controllers\AdminController.cs`
- re-read `D:\projects\ExcelCars\ExcelCars\Views\Admin\InquiryManagement.cshtml`
- re-read `D:\projects\ExcelCars\ApModel\Model\Inquiry\Inquiry.cs`
- compare final Next.js behavior against old `.NET` Admin/InquiryManagement behavior
- confirm that all required legacy business logic has been either:
- incorporated
- intentionally improved
- intentionally excluded and documented
- only close Inquiry Management implementation after this final verification pass

### Final Verification Result - 2026-09-01
Reviewed legacy `AdminController`, `InquiryManagement.cshtml`, `Inquiry.cs`, `Followup_Management.cs`, and `Follow_Up_Management.cshtml` against the current Next.js flows.

Covered or intentionally improved:
- legacy inquiry number generation is protected by a database unique constraint and application retry behavior
- legacy one-to-many car details are preserved in the inquiry editor, listing, follow-up queue, and exports
- legacy customer lookup/upsert is replaced by controlled existing-customer linking, normalized mobile matching, and safe auto-create
- legacy duplicate mobile check is improved to a warning that also considers linked customer and open inquiry overlap
- legacy follow-up date/history behavior is normalized across inquiry and follow-up writes
- legacy stock matching and email actions are retained, with durable inventory links and email/event history
- legacy source text values are normalized through Source Master while historic blanks remain auditable
- legacy Make/Model/Variant text filtering is available alongside normalized catalog dropdown filters

Intentional differences:
- `Save Only` does not send email; `Save & Send Matching` makes that side effect explicit
- non-inventory partner/dealer sourcing is kept in follow-up remarks, not represented as an inventory link
- the queue is paginated for performance while export returns all matching rows
- current validation is stricter than legacy for required contact outcome, remark, and valid next follow-up date

Deferred to dashboard/reporting work:
- legacy dashboard drill-down presets and Own-count entry points
- aggregate conversion, aging, source, and engagement reporting

## 11. Non-goals For The First Improvement Pass
- full CRM assignment engine
- automated lead scoring
- omnichannel communication hub
- full sales pipeline replacement

These may be valuable later, but they should not block the structural improvements above.

## 12. Tests Required For Improvement Work
- inquiry can save multiple vehicle-interest rows correctly
- update can add, edit, and remove child vehicle-interest rows safely
- follow-up history appends new events without losing prior records
- duplicate handling uses normalized mobile values
- linked customer and snapshot contact behavior remains consistent
- inquiry-inventory links persist and are queryable
- sending inventory email records inquiry-linked history correctly
- explicit save-only flow does not send email
- explicit save-and-send flow sends intended email and records outcome
- detail view accurately renders inquiry timeline and related vehicles

## 13. SSOT Rule
Any implementation work that changes current inquiry behavior should follow this priority:
- preserve or improve business truth
- make inquiry relations durable
- make workflow side effects explicit
- avoid collapsing one-to-many inquiry behavior into one-row shortcuts unless explicitly approved

If multi-vehicle support, follow-up history, or persistent inquiry-to-inventory relations are implemented, `docs/module/ssot/inquirymanagement.md` must be updated in the same change so the current-state SSOT stays accurate.
