# Follow-up Module Improvement / Gap Analysis
## Existing Legacy `Admin/Follow_Up_Management` vs Current Next.js `/followup`

**Compared sources:**

- Legacy SSOT: `D:\projects\ExcelCarsNextJs\docs\module\existing_ssot\followup.md`
- Current SSOT: `D:\projects\ExcelCarsNextJs\docs\module\ssot\followup.md`

This document lists the missing functionality, missing business logic, and behavior differences that still separate the Next.js follow-up module from the legacy system. It intentionally remains separate from `followup.md` until explicit approval is given.

## Approved Implementation Scope
The following directions are approved to move into implementation work one by one:

1. Normalize follow-up history write semantics across `/followup` and `/inquiry`.
2. Align client and server validation for follow-up logging.
3. Restore legacy-equivalent access behavior where required, including creator-based visibility rules.
4. Add legacy dashboard follow-up drill-down coverage.
5. Restore multi-car visibility in the follow-up queue.
6. Improve follow-up export shape and accuracy.
7. Restore or explicitly replace key legacy search differences.
8. Improve follow-up history viewing UX if still required after parity work.

Approved export direction:

- keep both `Inquiry Made By` and `Inquiry Made By User ID` in export output
- do not collapse those two meanings into one mislabeled column

Execution rule:

- implement one approved gap at a time
- verify each step before moving to the next one
- keep `followup.md` and `followup_improvement.md` separate until the full approved gap work is completed

## Visual Parity Checklist
This checklist is based on direct comparison of the provided legacy screenshot and current Next.js screenshot. It supplements the code-based gap analysis with what an operator actually sees on screen.

Evidence used:

- Legacy screenshot: `C:\Users\ujust\AppData\Local\Temp\codex-clipboard-33114327-59a1-4a4b-a3d1-ec6f129b348f.png`
- Current screenshot: `C:\Users\ujust\AppData\Local\Temp\codex-clipboard-de4c9dd6-0ba4-4a95-b66c-20a3488d59b2.png`

Visually confirmed gaps:

- legacy screen exposes a dense top-level search form with all major filters visible at once
- current screenshot shows a much more compact table-first experience
- legacy table surfaces classification, status, sub-status, follow-up date, inquiry-made-by, and remark in the primary row view
- current screenshot surface shown here emphasizes date, source, customer, contact, car of interest, budget, and visited date, with less operational follow-up context visible in the same row
- legacy row displays full vehicle detail blocks
- current row visually appears to collapse vehicle detail into a single summary string
- legacy screen makes the operational actions obvious in-row:
  - edit follow-up
  - view follow-up
  - edit inquiry
- current screenshot portion does not visibly communicate the same dense row-level action model

Design and workflow implication:

- current UI is cleaner and more modern
- legacy UI exposes more of the follow-up operator workflow without needing extra navigation or hidden controls
- parity work should preserve the cleaner Next.js direction while restoring the missing operational visibility

## 1. Dashboard Drill-down Coverage

**Feature / Business Logic Name:** Dashboard follow-up lead buckets  
**Existing System Behavior:** Legacy dashboard links open follow-up results for `All_Leads_Count`, `Fresh_Leads`, `Today_Appoinment_Fixed_Count`, `Follow_up_Today`, `Pending_Follow_up`, `Follow_up_Upcoming`, and `Closed`, with both `Total` and `Own` variants.  
**Current Next.js Status:** Dashboard only links to generic pending follow-ups and overdue follow-ups.  
**Missing Functionality or Logic:** No dedicated drill-down entry points for fresh leads, appointment fixed today, upcoming follow-ups, all leads, or closed leads. No `Own` dashboard variants.  
**Required Improvement:** Add explicit dashboard links and matching queue presets, or document an approved replacement dashboard behavior.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Views\Home\DashBoard.cshtml`, `D:\projects\ExcelCars\ApModel\Model\Followup_Management\Followup_Management.cs`  
**Priority / Impact:** High

## 2. Creator-Based Own Filtering

**Feature / Business Logic Name:** Own-count and self-only filtering  
**Existing System Behavior:** Legacy supports `Type_of_Count = Own`, and role id `4` users are always restricted to creator-owned inquiries.  
**Current Next.js Status:** Partially fixed. Restricted follow-up users now get creator-only visibility in `/followup`, matching the legacy queue rule more closely. Other users can still view all rows or narrow manually with the user filter.  
**Missing Functionality or Logic:** Dedicated dashboard `Own` drill-down entry links are still not implemented.  
**Required Improvement:** Keep the creator-only restriction for restricted follow-up users and add explicit dashboard `Own` presets later if required.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ApModel\Model\Followup_Management\Followup_Management.cs`, `D:\projects\ExcelCars\ExcelCars\Views\Home\DashBoard.cshtml`  
**Priority / Impact:** High

