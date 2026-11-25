# SSOT - Inquiry Management Module
## Status: Next.js implemented; completed improvements merged and current contract re-verified on 2026-09-21

**Module:** `inquiry`  
**Project:** `ExcelCarsNextJs`  
**Primary route:** `/inquiry`  
**Source master route:** `/config/inquiry-sources`
**Depends On:** customer linkage and auto-create policy, vehicle catalog masters, inventory module, `followupInquiry`, `inquiryInventoryLinks`, auth/session, inquiry ownership rules, email delivery, tracked public vehicle links  
**Source of truth for this document:** `D:\projects\ExcelCarsNextJs\app\(dashboard)\inquiry\page.tsx`, `D:\projects\ExcelCarsNextJs\src\features\inquiry\InquiryClient.tsx`, `D:\projects\ExcelCarsNextJs\src\features\inquiry\actions.ts`, `D:\projects\ExcelCarsNextJs\src\features\inquiry\queries.ts`, `D:\projects\ExcelCarsNextJs\app\api\inquiry\previous\route.ts`, `D:\projects\ExcelCarsNextJs\app\api\inquiry\inventory-match\route.ts`, `D:\projects\ExcelCarsNextJs\app\api\inquiry\export\route.ts`, `D:\projects\ExcelCarsNextJs\app\api\inventory\inquiries\route.ts`, `D:\projects\ExcelCarsNextJs\middleware.ts`

## 1. Purpose
This module manages inquiry records inside the authenticated Next.js admin dashboard.

It currently owns:
- inquiry list, filtering, paging, export, view, create, edit, delete
- inquiry workflow capture:
  - source / website
  - customer/contact
  - classification
  - status
  - sub-status
  - follow-up date
  - visited date
  - remark
  - assignment to inquiry assistant
- one-to-many vehicle-interest capture through `inquiryCarDetails`
- duplicate / overlapping inquiry warnings before save
- inquiry-side inventory matching
- explicit save-only vs save-and-send behavior
- follow-up history append behavior through `followupInquiry`
- durable inquiry email attempt history through `inquiryEmailHistories`
- persistent inquiry-to-inventory link history through `inquiryInventoryLinks`
- durable inquiry event trail through `inquiry_activity_log`
- inquiry detail timeline for linked inventory history

It depends on, but does not own:
- customer master schema
- inventory master schema
- vehicle photo/media ownership
- dashboard reporting outputs

## 2. Locked Current Scope
- inquiry UI is served at `/inquiry`
- route access is protected by `canCurrentUserAccessRoute('/inquiry')`
- unauthorized access is redirected to `/dashboard`
- inquiry list queries can be ownership-restricted through `getInquiryOwnershipScopeForRoute('/inquiry')`
- page data is server-rendered, then hydrated into `InquiryClient`
- inquiry create/edit uses a modal workflow
- one inquiry supports multiple `inquiryCarDetails` rows in UI and persistence
- inquiry number is generated sequentially as `Inquiry/<number>`
- database-level uniqueness protection now exists for `inquiry.inquiry_no`
- source is selected from active `inquiry_source_master` records using a stable source code
- `Reference` and `Other` require `inquiry.source_detail` so referral/exception context is retained
- `inquiry.website` is preserved as historical raw text for existing inquiries and written as the canonical display label for new edits/saves
- the legacy mapping table backfills `inquiry.source_id`; historically blank Website values are assigned to `Unknown`, not `Other`
- Source Master administration is permission-protected at `/config/inquiry-sources` through `Inquiry_Source_Master_Management`
- sub-status suggestions come from distinct saved `inquiry.subStatus` values
- duplicate warning checks normalized mobile, linked customer overlap, and existing open inquiry conditions
- inquiry inventory matching works across all selected vehicle rows
- save actions are explicit:
  - `Save Only`
  - `Save & Send Matching`
- inquiry detail shows:
  - full vehicle-interest list
  - current inquiry state
  - follow-up timeline
  - linked inventory history
  - generic and inventory email attempt history with delivery outcomes
  - tracked inventory email history with open/click activity
  - create/update audit users

