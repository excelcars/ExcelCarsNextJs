# SSOT - Inquiry Management Module
## Status: Next.js implemented; current-state business logic documented

**Module:** `inquiry`  
**Project:** `ExcelCarsNextJs`  
**Depends On:** `customer` linkage, vehicle catalog masters, inventory module, auth/session, email delivery, tracked vehicle email links  
**Source of truth for this document:** `D:\projects\ExcelCarsNextJs\app\(dashboard)\inquiry\page.tsx`, `D:\projects\ExcelCarsNextJs\src\features\inquiry\InquiryClient.tsx`, `D:\projects\ExcelCarsNextJs\src\features\inquiry\actions.ts`, `D:\projects\ExcelCarsNextJs\src\features\inquiry\queries.ts`, `D:\projects\ExcelCarsNextJs\app\api\inquiry\previous\route.ts`, `D:\projects\ExcelCarsNextJs\app\api\inquiry\inventory-match\route.ts`, `D:\projects\ExcelCarsNextJs\app\api\inquiry\export\route.ts`, `D:\projects\ExcelCarsNextJs\app\api\inventory\inquiries\route.ts`

## 1. Purpose
This module manages inquiry records in the current Next.js admin dashboard.

It owns:
- inquiry list, filtering, pagination, export, view, create, edit, and delete
- inquiry workflow capture:
  - source
  - customer/contact
  - classification
  - status
  - sub-status
  - follow-up date
  - visited date
  - remark
- one-to-many car-of-interest capture per inquiry through `inquiryCarDetails`
- duplicate/previous inquiry detection by mobile number
- inquiry-side inventory match lookup
- emailing a matched inventory vehicle to an inquiry recipient
- best-effort first-save inquiry email when a car of interest exists

It does not own:
- customer master creation or update
- inventory master ownership
- inventory photo ownership
- vehicle catalog master ownership
- durable follow-up history as a separate table

## 2. Locked Current Scope
- inquiry management UI is served at `/inquiry`
- all reads and writes require authenticated session
- the page is server-rendered for list/filter data and hydrated into a client management screen
- inquiry create/edit uses a modal form rather than a full-page edit view
- current implementation supports multiple vehicle-interest rows per inquiry
- customer can be:
  - linked from existing customer master through `CustomerPicker`
  - stored as legacy/free-text contact data when no linked customer is chosen
- source suggestions are taken from preferred defaults plus distinct saved inquiry websites
- duplicate prior inquiries are checked by exact mobile number match
- inventory matching is based on the selected make/model/variant/year values across the inquiry vehicle-interest rows
- emailing from inquiry sends one selected inventory vehicle at a time
- export follows the exact filters currently applied

## 3. Data Ownership

Primary tables owned or directly written by this module:
- `inquiry`
- `inquiryCarDetails`

Primary related tables read by this module:
- `customer`
- `carMakeMaster`
- `carModelMaster`
- `carVariantMaster`
- `inventoryManagement`
- `vehicleEmailLink`
- `user`

Minimum `inquiry` fields used by this module:
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
- `createdDt`
- `updatedDt`
- `createdBy`
- `updatedBy`

Minimum `inquiryCarDetails` fields used by this module:
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

Related `vehicleEmailLink` write side effect when inventory email is sent:
- `inventoryId`
- `customerId` (nullable)
- `recipientEmail`
- `recipientName`
- `tokenHash`
- `emailSentAt`
- `isActive`

## 4. Interface Contracts

Required page surface:
- `GET /inquiry` through `app/(dashboard)/inquiry/page.tsx`

Required server actions:
- `createInquiry(input)`
- `updateInquiry(id, input)`
- `deleteInquiry(id)`
- `getInquiryDetail(inquiryId)`
- `sendInquiryEmail(inquiryId)`
- `sendInquiryInventoryEmail(inquiryId, inventoryId)`

Required query functions:
- `listInquiries(params)`
- `getInquiryById(id)`
- `listInquiriesForExport(params)`
- `getMakes()`
- `getInquirySourceSuggestions()`

Required API surfaces:
- `GET /api/inquiry/previous`
- `GET /api/inquiry/inventory-match`
- `GET /api/inquiry/export`
- `GET /api/inventory/inquiries`

Required UI behaviors:
- list inquiries with paging
- free-text search
- filter by:
  - status
  - classification
  - source
  - sub-status
  - follow-up date
  - visited date
  - make
  - model
  - variant
- open modal for new inquiry
- open modal for edit inquiry
- open detail view for inquiry
- add/remove multiple vehicle-interest rows in the inquiry form
- detect previous inquiries by mobile while editing
- show matching inventory while editing based on vehicle selection
- export all matching filtered inquiry rows as CSV
- open inventory-email modal from an inquiry row

## 5. Business Rules
- authenticated session is mandatory for page and API access
- inquiry list defaults:
  - `status = All`
  - `classification = All`
  - `source = All`
  - `subStatus = All`
  - page size is fixed at `25`
- inquiry statuses are locked to:
  - `FollowUp`
  - `Closed`
- inquiry classifications are locked to:
  - `Hot`
  - `Warm`
  - `Cold`
- new inquiry form defaults are:
  - `dateOfInquiry = today`
  - `classification = Warm`
  - `status = FollowUp`
  - `followUpDate = empty`
- create/update requires either:
  - linked `customerId`, or
  - free-text `customerNameLegacy`, or
  - free-text `mobileno`
- workflow validation rules:
  - when `status = FollowUp`, `followUpDate` is required
  - when `subStatus = Visited`, `visitedDateOfCustomer` is required
  - `followUpDate` cannot be earlier than `dateOfInquiry`
  - `visitedDateOfCustomer` cannot be earlier than `dateOfInquiry`
