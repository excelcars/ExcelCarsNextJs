# SSOT - Inquiry Management Improvements
## Status: Proposed improvements for current Next.js module

**Module:** `inquiry`  
**Project:** `ExcelCarsNextJs`  
**Base SSOT:** `D:\projects\ExcelCarsNextJs\docs\module\ssot\inquirymanagement.md`  
**Legacy reference:** `D:\projects\ExcelCarsNextJs\docs\module\existing_ssot\inquirymanagement.md`

## 1. Purpose
This document defines the recommended improvement scope for the current Next.js Inquiry Management module.

It exists to:
- close important behavior gaps between legacy `.NET Admin/InquiryManagement` and the current Next.js module
- separate durable business rules from temporary implementation shortcuts
- identify which improvements are required for parity, data quality, and maintainability
- provide an ordered direction for future implementation work

## 2. Improvement Themes
The current module is functional, but it is intentionally simplified compared with legacy behavior. The main improvement themes are:

- restore missing business capabilities where they are still required
- improve data modeling so inquiry workflow is durable and auditable
- reduce coupling between inquiry UI behavior and implicit side effects
- normalize inquiry-to-vehicle and inquiry-to-customer relationships
- make the module easier to report on, extend, and test

## 3. Required Product Gaps To Address

### 3.1 Multi-vehicle inquiry support
Current state:
- one inquiry is normalized to one active `inquiryCarDetails` row

Legacy behavior:
- one inquiry could hold multiple vehicle-interest rows

Recommended improvement:
- restore first-class support for multiple vehicle-interest rows per inquiry
- allow add/edit/delete/reorder of multiple desired vehicle rows in the inquiry form
- preserve one-to-many `inquiry -> inquiryCarDetails` behavior in both UI and save logic

Why this matters:
- this is one of the biggest behavioral differences from the old system
- it reflects how sales teams capture a single customer’s interest across several vehicles
- it improves future inventory matching and customer follow-up relevance

### 3.2 Durable follow-up history
Current state:
- follow-up data is stored only on the main inquiry row
- no separate follow-up history table is written by the current inquiry module

Legacy behavior:
- `Followup_Inquiry` rows were appended when follow-up date existed

Recommended improvement:
- introduce a dedicated inquiry follow-up history model and service flow
- record each meaningful follow-up event separately instead of overwriting one current value
- distinguish:
  - current follow-up state on inquiry
  - historical follow-up events

Why this matters:
- sales follow-up is historical, not just point-in-time
- reporting, accountability, and auditability depend on event history
- it reduces data loss on repeated edits

### 3.3 Customer upsert and contact normalization
Current state:
- inquiry links an existing customer or stores free-text contact values
- the module does not create/update customer master data

Legacy behavior:
- inquiry save upserted customer by name + mobile

Recommended improvement:
- define an explicit customer resolution policy for inquiry save
- choose one of:
  - strict linking only
  - controlled auto-create customer
  - controlled create-or-link review workflow
- if auto-create is allowed, use stronger identity rules than legacy

Why this matters:
- current free-text fallback can fragment customer data
- legacy upsert was convenient but weakly keyed
- a modern policy should preserve usability without multiplying duplicates

### 3.4 Persistent inquiry-to-inventory association
Current state:
- inventory match is read-only lookup
- no durable inquiry-to-inventory link is stored

Legacy behavior:
- no normalized persisted link existed, but the workflow combined inquiry and inventory closely

Recommended improvement:
- add a durable relation for inventory vehicles associated with an inquiry
- support relation states such as:
  - matched
  - emailed
  - shortlisted
  - visited
  - booked
  - rejected

Why this matters:
- once a vehicle is actually shown or sent to a customer, that business event should be queryable
- this improves follow-up quality and sales conversion reporting

### 3.5 Explicit source and lead-channel governance
Current state:
- source is free text with suggestions

Recommended improvement:
- define a controlled source taxonomy
- support:
  - canonical source value
  - optional sub-source / campaign / reference details
- prevent accidental duplication such as `CarDekho`, `cardekho`, `Car Dekho`

Why this matters:
- reporting on lead quality and lead channel performance needs normalized source data

## 4. Required Data Model Improvements

### 4.1 Preserve one-to-many inquiry car details
Recommended rule:
- `inquiryCarDetails` must be treated as a true child collection, not collapsed to one row

