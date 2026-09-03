# Dashboard - Existing-System SSOT

## 1. Purpose and evidence

This document records the observed legacy ASP.NET MVC Dashboard behavior only. It was produced from two code-review passes over the Razor view, controller actions, view model, dashboard model, follow-up drill-down model, shared menu, and linked module routes.

Legacy project: `C:\Ruchita\Next\Universe_CC_tool\ExcelCars`  
Legacy route: `/Home/DashBoard`  
Primary module: `Home/DashBoard`

## 2. Source of truth

- `ExcelCars\Controllers\HomeController.cs`
- `ExcelCars\Views\Home\DashBoard.cshtml`
- `ExcelCars\ViewModel\DashBoard_ViewModel.cs`
- `ApModel\Model\DashBoard\DashBoard_Management.cs`
- `ExcelCars\Controllers\AdminController.cs`
- `ApModel\Model\Followup_Management\Followup_Management.cs`
- `ExcelCars\Views\Admin\Follow_Up_Management.cshtml`
- `ExcelCars\Views\Shared\Menu.cshtml`

## 3. Business purpose and scope

The dashboard is a read-only operational summary page. It aggregates inquiry/follow-up counts, customer birthday and anniversary reminders, pending insurance policy work, upcoming insurance renewal/expiry work, pending RTO transfer/RC work, and pending payment work across RTO, loan, and insurance modules.

The dashboard itself does not create, update, delete, export, filter, sort, or paginate records. Its actions are section expand/collapse links and drill-down links into Follow-up, Insurance, RTO, and Loan Management screens.

## 4. Access control and navigation

- The shared menu shows the Dashboard menu item under Admin Panel only when `SessionInfo.AppFunctionList.Contains("Home")`.
- The dashboard Razor content is also wrapped in `AppFunctionList.Contains("Home")`.
- `HomeController.DashBoard()` itself has no explicit `AuthorizeFilter` and no direct `Session["SessionInfo"]` null check before constructing `DashBoard_ViewModel`.
- Because `DashBoard_Management` reads `HttpContext.Current.Session["SessionInfo"]` during construction, opening the route without a valid session can fail at model construction rather than redirecting cleanly.
- The dashboard is reachable from the menu link `@Html.ActionLink("DashBoard", "DashBoard", "Home")`.
- The Excel Cars logo/home icon links to `/Home/AdminHome` when the user has `Home`.

## 5. Page layout and user interactions

The page title is `DashBoard`. It contains one form with id/name `Frm_DashBoard`, but there are no input fields or submit buttons.

Each dashboard section header is an `<a href="#">` handled by jQuery `slideToggle()`:

| Header link | Toggles element |
| --- | --- |
| Lead Details | `#div_lead_details` |
| Birthday/ Anniversary Details | `#div_birthday` |
| Pending Insurance Policy Details | `#div_pending_insurance_policy` |
| Expiry Date/Renewal Date of Policy | `#div_expiryrenewalpolicy` |
| RTO Pending Car Transfer/Pending RC Details | `#div_pending_car_transfer_policy` |
| RTO/Loan/Insurance Pending Payment Details | `#div_pending_payment` |

There is no default collapsed state in the view; the script only toggles when the header link is clicked.

## 6. Data loading lifecycle

`HomeController.DashBoard()` creates a new `DashBoard_ViewModel` and returns the `DashBoard` view. The view model constructor creates `DashBoard_Management`, and that constructor immediately loads every dashboard dataset:

1. inquiry/follow-up counts;
2. birthdays and anniversaries;
3. pending payments;
4. pending insurance policies;
5. insurance expiry/renewal rows;
6. RTO transfer/RC pending rows.

All queries use the current server date/time (`DateTime.Now`) and direct Entity Framework access through `Excel_CarsEntities`.

## 7. Lead Details table

The Lead Details table has columns `Leads Heads`, `Total Count`, `Own Count`, and `Other's Count`.

Rows:

| Row | Total count source | Own count source | Other count source |
| --- | --- | --- | --- |
| All Leads | `All_Leads_Count` | `Own_All_Leads_Count` | `Other_All_Leads_Count` |
| Fresh Leads | `Fresh_Lead_Count` | `Own_Fresh_Lead_Count` | `Other_Fresh_Lead_Count` |
| Today's Appointment Fixed | `Today_Appoinment_Fixed_Count` | `Own_Today_Appoinment_Fixed_Count` | `Other_Today_Appoinment_Fixed_Count` |
| Follow up Today | `Followup_Today_Count` | `Own_Followup_Today_Count` | `Other_Followup_Today_Count` |
| Pending Follow up | `Pending_Followup_Count` | `Own_Pending_Followup_Count` | `Other_Pending_Followup_Count` |
| Follow up (Upcoming) | `Future_Followup_Count` | `Own_Future_Followup_Count` | `Other_Future_Followup_Count` |
| Closed | `Closed_Count` | `Own_Closed_Count` | `Other_Closed_Count` |

