# SSOT - home-auth-session Module
## Status: Draft

**Module:** `home-auth-session`  
**Project:** ExcelCars  
**Depends On:** `module/ssot/05_SSOT_admin-operations.md`, `module/ssot/05_SSOT_configuration-masters.md`, `module/ssot/05_SSOT_reporting-analytics.md`

## 1. Purpose
This module owns the public entry flow into the ExcelCars web application and the session bootstrap required before users can access the rest of the system.

It owns:
- login page rendering and login form submission
- credential validation handoff to `ApModel.Model.User`
- forms-auth cookie issuance
- `SessionInfo` hydration through `AppHelper.SetUserSession`
- post-login return-url continuation when `Session["returnURL"]` is populated
- logout flow and cache-expiry response handling
- home/admin landing pages and dashboard composition/navigation
- unauthorized page rendering

It does not own:
- persistent user master data maintenance
- role/function assignment maintenance
- feature-level CRUD flows after login
- report generation internals

Primary controller:
- `ExcelCars/Controllers/HomeController.cs`

Primary supporting types:
- `ApModel/Model/Home/User.cs`
- `ApModel/Model/SessionInfo.cs`
- `ApModel/Helper/AppHelper.cs`
- `ExcelCars/App_Start/SessionExpireFilterAttribute.cs`
- `ExcelCars/App_Start/AuthorizeFilter.cs`

## 2. Locked v1 Scope
- default route lands on `Home/Login`
- `PostLogin()` reads `Username` and `Password` from `Request.Form`
- successful login stores username in temporary session state, then redirects to `SetSessionValues()`
- `SetSessionValues()` creates forms-auth cookie, updates last-login timestamp, and writes `SessionInfo`
- all successful role branches currently resolve to `AdminHome`
- `AsyLoginSession()` supports async/AJAX-style login validation and returns string status values
- `ReloadLogin()` repeats the same credential bootstrap for alternate login refresh scenarios
- `DashBoard()` opens the dashboard view for already authenticated users
- dashboard view-model construction eagerly loads inquiry/follow-up counts, birthdays/anniversaries, pending payouts, pending policies, expiry/renewal policies, and RTO pending items through `DashBoard_ViewModel` -> `DashBoard_Management`
- `Logout()` signs out the user, clears auth cookie, removes `SessionInfo`, and disables browser cache
- `UnotherisedPage()` renders the unauthorized screen
- **the "Change Password" link shown in the header on every logged-in page (`Views/Shared/Menu.cshtml`) is a dead link (`href="#"`) with no backing controller action anywhere in the codebase — this is not a broken/incomplete flow to migrate, it is a feature the UI advertises but that does not exist today and must be built fresh**

Views directly owned:
- `Views/Home/Login.cshtml`
- `Views/Home/Home.cshtml`
- `Views/Home/DashBoard.cshtml`
- `Views/Home/UnotherisedPage.cshtml`
- `Views/Home/Index.cshtml`

## 3. Data Ownership
This module does not define its own tables but directly reads/writes the following database-backed records through the model layer:

Primary tables/entities touched:
- `User_Table`
- `Access_Function`

Session payload fields populated into `SessionInfo`:
- `UserId`
- `UserName`
- `Password`
- `Role_ID`
- `Role_Name`
- `Emp_ID`
- `Display_Name`
- `AppFunctionList`

Derived access model:
- user record is fetched by username
- password is compared directly against the stored password value
- access-function list is resolved by role membership and flattened into a comma-separated string

## 4. Interface Contracts
Required controller behaviors:
- `Index()`
- `Login()`
- `PostLogin()`
- `SetSessionValues()`
- `chkSession()`
- `resetTempdata()`
- `AsyLoginSession(userName, password)`
- `ReloadLogin(userName, password)`
- `AdminHome(AdminHomeViewModel)`
- `Home()`
- `Logout()`
- `DashBoard()`
- `UnotherisedPage()`

Required routing/UI surfaces:
- `GET /Home/Login`
- `POST /Home/PostLogin`
- `GET /Home/SetSessionValues`
- `GET /Home/AdminHome`
- `GET /Home/DashBoard`
- `GET /Home/Logout`
- `GET /Home/UnotherisedPage`
- dashboard drill-through links to `GET /Admin/Get_Followup_From_Dashboard?condition=...&Type_of_Count=...`

Required session/filter surfaces:
- `Session["TempUserName"]`
- `Session["SessionInfo"]`
- Forms authentication cookie

## 5. Business Rules
- authentication is username/password based
- only users with `Status == "Active"` are treated as valid during login
- failed credential checks must reset the user session and return the login page
- successful login must update the stored last-login timestamp
- the module assumes every authenticated user can continue to the same `AdminHome` landing page
- `SetSessionValues()` contains a `Session["returnURL"]` check, but it is effectively dead code on the normal login path: it sits after the `Session["TempUserName"] != null` block, and that block always returns first via its own `RedirectToAction("AdminHome", ...)` or its catch-block redirect (since `PostLogin()` always sets `TempUserName` before redirecting here). The `returnURL` branch can only run if `/Home/SetSessionValues` is hit directly without `TempUserName` set
- feature authorization is expected to rely on `SessionInfo.AppFunctionList`, although the custom `AuthorizeFilter` implementation currently does not enforce that check because the core authorization code is commented out
- session expiry handling is implemented by `SessionExpireFilterAttribute`, which redirects full-page requests to `Home/Login` and returns `_Logon_` for AJAX requests
- session timeout is configured to `720` minutes in `Global.asax.cs`
- `Session_Start()` also signs out users who still have an auth cookie but have started a brand-new ASP.NET session, then redirects them to `/Home/Login`

## 6. Integration And Side Effects
- depends on Entity Framework context `Excel_CarsEntities` through `User` and `AccessFunction`
- depends on ASP.NET Forms Authentication
- depends on MVC session state
- exposes landing/navigation entry points used by every other controller
- writes exception logs through `Exceptioncatch.create(ex)` when exceptions occur

## 7. Audit Requirements
Observed audit-related behavior:
- login success updates `User_Table.Last_Login_Time`
- exception cases are forwarded to the exception logging module via `Exceptioncatch.create`

Missing but implied audit needs:
- failed login attempts are not persisted
- logout events are not persisted
- unauthorized-access attempts are not persisted

## 8. Tests Required
- valid active user can log in and reaches `AdminHome`
- inactive user cannot log in
- invalid password returns login view and resets session
- `SetSessionValues()` writes `SessionInfo` and forms-auth cookie
- logout clears auth cookie and session
- expired AJAX request returns `_Logon_`
- expired non-AJAX request redirects to `Home/Login`
- unauthorized route renders `UnotherisedPage`