## 3. Follow-up Permission Granularity

**Feature / Business Logic Name:** Module-specific authorization  
**Existing System Behavior:** Legacy page actions use `AuthorizeFilter(DatabaseFunctionname = "FollowUp_Management")`.  
**Current Next.js Status:** Covered. `/followup` route access, export API, and history API already enforce function-based access through `canCurrentUserAccessRoute('/followup')` and `getAuthorizedUserIdForRoute('/followup')`, which is the current RBAC equivalent of legacy function-level authorization.  
**Missing Functionality or Logic:** None for the current access-control baseline.  
**Required Improvement:** Completed for the current implementation baseline.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Controllers\AdminController.cs`  
**Priority / Impact:** High

## 4. Multi-Car Visibility In Queue

**Feature / Business Logic Name:** Full inquiry car-detail visibility  
**Existing System Behavior:** Legacy queue renders every linked car of interest in the row.  
**Current Next.js Status:** Covered. Current queue renders all linked `inquiryCarDetails` blocks inline, and export expands per inquiry-car row.  
**Missing Functionality or Logic:** None for core multi-car visibility in the queue/export.  
**Required Improvement:** Completed for the current implementation baseline.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Views\Admin\Follow_Up_Management.cshtml`, `D:\projects\ExcelCarsNextJs\src\features\followup\queries.ts`, `D:\projects\ExcelCarsNextJs\src\features\followup\FollowupClient.tsx`  
**Priority / Impact:** High

## 5. Export History Detail Coverage

**Feature / Business Logic Name:** Export of previous follow-up details  
**Existing System Behavior:** Legacy export includes both latest inquiry state and prior follow-up history fields, producing one row per inquiry/car/history combination.  
**Current Next.js Status:** Covered. Current export includes previous follow-up date, status, sub-status, comments, and classification, and expands rows across inquiry-car and follow-up-history combinations.  
**Missing Functionality or Logic:** None for the approved export history coverage baseline.  
**Required Improvement:** Completed for the current implementation baseline.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Controllers\AdminController.cs`, `D:\projects\ExcelCars\ApModel\Model\Followup_Management\Followup_Management.cs`, `D:\projects\ExcelCarsNextJs\src\features\followup\FollowupClient.tsx`  
**Priority / Impact:** High

## 6. History Write Semantics Mismatch

**Feature / Business Logic Name:** Meaning of `followupInquiry.followupDate`  
**Existing System Behavior:** Legacy follow-up history stores the chosen next follow-up date in `Followup_Inquiry.Followup_Date`.  
**Current Next.js Status:** Fixed. `/followup` and inquiry create/update now both store the selected scheduled follow-up date when status is `FollowUp`, and `null` when status is `Closed`.  
**Missing Functionality or Logic:** None for the core history-date contract. Readers and future reports should continue to rely on this normalized meaning.  
**Required Improvement:** Completed for the current implementation baseline.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ApModel\Model\Followup_Management\Followup_Management.cs`, `D:\projects\ExcelCarsNextJs\src\features\followup\actions.ts`, `D:\projects\ExcelCarsNextJs\src\features\inquiry\actions.ts`  
**Priority / Impact:** High

## 7. Validation Parity For Follow-up Save