Required changes:
- save full collection from UI
- update by child identity rather than delete-all-or-keep-one logic
- support soft delete or explicit removal semantics if needed

### 4.2 Introduce inquiry follow-up history table
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
- each save that changes follow-up workflow meaningfully should append a history event

### 4.3 Introduce inquiry-inventory relation table
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

### 4.4 Strengthen customer identity handling
Recommended improvements:
- normalize mobile numbers before duplicate checks
- optionally store inquiry-time snapshot fields even when linked customer exists
- distinguish:
  - canonical linked customer data
  - inquiry-time captured contact snapshot

### 4.5 Add audit/event logging
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

## 5. Required Workflow Improvements

### 5.1 Separate save from side effects
Current state:
- inquiry create performs a best-effort first-save email side effect

Recommended improvement:
- make email behavior explicit and configurable
- do not hide important communication behind silent save side effects

Recommended options:
- `save only`
- `save and send inquiry car email`
- `save and send selected inventory vehicles`

### 5.2 Better duplicate inquiry handling
Current state:
- duplicate check is informational based on exact mobile match

Recommended improvement:
- upgrade duplicate detection to include:
  - normalized mobile
  - linked customer id
  - recent open inquiry overlap
- allow the user to:
  - continue with new inquiry
  - open existing inquiry
  - merge into existing inquiry

### 5.3 Better lifecycle semantics
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

### 5.4 Inquiry detail view should show full history
Recommended improvement:
- inquiry detail should show:
  - current inquiry summary
  - full car-interest list
  - follow-up timeline
  - linked inventory history
  - email history
  - creator/updater audit info

## 6. UI/UX Improvements

### 6.1 Multi-row vehicle interest editor
Add:
- repeatable car-interest rows
- row-level make/model/variant selectors
- row-level year and sub-variant
- row removal and add-another actions

### 6.2 Stronger inventory match panel
Improve match panel to show:
- why each vehicle matched
- vehicle availability state
- whether already emailed for this inquiry
- whether already linked/shortlisted

### 6.3 Follow-up-first workspace
Recommended improvement:
- surface today’s and overdue follow-ups more prominently
- allow quick next-action updates without reopening full edit modal

### 6.4 Better error and confirmation behavior
Add explicit confirmations for:
- deleting inquiry
- sending customer emails
- overwriting customer/contact values from linked customer

## 7. Reporting Improvements
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

## 8. Email Improvements

### 8.1 Make inquiry email flows explicit
Recommended improvements:
- distinguish inquiry-interest email from concrete inventory email
- show send preview before dispatch
- record send result against inquiry timeline

### 8.2 Multi-vehicle inventory email support
Recommended improvement:
- support sending more than one selected inventory vehicle in one inquiry email workflow
- optionally persist each linked vehicle as `emailed`

### 8.3 Attachments and media strategy
Recommended improvement:
- decide whether inquiry-driven inventory emails should include:
  - tracked links only
  - inline images
  - downloadable brochure/PDF
- avoid unbounded attachment behavior

## 9. Prioritized Implementation Order

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

## 9A. Execution TODO
Use this as the one-by-one delivery checklist for completing Inquiry Management.

### Step 1 - Apply inquiry number database protection
- apply `D:\projects\ExcelCarsNextJs\prisma\add_inquiry_number_unique.sql`
- confirm duplicate inquiry number creation is blocked at DB level
- keep current retry logic in application layer

### Step 2 - Restore complete multi-vehicle inquiry UX
- reintroduce visible multi-row vehicle editor in inquiry form
- support add, edit, remove, and clear row behavior cleanly
- keep one inquiry mapped to multiple `inquiryCarDetails`
- update detail/list rendering so all vehicle rows are easy to review

### Step 3 - Add durable follow-up history
- add `inquiryFollowups` table/model
- append follow-up history on meaningful workflow changes
- preserve current inquiry summary fields while also storing history events
- show latest follow-up state separately from historical follow-up timeline

### Step 4 - Normalize duplicate inquiry detection
- normalize mobile values before duplicate checks
- include linked customer id in duplicate detection
- include recent open inquiry overlap rules
- offer user actions:
- continue as new inquiry
- open existing inquiry
- merge into existing inquiry if approved for scope