## 3. Data Ownership
Primary tables directly written by this module:
- `inquiry`
- `inquiryCarDetails`
- `followupInquiry`
- `inquiryEmailHistory`
- `inquiryInventoryLinks`
- `vehicleEmailLink`
- `inquiry_activity_log`
- `inquiry_source_master`
- `legacy_inquiry_source_mapping`

Primary related tables read by this module:
- `customer`
- `carMakeMaster`
- `carModelMaster`
- `carVariantMaster`
- `inventoryManagement`
- `userTable`

Minimum `inquiry_activity_log` fields written/read here:
- `inquiry_activity_log_id`
- `inquiry_id`
- `event_type`
- `event_label`
- `event_detail`
- `actor_user_id`
- `actor_user_name`
- `inventory_id`
- `followup_id`
- `inquiry_car_details_id`
- `created_at`

Minimum `inquiry` fields used:
- `inquiryId`
- `inquiryNo`
- `dateOfInquiry`
- `website`
- `sourceId`
- `sourceDetail`
- `customerId`
- `customerNameLegacy`
- `mobileno`
- `email`
- `budgetOfCustomer`
- `visitedDateOfCustomer`
- `classification`
- `status`
- `subStatus`
- `followUpDate`
- `remark`
- `assignedTo`
- `createdDt`
- `updatedDt`
- `createdBy`
- `updatedBy`

Minimum `inquiryCarDetails` fields used:
- `inquiryCarDetailsId`
- `fkInquiryId`
- `fkVariantId`
- `makeLegacy`
- `modelLegacy`
- `variantLegacy`
- `subVariant`
- `year`
- `createdDt`
- `updatedDt`
- `createdBy`
- `updatedBy`

Minimum `followupInquiry` fields written/read here:
- `pkFollowupId`
- `fkInquiryId`
- `followupDate`
- `contactOutcome`
- `followupStatus`
- `followupSubStatus`
- `followupClassification`
- `comments`
- `createdDt`
- `updatedDt`
- `createdBy`
- `updatedBy`

Minimum `inquiryInventoryLinks` fields written/read here:
- `inquiryInventoryLinkId`
- `inquiryId`
- `inventoryId`
- `linkType`
- `isActive`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

Minimum `inquiryEmailHistory` fields written/read here:
- `inquiryEmailHistoryId`
- `inquiryId`
- `inventoryId`
- `emailType`
- `recipientEmail`
- `recipientName`
- `emailSubject`
- `deliveryStatus`
- `errorMessage`
- `sentAt`
- `createdAt`
- `attemptedBy`

## 4. Interface Contracts
Required page surface:
- `GET /inquiry`
- `GET /config/inquiry-sources`

Required server actions:
- `createInquiry(input, options?)`
- `updateInquiry(id, input)`
- `deleteInquiry(id)`
- `getInquiryDetail(inquiryId, options?)`
- `assignInquiry(input)`
- `sendInquiryEmail(inquiryId)`
- `sendInquiryInventoryEmail(inquiryId, inventoryId)`
- `sendInquiryInventoryEmails(inquiryId, inventoryIds)`
- `getNextInquiryNumber()`
- `createInquirySource(input)`
- `updateInquirySource(sourceId, input)`
- `deleteInquirySource(sourceId)`

Required query functions:
- `listInquiries(params)`
- `getInquiryById(id)`
- `listInquiriesForExport(params)`
- `getMakes()`
- `getInquirySources()`
- `getInquirySubStatusSuggestions()`
- `getInquiryAssistants()`

The manual Assign To dropdown includes all active user accounts across roles, including SystemAdmin and SuperAdmin, with or without a linked employee. The server accepts any active account as a new assignee. Existing inquiry ownership authorization still controls who can change an assignment; inactive accounts are excluded from new assignments. Portal webhook assignment rules are configured separately.

Required API surfaces:
- `GET /api/inquiry/previous`
- `GET /api/inquiry/inventory-match`
- `GET /api/inquiry/export`
- `GET /api/inventory/inquiries`

