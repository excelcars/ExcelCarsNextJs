# SSOT - Admin Follow_Up_Management Module
## Status: Legacy ASP.NET MVC implemented; extracted from existing codebase

**Module:** `Admin/Follow_Up_Management`  
**Project:** `ExcelCars` legacy ASP.NET MVC  
**Primary entry points:** `AdminController.Follow_Up_Management()`, `AdminController.Search_All_Followup()`, `AdminController.Insert_Update_Followup()`, `AdminController.Get_Followup_From_Dashboard()`  
**Source of truth for this document:** `D:\projects\ExcelCars\ExcelCars\Controllers\AdminController.cs`, `D:\projects\ExcelCars\ExcelCars\Views\Admin\Follow_Up_Management.cshtml`, `D:\projects\ExcelCars\ExcelCars\ViewModel\Followup_ViewModel.cs`, `D:\projects\ExcelCars\ApModel\Model\Followup_Management\Followup_Management.cs`, `D:\projects\ExcelCars\ExcelCars\Views\Home\DashBoard.cshtml`, `D:\projects\ExcelCars\ExcelCars\Views\Shared\Menu.cshtml`

## 1. Purpose
This module is the legacy inquiry follow-up work queue. It is not the inquiry-create form itself; instead it is an inquiry-centric operating screen for:

- finding inquiries by follow-up and inquiry filters
- reviewing the inquiry’s customer, car-interest, and latest follow-up state
- logging the next follow-up directly from the queue row
- viewing prior follow-up history for an inquiry
- jumping from the follow-up queue into legacy inquiry editing
- opening filtered follow-up lists from dashboard counters
- exporting follow-up rows, including previous follow-up details

It owns:

- queue-style search over `Inquiries`
- append-only follow-up history creation in `Followup_Inquiry`
- synchronized update of latest follow-up fields on the parent `Inquiries` row
- role-based narrowing for role id `4`
- dashboard counter drill-down behavior for follow-up-related lead buckets

It does not own:

- inquiry creation
- inquiry car-detail editing
- customer master editing
- authentication/session lifecycle
- dashboard counter calculation outside the follow-up model

## 2. Locked Legacy Scope
- the menu links into `/Admin/Follow_Up_Management`
- all page-postback actions require a session and `AuthorizeFilter(DatabaseFunctionname = "FollowUp_Management")`
- the screen is postback-driven; search, reset, export, edit-follow-up save, and edit-inquiry navigation all submit the same HTML form
- the queue is inquiry-based, but each inquiry may show multiple car-interest rows inline
- inline queue editing is limited to:
  - classification
  - status
  - sub-status
  - next follow-up date
  - next remark
- history and car-detail popups are loaded with AJAX
- the module treats `Followup_Inquiry` as append-only history; it no longer updates a matching prior history row
- dashboard drill-down can pre-populate the follow-up screen with a predefined lead bucket and, optionally, the current user’s own rows

## 3. Data Ownership

Primary tables read and written:

- `Inquiries`
- `Inquiry_Car_Details`
- `Followup_Inquiry`
- `User_Table`

Minimum `Inquiries` fields used directly:

- `Inquiry_Id`
- `Inquiry_No`
- `Date_of_Inquiry`
- `WebSite`
- `Customer`
- `MobileNo`
- `Email`
- `Budget_of_Customer`
- `Visited_Date_of_Customer`
- `Classification`
- `Status`
- `Sub_Status`
- `Follow_Up_Date`
- `Remark`
- `Created_By`
- `Created_Dt`
- `Updated_By`
- `Updated_Dt`

Minimum `Inquiry_Car_Details` fields used directly:

- `Inquiry_Car_Details_ID`
- `FK_Inquiry_Id`
- `Make`
- `Model`
- `Variant`
- `Sub_Variant`
- `Year`

Minimum `Followup_Inquiry` fields used directly:

- `PK_Followup_ID`
- `FK_Inquiry_Id`
- `Followup_Date`
- `Followup_Status`
- `Followup_Sub_Status`
- `Comments`
- `Followup_Classification`
- `Created_Dt`
- `Created_By`
- `Updated_Dt`
- `Updated_By`