### Step 5 - Define customer resolution policy
- finalize whether inquiry save is:
- strict link only
- controlled auto-create customer
- controlled create-or-link workflow
- if create/update is allowed, preserve inquiry-time snapshot values separately from customer master data
- document exact matching rules for customer identity

### Step 6 - Make save vs send behavior explicit
- remove silent auto-email as the only first-save behavior
- support clear actions such as:
- save only
- save and send inquiry email
- save and send selected inventory vehicles
- show send confirmation before dispatch where needed

### Step 7 - Add persistent inquiry-to-inventory links
- add `inquiryInventoryLinks` table/model
- store relation states like `matched`, `emailed`, `shortlisted`, `visited`, `booked`, `rejected`
- persist manual popup sends as `emailed`
- decide whether auto-matched inventory should persist immediately as `matched`

### Step 8 - Record email and inventory history in inquiry detail
- show linked inventory history in inquiry detail
- show email send history and outcomes
- show which vehicles were matched, sent, shortlisted, rejected, or converted

### Step 9 - Improve inventory matching workspace
- show why each inventory row matched
- show availability state
- show already-emailed state for the current inquiry
- show already-linked or shortlisted state

### Step 10 - Improve inquiry lifecycle semantics
- review current `status`, `subStatus`, and `classification`
- define final lifecycle model for `Open`, `FollowUp`, `Closed` if adopted
- map sub-status and follow-up actions consistently

### Step 11 - Add audit and event logging
- log inquiry created
- log inquiry updated
- log inquiry deleted
- log vehicle row added/removed
- log follow-up recorded
- log inventory linked
- log email sent

### Step 12 - Normalize source / lead channel governance
- replace weak free-text source handling with controlled taxonomy
- support canonical source and optional sub-source / campaign fields
- prevent duplicate spellings such as `CarDekho`, `cardekho`, `Car Dekho`

### Step 13 - Build follow-up-first workspace improvements
- surface today’s follow-ups
- surface overdue follow-ups
- allow quick next-action updates without opening full edit each time

### Step 14 - Add reporting outputs
- inquiries by source
- inquiries by classification
- inquiries by assigned user
- follow-up aging and completion
- inquiry-to-inventory conversion
- inquiry-to-booking conversion
- emailed vehicle engagement by inquiry

### Step 15 - Decide email media strategy
- decide tracked links vs inline images vs brochure/PDF
- document limits and default behavior
- avoid oversized or unbounded email attachments

### Step 16 - Add automated coverage
- test multi-vehicle create/update/remove
- test follow-up history append behavior
- test duplicate handling with normalized mobile/customer
- test customer snapshot consistency
- test inquiry-inventory link persistence
- test explicit save-only vs save-and-send flows
- test inquiry detail history rendering

### Step 17 - Update SSOT during each completed slice
- update `D:\projects\ExcelCarsNextJs\docs\module\ssot\inquirymanagement.md` whenever current behavior changes
- keep this improvement document marked against actual completion state

### Step 18 - Final legacy business-logic verification
- re-read `D:\projects\ExcelCars\ExcelCars\Controllers\AdminController.cs`
- re-read `D:\projects\ExcelCars\ExcelCars\Views\Admin\InquiryManagement.cshtml`
- re-read `D:\projects\ExcelCars\ApModel\Model\Inquiry\Inquiry.cs`
- compare final Next.js behavior against old `.NET` Admin/InquiryManagement behavior
- confirm that all required legacy business logic has been either:
- incorporated
- intentionally improved
- intentionally excluded and documented
- only close Inquiry Management implementation after this final verification pass

## 10. Non-goals For The First Improvement Pass
- full CRM assignment engine
- automated lead scoring
- omnichannel communication hub
- full sales pipeline replacement

These may be valuable later, but they should not block the structural improvements above.

## 11. Tests Required For Improvement Work
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

## 12. SSOT Rule
Any implementation work that changes current inquiry behavior should follow this priority:
- preserve or improve business truth
- make inquiry relations durable
- make workflow side effects explicit
- avoid collapsing one-to-many inquiry behavior into one-row shortcuts unless explicitly approved

If multi-vehicle support, follow-up history, or persistent inquiry-to-inventory relations are implemented, `docs/module/ssot/inquirymanagement.md` must be updated in the same change so the current-state SSOT stays accurate.