**Feature / Business Logic Name:** Consistent follow-up validation  
**Existing System Behavior:** Legacy effectively allowed sparse saves except for `OTHER` sub-status text; it did not strongly enforce comments or future dates.  
**Current Next.js Status:** Fixed for the approved current contract. Client and server both enforce reached outcome, allowed status, allowed classification, required remark, and a required today-or-future next follow-up date when status is `FollowUp`.  
**Missing Functionality or Logic:** None for the current approved validation contract. This remains stricter than legacy by design unless later changed.  
**Required Improvement:** Completed for the current implementation baseline.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Views\Admin\Follow_Up_Management.cshtml`, `D:\projects\ExcelCarsNextJs\src\features\followup\FollowupClient.tsx`, `D:\projects\ExcelCarsNextJs\src\features\followup\actions.ts`  
**Priority / Impact:** Medium-High

## 8. Legacy `OTHER` Sub-status Support

**Feature / Business Logic Name:** Explicit `OTHER` sub-status flow  
**Existing System Behavior:** Legacy queue provides an `OTHER` option and a mandatory text input for the real sub-status value.  
**Current Next.js Status:** Covered. Current modal now provides a standard sub-status picker plus explicit `OTHER`, and requires custom text when `OTHER` is selected. The stored value remains the real entered sub-status text.  
**Missing Functionality or Logic:** None for the approved legacy-style `OTHER` workflow.  
**Required Improvement:** Completed for the current implementation baseline.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Views\Admin\Follow_Up_Management.cshtml`  
**Priority / Impact:** Medium

## 9. Customer Name Search Field Specificity

**Feature / Business Logic Name:** Dedicated customer-name search field  
**Existing System Behavior:** Legacy has a separate customer name input with autocomplete.  
**Current Next.js Status:** Partially fixed. Current module now includes a dedicated customer-name filter, but it is a plain text filter rather than autocomplete-assisted legacy search.  
**Missing Functionality or Logic:** Autocomplete-assisted customer-name picking is still absent.  
**Required Improvement:** Keep the dedicated filter and add autocomplete later only if operators still rely on it.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Views\Admin\Follow_Up_Management.cshtml`  
**Priority / Impact:** Medium

## 10. Source / Website Governance

**Feature / Business Logic Name:** Controlled website/source taxonomy  
**Existing System Behavior:** Legacy website filter uses an autocomplete endpoint and exact matching.  
**Current Next.js Status:** Complete. Next.js now uses `inquiry_source_master` with stable codes, a legacy mapping table, exact code filtering, and assigns historic blank Website values to `Unknown`.  
**Missing Functionality or Logic:** No source-management administration screen exists yet; master rows are seeded from the approved workbook.  
**Required Improvement:** Add a restricted source-master administration screen only when business users need to add, disable, or reorder sources themselves.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Views\Admin\Follow_Up_Management.cshtml`, `D:\projects\ExcelCars\ApModel\Model\Followup_Management\Followup_Management.cs`  
**Priority / Impact:** Medium

## 11. Free-text Vehicle Search Parity

**Feature / Business Logic Name:** Free-text make/model/variant filtering  
**Existing System Behavior:** Legacy filters vehicle text exactly through autocomplete-backed text inputs against stored legacy strings.  
**Current Next.js Status:** Complete. Next.js provides independent Make, Model, and Variant text filters alongside normalized dropdowns. Each text criterion matches historic text fields and normalized catalog values on the same inquiry-car row.  
**Missing Functionality or Logic:** Legacy autocomplete assistance is intentionally not required for the current baseline; typing directly is supported.  
**Required Improvement:** Completed for the approved search baseline.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ApModel\Model\Followup_Management\Followup_Management.cs`, `D:\projects\ExcelCars\ExcelCars\Views\Admin\Follow_Up_Management.cshtml`, `D:\projects\ExcelCarsNextJs\src\features\followup\queries.ts`  
**Priority / Impact:** Medium-High

## 12. Car Details Popup Action

**Feature / Business Logic Name:** On-demand car-detail popup  
**Existing System Behavior:** Legacy still contains AJAX and modal support for car-detail viewing, even though the visible row action is currently commented out.  
**Current Next.js Status:** No equivalent dedicated car-detail popup exists.  
**Missing Functionality or Logic:** No quick secondary vehicle-detail viewer apart from the single summary row.  
**Required Improvement:** Low priority unless users rely on quick full vehicle inspection from the queue.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Views\Admin\Follow_Up_Management.cshtml`, `D:\projects\ExcelCars\ExcelCars\Controllers\AdminController.cs`  
**Priority / Impact:** Low

## 13. Full History Visibility In Modal