Only the Total Count and Own Count values are links. Other Count values are plain text and have no drill-down.

### Lead count rules

Let `Today_date = DateTime.Now.Date` and `loginuserid = SessionInfo.UserId`.

For role id `4`, the displayed total counts are restricted to inquiries created by the logged-in user. For all other roles, displayed total counts are global and the Other counts are computed as rows whose `Created_By` is not the logged-in user. Own counts are always computed as rows whose `Created_By` equals the logged-in user.

Count rules:

- All Leads: all `Inquiries`; role `4` sees only own created rows.
- Fresh Leads: `Date_of_Inquiry == Today_date`; role `4` sees only own created rows. This count does not require `Status == "FollowUp"`.
- Today's Appointment Fixed: `Follow_Up_Date == Today_date`, `Status == "FollowUp"`, and `Sub_Status == "Appt. Fixed"`; role `4` sees only own created rows.
- Follow up Today: `Follow_Up_Date == Today_date` and `Status == "FollowUp"`; role `4` sees only own created rows.
- Pending Follow up: `Follow_Up_Date < Today_date` and `Status == "FollowUp"`; role `4` sees only own created rows.
- Follow up (Upcoming): `Follow_Up_Date > Today_date` and `Status == "FollowUp"`; role `4` sees only own created rows.
- Closed: `Status == "Closed"`; role `4` sees only own created rows.

## 8. Lead drill-down behavior

Clicking a Total or Own lead count sends the user to:

`/Admin/Get_Followup_From_Dashboard?condition=<condition>&Type_of_Count=<Total|Own>`

The controller action is protected with `AuthorizeFilter(DatabaseFunctionname = "FollowUp_Management")`, checks `Session["SessionInfo"]`, creates `Followup_ViewModel`, calls `Get_Followup_Details_From_Dashboard`, and returns the `Follow_Up_Management` view. If no rows are found, it sets a warning TempData message.

Drill-down conditions:

| Dashboard row | Condition value | Follow-up model filters set |
| --- | --- | --- |
| All Leads | `All_Leads_Count` | none |
| Fresh Leads | `Fresh_Leads` | `Inquiry_From_Date = DateTime.Now`, `Inquiry_To_Date = DateTime.Now`, `Form_Status = "FollowUp"` |
| Today's Appointment Fixed | `Today_Appoinment_Fixed_Count` | `FromDate = DateTime.Now`, `ToDate = DateTime.Now`, `Form_Status = "FollowUp"`, `Form_Sub_Status = "Appt. Fixed"` |
| Follow up Today | `Follow_up_Today` | `FromDate = DateTime.Now`, `ToDate = DateTime.Now`, `Form_Status = "FollowUp"` |
| Pending Follow up | `Pending_Follow_up` | `ToDate = DateTime.Now.AddDays(-1)`, `Form_Status = "FollowUp"` |
| Follow up (Upcoming) | `Follow_up_Upcoming` | `FromDate = DateTime.Now.AddDays(1)`, `Form_Status = "FollowUp"` |
| Closed | `Closed` | `Form_Status = "Closed"` |

The follow-up view shows `Displaying : <condition>` when `Condition_From_DashBoard` is populated.

When `Type_of_Count == "Own"`, the drill-down list is filtered to `Created_By == loginuserid` and `Form_User_ID` is set to that user. The code for `Type_of_Count == "Other"` is commented out and no dashboard Other count link exists. For role id `4`, the drill-down list is always restricted to rows created by the logged-in user, even when `Type_of_Count=Total`.

Important legacy mismatch: the Fresh Leads count includes all inquiries created today, but the Fresh Leads drill-down query also requires `Status == "FollowUp"`. Closed and All Leads drill-down intentionally do not populate `Follow_Up_Date` in the list objects.

## 9. Birthday/Anniversary Details

The table columns are `Name`, `Mobile`, `Email`, and `Type`.

Data rules:

- Birthday rows come from `Customers` where `Cust_DOB.Value.Day` and `.Month` match today's day/month.
- Anniversary rows come from `Customers` where `Cust_Anniversary_Dt.Value.Day` and `.Month` match today's day/month.
- Birthday rows have `Type = "Birth Day"`.
- Anniversary rows have `Type = "Anniversary"`.
- Birthday rows are appended before anniversary rows.
- The view renders a body only if the combined list has at least one row.

Edge case: both queries dereference nullable date values with `.Value`; a customer with a null DOB or anniversary date can throw during dashboard loading.

## 10. Pending Insurance Policy Details

This section is displayed only when `AppFunctionList.Contains("Insurance_Management")`.

Rows come from `Insurance_Main` where `Policy_Status == "Pending"`. Displayed columns are:

- Car Registration No, linked to `/Admin/Search_Insurance_By_Registration_No?car_registration_no=<registration>`;
- Customer Details as customer name and mobile on separate lines;
- Agent Details as agent name and mobile on separate lines;
- Status, showing the policy status.

There is no date filter, sort clause, pagination, or total cap.

## 11. Expiry Date/Renewal Date of Policy