## 5. Business Rules
- authenticated session is mandatory for all inquiry write actions
- `/inquiry` browser access also requires route-level access permission
- inquiry list defaults are:
  - `status = All`
  - `classification = All`
  - `source = All`
  - `subStatus = All`
  - fixed page size `25`
  - default `Active` queue: `FollowUp` inquiries ordered by due date, putting overdue then today's follow-ups before upcoming ones
  - quick presets: Active, Overdue, Today, Upcoming, Newest Activity, and All Inquiries
  - `Newest Activity` orders by last update; `All Inquiries` orders by newest `Date of Inquiry`, with blank dates last and `Inquiry ID` breaking ties
- inquiry statuses currently remain:
  - `Open`
  - `FollowUp`
  - `Closed`
- the database constraint `ck_inquiry_status` accepts only `Open`, `FollowUp`, `Closed`, or `null`
- inquiry classifications remain:
  - `Hot`
  - `Warm`
  - `Cold`
- new inquiry defaults are:
  - `dateOfInquiry = today`
  - `classification = Warm`
  - `status = Open`
  - `followUpDate = empty`
- validation rules:
  - when `status = FollowUp`, `followUpDate` is required
  - when `status = Open` or `Closed`, `followUpDate` is cleared
  - when `subStatus = Visited`, `visitedDateOfCustomer` is required
  - `followUpDate` cannot be earlier than `dateOfInquiry`
  - `visitedDateOfCustomer` cannot be earlier than `dateOfInquiry`
- inquiry save now uses an explicit customer resolution policy:
  - if `customerId` is selected, canonical customer values are used
  - if no `customerId` is selected and a normalized mobile matches an existing customer, that customer is linked
  - if no matching customer exists and a customer name is present, a new customer is auto-created
  - if no name is present, inquiry can still store mobile/email without creating a customer
- one inquiry can save multiple meaningful car rows
- on update, current implementation replaces the stored child set with the submitted child set
- follow-up history is appended when workflow state changes meaningfully
- create and update preserve inquiry summary fields on `inquiry` and append history to `followupInquiry`
- duplicate warnings are informational, not hard blocking
- users can still continue saving a genuine new inquiry after warning review

### Source Master Administration
- Source Master is listed in the Configuration menu only for roles granted `Inquiry_Source_Master_Management`
- it supports searchable listing, fixed page size `25`, create, edit, active/inactive state, detail requirement, category, code, and reporting order
- source code is normalized to uppercase underscore format and source name/code must remain unique
- deleting a source is permitted only when no `inquiry` references it
- successful deletion removes its `legacy_inquiry_source_mapping` rows in the same transaction
- Source Master import/backfill is an explicit `db:sync-inquiry-sources*` operation; it is not run automatically by `npm run dev`

## 6. Duplicate Detection
Current duplicate warning logic uses `GET /api/inquiry/previous`.

It checks:
- normalized mobile overlap
- linked customer overlap
- existing open inquiry overlap

Current warning actions in UI:
- show matching inquiry cards
- show reason chips such as:
  - `Same mobile`
  - `Same linked customer`
  - `Open inquiry`
- allow direct `View` link opening the inquiry in a new tab

The current system does not auto-merge inquiries.

## 7. Relationship Model
- one linked `customer` can have many `inquiry` rows
- one `inquiry` belongs to zero or one linked `customer`
- one `inquiry` can have many `inquiryCarDetails`
- one `inquiry` can have many `followupInquiry` history rows
- one `inquiry` can have many `inquiryInventoryLinks`
- one inventory vehicle can be linked to many inquiries over time
- `inquiryInventoryLinks.linkType` currently records durable inventory-backed states used by the app:
  - `matched`
  - `emailed`
  - `shortlisted`
  - `visited`
  - `booked`
  - `rejected`

Important note:
- durable inquiry-to-inventory links are a deliberate Next.js improvement beyond legacy parity

## 8. Inventory Integration
- inquiry form supports multiple vehicle-interest rows
- matching inventory is searched across all selected inquiry car rows
- inventory matching prefers:
  - exact `fkVariantId`
  - else exact legacy make/model/variant text combination
  - optional exact `year`
- match search is limited to inventory with status `In Stock`
- `/api/inquiry/inventory-match` is used for the matching workspace
- `Save & Send Matching` can auto-send all selected matching inventory vehicles after save
- successful automatic match-send persists:
  - `matched` links for discovered inventory
  - `emailed` links for successfully sent vehicles
