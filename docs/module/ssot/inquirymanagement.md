# SSOT - Inquiry Management Module
## Status: Next.js implemented; SSOT updated to current code on 2026-08-28

**Module:** `inquiry`  
**Project:** `ExcelCarsNextJs`  
**Primary route:** `/inquiry`  
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
- persistent inquiry-to-inventory link history through `inquiryInventoryLinks`
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
- source suggestions come from preferred defaults plus distinct saved `inquiry.website` values
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
  - tracked inventory email history with open/click activity
  - create/update audit users

## 3. Data Ownership
Primary tables directly written by this module:
- `inquiry`
- `inquiryCarDetails`
- `followupInquiry`
- `inquiryInventoryLinks`
- `vehicleEmailLink`

Primary related tables read by this module:
- `customer`
- `carMakeMaster`
- `carModelMaster`
- `carVariantMaster`
- `inventoryManagement`
- `userTable`

Minimum `inquiry` fields used:
- `inquiryId`
- `inquiryNo`
- `dateOfInquiry`
- `website`
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

## 4. Interface Contracts
Required page surface:
- `GET /inquiry`

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

Required query functions:
- `listInquiries(params)`
- `getInquiryById(id)`
- `listInquiriesForExport(params)`
- `getMakes()`
- `getInquirySourceSuggestions()`
- `getInquirySubStatusSuggestions()`
- `getInquiryAssistants()`

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
- inquiry statuses currently remain:
  - `FollowUp`
  - `Closed`
- inquiry classifications remain:
  - `Hot`
  - `Warm`
  - `Cold`
- new inquiry defaults are:
  - `dateOfInquiry = today`
  - `classification = Warm`
  - `status = FollowUp`
  - `followUpDate = empty`
- validation rules:
  - when `status = FollowUp`, `followUpDate` is required
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
- `inquiryInventoryLinks.linkType` currently records durable states already used by the app:
  - `matched`
  - `emailed`

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
- inquiry detail shows linked inventory history with inventory snapshots

## 9. Email Integration
There are two code paths:
- `sendInquiryEmail(inquiryId)`
- `sendInquiryInventoryEmail(inquiryId, inventoryId)` and `sendInquiryInventoryEmails(inquiryId, inventoryIds)`

Current practical behavior:
- `sendInquiryEmail()` sends a generic inquiry-interest email from the first inquiry car row
- `sendInquiryInventoryEmail()` sends one concrete inventory vehicle email
- `sendInquiryInventoryEmails()` sends multiple selected inventory vehicles one by one
- inventory email path creates tracked `vehicleEmailLink` rows
- on successful inventory email, the inquiry gets durable `inquiryInventoryLinks` with `linkType = emailed`
- on failed inventory email, the just-created tracked link is cleaned up
- inquiry detail now shows tracked inventory email history with:
  - recipient
  - sent time
  - open counts
  - first/last open
  - call / WhatsApp / email click counts

Public email links:
- vehicle email links point to `/vehicle/[slug]?t=<token>`
- public vehicle pages are intentionally excluded from auth middleware
- dashboard pages remain authenticated

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
- dashboard follow-up metrics should later be derived from these same durable tables rather than ad hoc UI state

## 13. Known Current Limits
- no merge flow exists for duplicate inquiries
- generic non-tracked `sendInquiryEmail()` history is still not persisted as a durable timeline
- source is still suggestion-driven rather than strict canonical taxonomy
- inquiry lifecycle still uses `FollowUp` / `Closed`; `Open` is not introduced yet
- inquiry child-row updates still use replace-all semantics instead of per-row diff updates