Minimum `User_Table` fields used directly:

- `User_ID`
- `User_Name`
- `Display_Name`
- `Role_ID`
- `Role_Name`
- `Status` is not checked here

## 4. Interface Contracts

Required controller actions:

- `Follow_Up_Management()`
- `Search_All_Followup(Followup_ViewModel objvm)`
- `Insert_Update_Followup(Followup_ViewModel objvm)`
- `Get_Followup_From_Dashboard(string condition, string Type_of_Count)`
- `Edit_Edit_Search_Inquiry_From_Followup(int InquiryId)`
- `ExportToExcel_Followup_Details(Followup_ViewModel objvm)`
- `Get_Car_Details(int inquiryid)`
- `Get_Followup_Details(int inquiryid)`

Required model/service methods:

- `Search_Followup_Details_List()`
- `Update_Inquiry_Followup(int inquiryid)`
- `Get_Followup_Details(int inquiryid)`
- `Get_Followup_Details_From_Dashboard(string Condition, string Type_of_Count)`
- `Export_to_excel_Followup()`
- `Get_Car_Details(int inquiryid)`
- `Get_Status()`
- `Get_Classification()`
- `Get_SubStatus()`
- `Get_lst_Logged_In_User()`
- `Get_Pending_Followup_Count_Till_Today()`
- `Get_Todays_Followup_Count()`
- `Get_Total_Followup_Count()`

Required UI surfaces:

- search form
- follow-up result table
- inline row edit/save controls
- follow-up history popup
- car-details popup
- export action
- reset action
- edit-inquiry jump action

## 5. Default Initialization
`Followup_ViewModel` constructs `Followup_Management`, and the model constructor immediately populates:

- pending follow-up count till today
- today’s follow-up count
- total follow-up count
- status list: `FollowUp`, `Closed`
- classification list: `Hot`, `Cold`, `Warm`
- sub-status list from distinct non-null `Inquiries.Sub_Status`
- user filter list from `User_Table` where `Role_ID >= current role id`

The initial page load does not auto-run the main queue search. The table is populated only when:

- the user searches
- the user saves a follow-up
- the user opens the page from a dashboard follow-up drill-down

## 6. Search And Filtering

Search fields rendered on the page:

- from follow-up date
- to follow-up date
- from inquiry date
- to inquiry date
- customer name
- customer mobile
- make
- model
- variant
- classification
- status
- sub-status
- reference website
- inquiry made by user
- customer visited from date
- customer visited to date

Behavioral rules:

- date inputs are read-only text fields enhanced by jQuery datetimepicker using `dd/MM/yyyy`
- customer name uses autocomplete from `/Admin/Autocomplete_CustName_Inquiry`
- make/model/variant use text autocomplete endpoints, not master-id dropdowns
- reference website uses autocomplete from `/Admin/AutoCompleteRef_Website`
- make/model/variant filters are exact string matches against `Inquiry_Car_Details.Make/Model/Variant`
- customer name and mobile are substring matches
- status, sub-status, classification, website, and user are exact matches
- visited-date and inquiry-date filters are inclusive range filters
- follow-up-date range is applied against `Inquiries.Follow_Up_Date`
- search joins `Inquiries` with `Inquiry_Car_Details`, then de-duplicates the inquiry rows
- default search does not force `Status = FollowUp`; closed rows can appear if the filter is left blank

Role logic:

- after query materialization, if the logged-in user has `Role_ID == 4`, results are restricted to rows where `Created_By == logged-in user`
- this restriction applies even when broader filters were requested

Sorting and pagination:

- query is ordered by `Created_Dt` descending
- there is no server pagination
- the full result set is rendered in one table

## 7. Queue Table Behavior
Each result row shows:

- inquiry date
- website
- customer name
- mobile
- email
- all car details linked to the inquiry, each printed as make/model/variant/year with separators
- budget
- visited date
- classification
- status
- sub-status
- follow-up date
- inquiry-created-by display name
- latest remark

Visual rules:

- classification cells are recolored by client script:
  - `Hot` -> red
  - `Cold` -> green
  - `Warm` -> yellow
- inquiry made by the current user is blue text
- inquiry made by another user is red text

Actions per row:

- `Edit Followup`: turns display cells into editable controls
- `Save Followup`: writes hidden form fields and submits the whole page
- `View Followup`: opens a popup that AJAX-loads prior history
- `Edit Inquiry`: redirects into the legacy inquiry module with the inquiry loaded
- there is commented-out car-detail popup code; the popup still exists and AJAX helper exists, but the visible table action is disabled in current markup

## 8. Inline Follow-up Editing Rules
When the user clicks edit on a row, the page toggles that row into edit mode and exposes:

- classification select
- status select
- sub-status select
- next follow-up date text input
- next remark text input

Sub-status handling:

- the selectable sub-status list is the distinct historic list from inquiry data
- there is a hardcoded additional `OTHER` option
- when `OTHER` is chosen, an extra text box is shown
- save is blocked client-side if `OTHER` is chosen and the text box is empty
- when `OTHER` is used, the free-text sub-status is what gets written into `MainNext_Sub_Status`

Save submission behavior:

- row values are copied into hidden form fields:
  - `MainInquiryid`
  - `MainClassification`
  - `MainFollowup_Status`
  - `MainFollow_Up_Date`
  - `MainNext_Remark`
  - `MainNext_Sub_Status`
- the form posts to `/Admin/Insert_Update_Followup`
- scroll position is preserved through hidden `SCROLLPOSITIONX/Y`

Notable validation behavior:

- there is no explicit client or server validation that `Next_Remark` must be non-empty
- there is no explicit validation that `Followup_Status = FollowUp` requires a non-null next follow-up date
- there is no explicit validation preventing past dates
- the server only checks `if (this.Follow_Up_Date != null)` before inserting history

## 9. Save / Update Business Logic
`Update_Inquiry_Followup(int inquiryid)` runs inside a `TransactionScope`.

Write behavior:

- if `Follow_Up_Date != null`, a brand-new `Followup_Inquiry` row is inserted
- the history row copies:
  - inquiry id
  - follow-up date from the edited row’s next follow-up date
  - follow-up status
  - follow-up sub-status
  - comments from next remark
  - follow-up classification
  - created/updated audit fields from the logged-in user
- then the parent `Inquiries` row is updated with:
  - classification
  - follow-up date
  - status
  - remark
  - sub-status
  - updated audit fields

Historical rule:

- older dedupe/update logic exists only as commented code
- current behavior is append-only on every save

Transaction/error behavior:

- the code intends the history insert plus inquiry update to commit atomically
- save success is returned through `Is_Save_Success`
- controller sets success or error TempData messages after the postback

## 10. History Popup Behavior
`View Followup` calls `/Admin/Get_Followup_Details?inquiryid={id}` with AJAX.

Returned history is:

- sorted by `PK_Followup_ID` descending
- displayed as:
  - entry date (`Created_Dt`)
  - follow-up date
  - comments

Important omissions:

- popup data fetch selects `Followup_Status` and `Followup_Sub_Status`, but the current popup UI does not render them
- history method appends into `lst_FollowupDetails` and does not clear it locally before the loop, but fresh controller instances make that safe in normal use

## 11. Dashboard Drill-down Contracts
Dashboard counters link into `/Admin/Get_Followup_From_Dashboard`.

Supported `condition` values:

- `All_Leads_Count`
- `Fresh_Leads`
- `Today_Appoinment_Fixed_Count`
- `Follow_up_Today`
- `Pending_Follow_up`
- `Follow_up_Upcoming`
- `Closed`

Supported `Type_of_Count` values:

- `Total`
- `Own`

Behavior by condition:

- `All_Leads_Count`
  - all inquiries
  - no forced status
- `Fresh_Leads`
  - `Date_of_Inquiry == today`
  - `Status == FollowUp`
  - also pre-fills inquiry from/to date as today