- inquiry detail allows operators to add richer lifecycle states for already linked inventory rows only:
  - `shortlisted`
  - `visited`
  - `booked`
  - `rejected`
- this richer lifecycle tracking applies only to real inventory vehicles
- non-inventory sourcing or partner/dealer handling remains in follow-up remarks/history, not inventory mapping
- inquiry detail shows linked inventory history with inventory snapshots

## 9. Email Integration
There are two code paths:
- `sendInquiryEmail(inquiryId)`
- `sendInquiryInventoryEmail(inquiryId, inventoryId)` and `sendInquiryInventoryEmails(inquiryId, inventoryIds)`

Current practical behavior:
- `sendInquiryEmail()` sends a generic inquiry-interest email from the first inquiry car row
- `sendInquiryInventoryEmail()` sends one concrete inventory vehicle email
- `sendInquiryInventoryEmails()` sends multiple selected inventory vehicles one by one
- all inquiry email attempts now write durable `inquiryEmailHistory` rows with:
  - email type
  - recipient
  - subject
  - sent/failed status
  - error text when failed
  - attempted user
  - attempted/sent timestamp
- inventory email path creates tracked `vehicleEmailLink` rows
- on successful inventory email, the inquiry gets durable `inquiryInventoryLinks` with `linkType = emailed`
- on failed inventory email, the just-created tracked link is cleaned up
- inquiry detail now shows tracked inventory email history with:
  - recipient
  - sent time
  - open counts
  - first/last open
  - call / WhatsApp / email click counts
- inquiry detail also shows durable email-attempt history for both:
  - generic inquiry emails
  - inventory vehicle emails

Public email links:
- vehicle email links point to `/vehicle/[slug]?t=<token>`
- public vehicle pages are intentionally excluded from auth middleware
- dashboard pages remain authenticated
- links created from an existing inquiry hide `Enquire Now`; inventory-origin links keep it available
- a public vehicle enquiry matches an existing customer by normalized mobile number. It adds the vehicle to that customer's active inquiry without duplicating the vehicle interest; if every prior inquiry is closed, it creates a new inquiry linked to the existing customer instead.

## 10. Listing And Export Behavior
Inquiry list is now aligned closer to the legacy screen.

Current grouped columns are:
- `Sr. No`
- `Inquiry_Date / Website`
- `Customer Details`
- `Car Details`
- `Budget / Classification`
- `Visited Date`
- `Status / Sub Status`
- `FollowUp Date`
- `Remark`
- `Actions`

Current export behavior:
- export follows active filters
- export expands one inquiry into multiple rows when multiple inquiry car rows exist
- export format is shaped closer to legacy Excel expectations

## 11. Form Arrangement
The add/edit inquiry form currently follows this field arrangement:
- first row:
  - `Inquiry No*`
  - `Date of Inquiry*`
  - `Reference Website`
- second row:
  - `Link Existing Customer`
- third row:
  - `Customer Name*#`
  - `Customer Mobile No*#`
  - `Customer Email`

Vehicle interest remains a separate multi-row section below the core inquiry fields.

## 12. Follow-up Interconnection
Inquiry and Follow-up are intentionally interconnected.

Current shared behavior:
- inquiry create/update can append `followupInquiry`
- follow-up module reads current queue state from `inquiry`
- follow-up history modal reads `followupInquiry`
- follow-up history now stores one normalized meaning for `followupDate` across both write paths:
  - selected next follow-up date when status is `FollowUp`
  - `null` when status is `Closed`
- inquiry and follow-up actions now also append durable inquiry event rows for:
  - inquiry create/update/delete
  - vehicle-interest add/remove
  - follow-up recorded
  - assignment changed
  - inventory linked/state-marked
  - inquiry email sent
  - inventory email sent
- dashboard follow-up metrics should later be derived from these same durable tables rather than ad hoc UI state

## 13. Known Current Limits
- no merge flow exists for duplicate inquiries
- historic blank Website values are classified as `Unknown`; `Other` remains for a user-selected source that needs a detail
- inquiry lifecycle now uses `Open` / `FollowUp` / `Closed`
- inquiry child-row updates still use replace-all semantics instead of per-row diff updates
- Source Master supports CRUD, but it does not yet provide bulk import/export from the browser UI; controlled imports remain command-based