- if a linked customer is selected:
  - inquiry contact fields are resolved from `customer`
  - selected customer must exist
  - free-text contact values do not override linked customer canonical values during save
- if no linked customer is selected:
  - inquiry stores legacy/free-text `customerNameLegacy`, `mobileno`, and `email`
- if `fkVariantId` is selected:
  - make/model/variant text is resolved from catalog masters and stored into inquiry car detail legacy columns
- if no `fkVariantId` is selected:
  - inquiry car detail can still store `subVariant` and `year`
  - no free-text make/model/variant form currently exists in this UI
- create behavior:
  - inserts one inquiry row
  - optionally inserts multiple `inquiryCarDetails` child rows when vehicle rows contain meaningful values
- update behavior:
  - updates inquiry row
  - replaces the existing inquiry car-detail set with the currently posted vehicle rows
- delete behavior:
  - deletes all `inquiryCarDetails` rows for the inquiry
  - deletes the inquiry row
- previous inquiry detection:
  - exact case-insensitive mobile match on `mobileno`
  - current inquiry id can be excluded while editing
- inquiry list search matches:
  - inquiry number
  - mobile
  - email
  - legacy customer name
  - linked customer name
- make/model/variant filters work through `inquiryCarDetails` and catalog relations

## 6. Current Relationship Model
- one linked `customer` can have many `inquiry` rows
- one `inquiry` belongs to zero or one linked `customer`
- one `inquiry` can have many `inquiryCarDetails` rows in storage and in the current UI
- one inquiry can be matched against many inventory vehicles at read time through `/api/inquiry/inventory-match`
- current app does not persist a direct inquiry-to-inventory link when showing matches
- one inventory vehicle can be emailed to one inquiry recipient at a time from the inquiry email modal

## 7. Inventory Integration
- inquiry edit modal auto-loads matching inventory when any inquiry vehicle row has selected make, model, or variant data
- inventory match query uses:
  - `variantId` if available
  - else `modelId`
  - else `makeId`
  - optional `year`
- `/api/inquiry/inventory-match` returns up to 12 vehicles
- inquiry inventory email modal preloads matching inventory across the inquiry vehicle rows
- `/api/inventory/inquiries` supports lookup of inquiry candidates from inventory side:
  - default result is recent inquiries with `status = FollowUp`
  - search supports inquiry number, customer, mobile, email

## 8. Email Integration
Two email paths exist in code:
- `sendInquiryEmail(inquiryId)`
- `sendInquiryInventoryEmail(inquiryId, inventoryId)`

Current UI-anchored path:
- `sendInquiryInventoryEmail(inquiryId, inventoryId)`
- resolves inquiry recipient from linked customer email first, then inquiry email
- resolves inventory vehicle details from inventory record
- creates a tracked `vehicleEmailLink`
- sends a vehicle-details email with tracked detail URL
- deletes the just-created `vehicleEmailLink` if email send fails

Best-effort first-save path:
- `createInquiry()` calls internal `sendInquiryCarEmail(newInquiryId)` after successful create
- this only attempts when a car of interest exists through `fkVariantId` or `carYear`
- this email uses inquiry car-of-interest details, not a selected inventory record
- save success is not rolled back if the email attempt fails

Important differences from legacy:
- current inquiry email flow does not attach inventory photos
- current inventory email flow creates tracked vehicle email links
- current inquiry module does not create follow-up history rows during email sending

## 9. Export and Reporting
- `GET /api/inquiry/export` returns all rows matching current filters
- client exports CSV with columns:
  - `Inquiry ID`
  - `Inquiry No`
  - `Inquiry Date`
  - `Source`
  - `Linked Customer ID`
  - `Customer Name`
  - `Mobile`
  - `Email`
  - `Make`
  - `Model`
  - `Variant`
  - `Sub Variant`
  - `Car Year`
  - `Budget`
  - `Classification`
  - `Status`
  - `Sub-status`
  - `Follow-up Date`
  - `Visited Date`
  - `Remarks`

## 10. Known Current Constraints
- there is no separate `followup` table integration in the current module
- customer master is not upserted here; the module links an existing customer or stores legacy text
- free-text make/model/variant fallback from legacy is not fully exposed in current inquiry UI
- first-save inquiry email exists as a best-effort side effect but is not surfaced as an explicit user action in the form
- inquiry-to-inventory relation remains read-time matching rather than persistent association

## 11. Tests Required
- unauthenticated access to inquiry page and inquiry APIs is rejected
- create inquiry succeeds with linked customer and valid workflow fields
- create inquiry succeeds with free-text customer/mobile and valid workflow fields
- create inquiry fails when no customer identity information is provided
- `FollowUp` status requires follow-up date
- `Visited` sub-status requires visited date
- follow-up date cannot be before inquiry date
- visited date cannot be before inquiry date
- create inquiry writes exactly one `inquiryCarDetails` row when vehicle info exists
- create inquiry can persist multiple `inquiryCarDetails` rows
- update inquiry can persist multiple `inquiryCarDetails` rows
- delete inquiry removes child `inquiryCarDetails` rows first
- previous inquiry API returns same-mobile records excluding current inquiry when requested
- make/model/variant filters return inquiries through `inquiryCarDetails` relation
- export returns all matching rows, not just current page
- inventory-match API returns vehicles by variant/model/make priority
- `sendInquiryInventoryEmail` creates tracked email link and rolls it back on send failure
- first-save best-effort inquiry email does not fail the inquiry save

## 12. SSOT Rule
Inquiry Management in the current Next.js app is customer-linked, filterable, email-enabled, and now supports multiple vehicle-interest rows per inquiry. Any change to inquiry car-detail cardinality, persistent inquiry-to-inventory links, or follow-up history ownership must update this SSOT in the same change.