This section is displayed only when `AppFunctionList.Contains("Insurance_Management")`.

Rows come from `Insurance_Main`, ordered by `Expiry_Date`, with:

- `Expiry_Date <= DateTime.Now.AddDays(15).Date`;
- `Expiry_Date >= DateTime.Now`.

Displayed columns are:

- Car Registration No, linked to `/Admin/Search_Insurance_By_Registration_No?car_registration_no=<registration>`;
- Customer Details as name and mobile;
- Expiry Date formatted as `dd/MM/yyyy`;
- Renewal Date formatted as `dd/MM/yyyy`.

Edge cases:

- The lower bound compares against `DateTime.Now`, including time, not `DateTime.Now.Date`. Rows expiring earlier today can be excluded.
- `Expiry_Date` and `Renewal_Date` are converted to `DateTime`; null or malformed values can throw.

## 12. RTO Pending Car Transfer/Pending RC Details

This section is displayed only when `AppFunctionList.Contains("RTO_Agent_Management")`.

Rows come from `RTO_Agent` where either:

- `Transfer_Status == "Pending"`; or
- `RC_Status == "Pending"`.

Displayed columns are:

- Car Registration No, linked to `/Admin/Search_RTO_By_Registration_No?car_registration_no=<registration>`;
- Customer Name;
- Customer Mobile;
- Agent Name;
- Agent Mobile;
- Transfer Status;
- RC Status.

There is no sort clause, pagination, or total cap.

## 13. RTO/Loan/Insurance Pending Payment Details

This section is displayed only when `AppFunctionList.Contains("RTO_Agent_Management")`. The gate is RTO access even though the table includes loan and insurance rows.

The table columns are `Type`, `Car Registration No`, `Customer Name`, `Customer Mobile`, `Agent Name`, `Agent Mobile`, `Followup Date`, `Total Amt`, `Amt Received`, and `Bal Amt`.

Rows are appended in this order: RTO, Loan, Insurance.

RTO pending rows:

- Source table: `RTO_Agent`.
- Condition: `Amt_Paid < Transfer_Charges`.
- `Type = "RTO"`.
- Actual amount = `Transfer_Charges`.
- Amount received = `Amt_Paid`.
- Balance = `Transfer_Charges - Amt_Paid`.
- Follow-up date = `FollowUp_Date`.
- Registration link: `/Admin/Search_RTO_By_Registration_No?car_registration_no=<registration>`.

Loan pending rows:

- Source table: `Loan_Management`.
- Condition: `Total_Amount_Received < Payout_Amount`.
- `Type = "Loan"`.
- Actual amount = `Payout_Amount`.
- Amount received = `Total_Amount_Received`.
- Balance = `Payout_Amount - Total_Amount_Received`.
- Follow-up date = `Followup_Date`.
- Registration link: `/Admin/Search_Loan_Management_By_Registration_No?car_registration_no=<registration>`.

Insurance pending rows:

- Source table: `Insurance_Main`.
- Condition: `Total_Amount_Received < Payout_Amount`.
- `Type = "Insurance"`.
- Actual amount = `Payout_Amount`.
- Amount received = `Total_Amount_Received`.
- Balance = `Payout_Amount - Total_Amount_Received`.
- Follow-up date = `Followup_Date`.
- Registration link: `/Admin/Search_Insurance_By_Registration_No?car_registration_no=<registration>`.

Edge cases: the model converts amounts and follow-up dates with `Convert.ToDecimal` and `Convert.ToDateTime`; null values can throw. There is no ordering inside each source query.

## 14. Linked search behavior

The dashboard links do not open details directly. They call module search actions by registration number:

- Insurance rows call `Search_Insurance_By_Registration_No`.
- RTO rows call `Search_RTO_By_Registration_No`.
- Loan rows call `Search_Loan_Management_By_Registration_No`.

Those destination actions are part of their respective modules and render those module pages with registration-filtered results.

## 15. Error handling and edge cases

- `HomeController.DashBoard()` has no try/catch around dashboard model construction.
- Dashboard data retrieval methods in `DashBoard_Management` have no local try/catch. Any query/conversion exception can fail the whole page.
- Several nullable database fields are dereferenced or converted without null guards.
- Dashboard data is generated on every request; no caching is implemented.
- No server-side pagination, sorting, or search is implemented on the dashboard.
- No export is implemented.
- No mutation or audit history is created by dashboard viewing.

## 16. Verification checklist

- A logged-in user with `Home` can navigate to Dashboard from the Admin Panel menu.
- Lead Details shows all seven rows with Total, Own, and Other counts.
- Total and Own count links require `FollowUp_Management` access after click.
- Role id `4` sees own-only lead totals and own-only drill-down results.
- Insurance sections render only with `Insurance_Management`.
- RTO pending transfer/RC and pending payment sections render only with `RTO_Agent_Management`.
- Pending payment balance equals total/payout/charges minus amount received for each source row.
- Birthday and anniversary reminders are based on day/month match only.
