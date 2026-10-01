# SSOT - Today's Inquiry And Followup Report (Legacy)

## Status: Legacy ASP.NET MVC behavior captured from source

**Module:** `Report/Todays_Inquiry_Followup_Report`  
**Project:** `ExcelCars` legacy ASP.NET MVC  
**Primary route:** `GET /Report/Todays_Inquiry_Followup_Report`  
**Source of truth:**
- `ExcelCars/Controllers/ReportController.cs`
- `ExcelCars/Views/Report/Todays_Inquiry_And_Followup_Report.cshtml`
- `ExcelCars/ViewModel/Todays_Inquiry_Followup_Report_ViewModel.cs`
- `ApModel/Model/Todays_Inquiry_And_Followup_Report/Todays_Inquiry_And_Followup_Report.cs`
- `ExcelCars/Views/Shared/Menu.cshtml`
- `ExcelCars/Views/Report/Reports_Menu_View.cshtml`

## 1. Purpose

This is a read-only report of follow-up-history activity. Despite its title, it does not select inquiries created today and it does not select inquiries whose next follow-up is today. It selects `Followup_Inquiry` records whose **history-row `Updated_Dt`** falls in the selected inclusive calendar-date range, then joins each history row to its parent inquiry.

It owns:
- a date-range and user-filtered follow-up-history report;
- a tabular inquiry/customer/vehicle/audit projection;
- a server-generated Excel export of the same effective query; and
- role-4 creator-only row restriction.

It does not own inquiry or follow-up editing, follow-up scheduling, searching by customer/vehicle/status, pagination, sorting controls, or report drill-through actions.

## 2. Entry Points And Authorization

The legacy Reports menu and the Reports landing page show the entry only when the session function list contains `Todays_Inquiry_Followup_Report`. Both point to `/Report/Todays_Inquiry_Followup_Report`.

All three controller actions have `AuthorizeFilter(DatabaseFunctionname = "Todays_Inquiry_Followup_Report")` and separately check `Session["SessionInfo"]`. A missing session redirects to `Home/Logout`.

| Action | Verb implied by view | Behavior |
| --- | --- | --- |
| `Todays_Inquiry_Followup_Report` | GET / reset POST | Creates a new view model and renders the blank report form. |
| `Search_Todays_Inquiry_Followup_Report` | POST | Runs the report query, adds a warning when no rows are returned, and renders the same view. |
| `ExportToExcel_Todays_Inquiry_Followup_Report` | POST | Re-runs the report query, projects export fields, and calls `Utility.GetExcel`. |

## 3. Initial State And Inputs

The view-model constructor creates `Todays_Inquiry_And_Followup_Report`. Its constructor:
- loads the user dropdown;
- sets `Form_From_Date` and `Form_To_Date` to `DateTime.Now`; and
- leaves the result list empty.

The initial GET does **not** run a query. Results appear only after Search. Reset posts the form to the initial action, which creates a fresh model and returns to the current local date with no results.

Visible form controls:

| Control | Model field | Behavior |
| --- | --- | --- |
| From Date | `Form_From_Date` | Read-only text input enhanced by jQuery datetimepicker; format `dd/MM/yyyy`; marked searchable, not mandatory. |
| To Date | `Form_To_Date` | Same behavior as From Date. |
| User Name | `Form_User_ID` | `SELECT` is submitted as the default/zero value; otherwise filters `Followup_Inquiry.Updated_By`. |
| Search | n/a | Changes the shared form action to the search action and posts it. |
| Reset | n/a | Changes the shared form action to the initial action and posts it. |
| Export to Excel | n/a | Only rendered when the current result list has at least one row; changes the form action to the export action and posts it. |

There is no client-side date ordering, required-field, or malformed-date validation in this view. Binding/conversion failures flow to the search action's catch block and produce the generic contact-system error message.

## 4. User Picker Scope

`Get_lst_Logged_In_User()` reads `User_Table` where `Role_ID >= current session Role_ID`. It includes user id, username, role id, and role name, with no `Status` filter and no explicit ordering. Thus the available Updated By filter is role-hierarchy scoped, not a list of all active users.

## 5. Query, Data Ownership, And Row Semantics

Primary sources are `Followup_Inquiry`, `Inquiries`, `Inquiry_Car_Details`, and `User_Table`.