**Feature / Business Logic Name:** Complete follow-up history visibility  
**Existing System Behavior:** Legacy history popup loads all follow-up rows for the inquiry.  
**Current Next.js Status:** Covered. Quick log modal still loads recent history for speed, and the dedicated follow-up history view can load all entries for the inquiry.  
**Missing Functionality or Logic:** None for full-history visibility in the current modal/view flow.  
**Required Improvement:** Completed for the current implementation baseline.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ApModel\Model\Followup_Management\Followup_Management.cs`, `D:\projects\ExcelCarsNextJs\src\features\followup\queries.ts`  
**Priority / Impact:** Medium

## 14. History Field Visibility

**Feature / Business Logic Name:** Show full history metadata  
**Existing System Behavior:** Legacy history query includes status and sub-status, although the popup only renders dates and comments.  
**Current Next.js Status:** Current modal renders status and sub-status/comments summary, but not classification or entry date.  
**Missing Functionality or Logic:** Neither system exposes the complete history payload cleanly, but the current version also hides entry date and classification.  
**Required Improvement:** Consider a richer history panel showing entry date, scheduled date, status, sub-status, classification, comments, and user.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ApModel\Model\Followup_Management\Followup_Management.cs`, `D:\projects\ExcelCarsNextJs\src\features\followup\FollowupClient.tsx`  
**Priority / Impact:** Medium

## 15. Search Result Pagination Difference

**Feature / Business Logic Name:** All-at-once queue versus paginated queue  
**Existing System Behavior:** Legacy shows the full result set in one page.  
**Current Next.js Status:** Current module paginates at 25 rows.  
**Missing Functionality or Logic:** This is a behavioral difference rather than a pure missing feature; some legacy workflows may expect one long list.  
**Required Improvement:** Confirm whether pagination is acceptable or whether users need a much larger page size / all-rows mode.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ApModel\Model\Followup_Management\Followup_Management.cs`, `D:\projects\ExcelCarsNextJs\src\features\followup\queries.ts`  
**Priority / Impact:** Medium

## 16. Save Response Messaging Parity

**Feature / Business Logic Name:** Explicit success/error flash messaging  
**Existing System Behavior:** Legacy sets TempData success, warning, and error messages after search/save/export actions.  
**Current Next.js Status:** Current queue mostly uses inline modal or export errors and silent success via refresh.  
**Missing Functionality or Logic:** No explicit persisted success confirmation after follow-up save.  
**Required Improvement:** Add toast/banner success messaging if operator feedback is important.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Controllers\AdminController.cs`, `D:\projects\ExcelCarsNextJs\src\features\followup\FollowupClient.tsx`  
**Priority / Impact:** Low-Medium

## 17. Legacy Menu / Inquiry Cross-link Expectations

**Feature / Business Logic Name:** Follow-up entry from inquiry module and menu parity  
**Existing System Behavior:** Legacy menu and inquiry module both explicitly link to follow-up management.  
**Current Next.js Status:** Sidebar contains a follow-up navigation item; inquiry deep-links back into follow-up are less explicit.  
**Missing Functionality or Logic:** Direct cross-entry parity from inquiry workflows may be incomplete depending on expected UX.  
**Required Improvement:** Confirm whether explicit “Go to Follow-up” entry points are needed from inquiry screens and dashboard summaries.  
**Relevant Existing Code Location:** `D:\projects\ExcelCars\ExcelCars\Views\Admin\InquiryManagement.cshtml`, `D:\projects\ExcelCars\ExcelCars\Views\Shared\Menu.cshtml`, `D:\projects\ExcelCarsNextJs\src\components\Layout.tsx`  
**Priority / Impact:** Low

## 18. Export Column Label Accuracy

**Feature / Business Logic Name:** Accurate export labeling for inquiry creator  
**Existing System Behavior:** Legacy export does not expose this mislabeled column.  
**Current Next.js Status:** Current export header says `Inquiry Made By User ID`, but the exported value is display name first, then username, then numeric id as fallback.  
**Missing Functionality or Logic:** Export schema is misleading for downstream users and may be interpreted incorrectly.  
**Required Improvement:** Rename the column to something accurate such as `Inquiry Made By`, or export the actual numeric user id consistently if that is what downstream consumers expect.  
**Relevant Existing Code Location:** `D:\projects\ExcelCarsNextJs\src\features\followup\FollowupClient.tsx`  
**Priority / Impact:** Low-Medium

## Recommended Implementation Order
1. Normalize follow-up history write semantics.
2. Restore authorization and creator-based visibility rules if they are still part of the business policy.
3. Restore dashboard drill-down coverage.
4. Fix multi-car visibility and export/history parity.
5. Align client/server validation.
6. Then decide on workflow polish items such as autocomplete, full-history view, and success messaging.