- `Today_Appoinment_Fixed_Count`
  - `Follow_Up_Date == today`
  - `Status == FollowUp`
  - `Sub_Status == "Appt. Fixed"`
  - pre-fills follow-up from/to date as today and sub-status as `Appt. Fixed`
- `Follow_up_Today`
  - `Follow_Up_Date == today`
  - `Status == FollowUp`
  - pre-fills follow-up from/to date as today
- `Pending_Follow_up`
  - `Follow_Up_Date < today`
  - `Status == FollowUp`
  - pre-fills follow-up to date as yesterday
- `Follow_up_Upcoming`
  - `Follow_Up_Date > today`
  - `Status == FollowUp`
  - pre-fills follow-up from date as tomorrow
- `Closed`
  - `Status == Closed`

Own-count rule:

- if `Type_of_Count == "Own"`, results are further restricted to `Created_By == logged-in user`
- the user filter is also set to the logged-in user id

## 12. Export Behavior
`ExportToExcel_Followup_Details` calls `Export_to_excel_Followup()` and then exports a flattened dataset.

Export query joins:

- `Inquiries`
- `Inquiry_Car_Details`
- `Followup_Inquiry`

Consequences:

- one inquiry can produce multiple export rows
- multiple cars multiplied by multiple follow-up history rows can create repeated combinations

Exported output includes both latest inquiry state and previous history fields:

- inquiry no
- inquiry date
- website
- customer
- mobile
- email
- make
- model
- variant
- year
- budget
- visited date
- latest classification
- latest status
- latest sub-status
- latest follow-up date
- latest remark
- previous follow-up date
- previous follow-up status
- previous follow-up sub-status
- previous comments
- previous follow-up classification

Role rule:

- export results are restricted to creator-owned rows for role id `4`

## 13. Navigation And Cross-Module Links
- the shared menu exposes `Follow up Management`
- legacy inquiry screen links to `/Admin/Follow_Up_Management`
- each follow-up row can jump into inquiry editing through `/Admin/Edit_Edit_Search_Inquiry_From_Followup?InquiryId={id}`
- dashboard follow-up counters are first-class entry points into this module

## 14. Security And Access Notes
- main page actions have the legacy `AuthorizeFilter(DatabaseFunctionname = "FollowUp_Management")`
- `Get_Car_Details` and `Get_Followup_Details` do not carry that attribute in the current controller snippet
- both JSON endpoints rely on the surrounding app/session state rather than explicit action-level authorization in this code

## 15. Known Legacy Constraints
- all main interactions are full form postbacks
- there is no pagination for large queues
- search uses free-text autocomplete for make/model/variant rather than normalized ids
- dashboard drill-down behavior is embedded in module code rather than generic filtering
- inline update writes only latest inquiry follow-up fields plus append-only history; it does not edit any other inquiry data
- car details are fully visible in the queue, but their dedicated popup action is effectively hidden
- no durable distinction exists between a follow-up “log time” and “next scheduled follow-up” beyond the chosen date stored in both parent and child contexts

## 16. Tests Required
- unauthenticated or unauthorized access to page-postback actions is rejected
- constructor populates status, classification, sub-status, and user filter lists
- search applies all date, customer, vehicle, website, user, classification, status, and sub-status filters correctly
- role id `4` users only see their own created inquiries
- dashboard drill-down conditions populate the correct filtered result sets
- `Type_of_Count = Own` narrows dashboard drill-down to the current user
- inline save with `OTHER` sub-status requires free-text value client-side
- save appends a new `Followup_Inquiry` row
- save updates latest follow-up fields on `Inquiries`
- history popup returns rows newest first
- export includes both latest inquiry state and previous follow-up history fields
- export duplicates are understood for inquiry x car x history combinations

## 17. SSOT Rule
Any migration or rewrite of legacy `Admin/Follow_Up_Management` must preserve or explicitly replace:

- inquiry-level follow-up queue behavior
- dashboard counter drill-down entry points
- append-only follow-up history creation
- synchronized parent inquiry latest-state update
- creator-based “Own” filtering and role-id-4 self-only restriction
- full search/filter coverage across inquiry, follow-up, vehicle, source, and user fields