`Search_Inquiry_Followup_Details()`:
1. inner-joins `Followup_Inquiry f` to `Inquiries i` on inquiry id;
2. filters `TruncateTime(f.Updated_Dt)` inclusively from `TruncateTime(Form_From_Date.Date)` through `TruncateTime(Form_To_Date.Date)`;
3. applies `f.Updated_By == Form_User_ID` only when the submitted user id is non-zero;
4. emits one report row per qualifying follow-up history row, including repeated parent inquiry values when an inquiry has multiple qualifying history rows;
5. resolves each row's parent-inquiry creator and history-row updater usernames with individual `User_Table.SingleOrDefault` lookups;
6. separately loads all `Inquiry_Car_Details` for each row's inquiry; and
7. after materialization, restricts role id `4` to rows whose **parent inquiry `Created_By`** equals the current user.

No `OrderBy`, de-duplication, pagination, or count calculation is present. Result order is database/provider order. The report intentionally uses follow-up-history classification/status/sub-status/date/comments, not the current fields on the parent inquiry; the alternative parent-field assignments are commented out in the source.

The vehicle lookup uses legacy `Make`, `Model`, `Variant`, and `Year`; it loads `Sub_Variant` but does not render it. It causes an N+1 query pattern: one vehicle lookup per returned history row, including duplicate lookups for repeated inquiries.

## 6. Table Contract

When at least one row exists, the page renders a serial number and nine grouped columns:

| Group | Values rendered |
| --- | --- |
| Inquiry | inquiry number, inquiry date, website |
| Customer Details | customer name, mobile, email |
| Car Details | every linked vehicle's make, model, variant, and year |
| Budget | inquiry budget and visited date; missing visited date displays `NA` |
| Follow-up State | history classification, status, sub-status |
| Follow-up Detail | history follow-up date and history comments/remark |
| Created Audit | parent inquiry created date and creator username |
| Updated Audit | history row updated date and updater username |

Date values equal to `DateTime.MinValue` are blank except visited date, which becomes `NA`. There are hidden inquiry/customer/creator/updater ids in the markup, but no interactive behavior consumes them. No table headers are clickable in this view, even though the table id resembles a table-sorter example.

## 7. Export Contract

Export re-runs the same query using the posted filters, rather than exporting only the browser-rendered rows. `Utility.GetExcel` receives a projection named `Todays_Inquiry_Followup_Report` with:
- inquiry date and website;
- customer name, mobile, and email;
- history classification, status, sub-status, follow-up date, and comments;
- parent created date, history updated date, creator/updater names; and
- a single newline-delimited `Car_Details` string.

The export excludes inquiry number, customer id, budget, visited date, and serial number despite the on-screen table showing several of them. The export action's no-result check uses `< 0`, which can never be true, so no no-record warning is emitted from export.

## 8. Error And Edge Behavior

- Search returns a `Record_Not_found` warning when the list is empty.
- Search catches exceptions, logs them through `Exceptioncatch.create`, and uses `ContactSystem` / error TempData.
- The initial action and export action do not wrap their main query in a try/catch.
- Inner join excludes orphaned follow-up history rows.
- `Convert.ToDateTime` / `Convert.ToDecimal` / `Convert.ToInt32` on nullable source fields can turn nulls into defaults or fail depending on runtime value; the source contains no defensive null handling.
- The role-4 restriction is applied after all queried rows and vehicle/user lookups have been materialized.

## 9. Legacy Invariants

Any compatible replacement must either preserve or explicitly replace:
- filtering on follow-up-history `Updated_Dt`, not parent inquiry update date or scheduled follow-up date;
- inclusive calendar-day range semantics;
- one row per matching history record;
- history-row values as the displayed follow-up state;
- `Updated By` filtering against the history row;
- role-4 restriction to parent inquiry creator only; and
- equivalent export query/filter semantics.

## 10. Tests Required

- authorized users can load, search, reset, and export;
- initial load has default dates and no result rows;
- the date range includes both endpoints by history-row update date;
- user filtering applies to history-row updater;
- multiple matching history rows for one inquiry remain distinct rows;
- history fields, not parent inquiry current fields, are displayed;
- role id 4 sees only parent inquiries they created;
- role-hierarchy user picker behavior is preserved or intentionally replaced;
- export uses the same filters as search and its reduced field contract is understood;
- no-result search produces the warning.

## 11. SSOT Rule

This document describes executable legacy behavior, including defects and implementation limitations. It is not a product specification for retaining those defects. Any deliberate divergence must be recorded in the Next.js SSOT and the improvement/gap document.
