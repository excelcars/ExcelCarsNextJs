# SSOT - Profile Settings and Password (Legacy)
## Status: Legacy ASP.NET MVC analyzed; no functional profile module exists

**Module requested:** `/profile` / profile settings and password change  
**Legacy project:** `ExcelCars`  
**Legacy technology:** ASP.NET MVC 5, Razor, Entity Framework EDMX, SQL Server  
**Finding:** The legacy application does not implement a profile page, profile settings form, or authenticated self-service password-change workflow. This document records the complete related behavior that does exist and the verified missing functionality.

## 1. Purpose and scope

The legacy codebase has account authentication, session bootstrap, account administration, and a few profile/password labels in shared UI. It does not have a legacy `/profile` route or a dedicated profile controller/view.

Related legacy capabilities are limited to:

- login using username and plaintext password comparison;
- loading the logged-in user's account, role, display name, email, and permissions into session;
- showing the logged-in display name in the shared navigation;
- administrator creation/update/deactivation of employee-backed user accounts;
- administrator-generated initial credentials;
- logout and session-expiry handling;
- a non-functional `Change Password` navigation item;
- a non-functional `Forgot Password` link in the session-expiry login overlay.

This module does not own or implement:

- profile route/page rendering;
- editable personal information;
- self-service password change;
- current-password verification for a change-password operation;
- password policy validation;
- password reset token generation or reset completion;
- email verification for password reset;
- active-session management;
- avatar or preference settings.

## 2. Source evidence

Primary legacy sources reviewed:

- `ExcelCars/Views/Shared/Menu.cshtml`
- `ExcelCars/Views/Shared/_Layout.cshtml`
- `ExcelCars/Views/Home/Login.cshtml`
- `ExcelCars/Controllers/HomeController.cs`
- `ExcelCars/Controllers/UserController.cs`
- `ApModel/Model/Home/User.cs`
- `ApModel/Model/SessionInfo.cs`
- `ApModel/Helper/AppHelper.cs`
- `ApModel/Model/UserAccessManagement/UserAccess.cs`
- `ExcelCars/Controllers/ConfigurationController.cs` (user-access actions)
- `ExcelCars/Views/Configuration/UserAccessManagement.cshtml`
- `ExcelCars/ViewModel/UserAccessManagement_ViewModel.cs`
- `ApData/Excel_Cars_Database.edmx`
- `db/excelCarsFinal.sql` (`User_Table`, `Forgot_Password`, and user-access procedures)
- `ExcelCars/App_Start/AuthorizeFilter.cs`
- `ExcelCars/App_Start/SessionExpireFilterAttribute.cs`

## 3. Navigation and route surface

### 3.1 Legacy authenticated navigation

`Views/Shared/Menu.cshtml` is rendered inside the shared layout when both of these conditions are true:

- `User.Identity.IsAuthenticated` is true;
- `Session["SessionInfo"]` is not null.

The menu displays:

- the user's `SessionInfo.Display_Name` as `Welcome: ...`;
- `Change Password` as an anchor with `href="#"`;
- `Logout` as an MVC action link to `Home/Logout`.

The `Change Password` anchor has no controller/action URL, no click handler, no modal target, and no form. Clicking it only follows the page anchor and does not open a password screen or perform a request.

There is no `Profile` menu item, no `/profile` link, and no profile-related permission name in the legacy navigation.

### 3.2 Session-expiry login overlay

`Views/Shared/_Layout.cshtml` contains a login overlay that is shown when the periodic session check detects an expired session. It contains:

- username input `#Username1`, maximum length 20;
- password input `#Password1`, maximum length 20;
- `Login` button;
- `Forgot Password` anchor with no `href`, no click handler, and no reset flow.

The overlay is not a profile page. It is a re-authentication mechanism used after session expiry.

### 3.3 Routes and controllers

The default route is `{controller}/{action}/{id}`, defaulting to `Home/Login`. No explicit profile route exists.

`UserController` contains only an `Index()` action in the supplied source and has no profile/password actions or corresponding view.

No legacy action was found for names such as `Profile`, `ChangePassword`, `Change_Password`, `ForgotPassword`, `ResetPassword`, or equivalent.

## 4. Account and password data model

### 4.1 `User_Table`

The SQL schema defines `dbo.User_Table` with these relevant columns:

| Column | Type / behavior | Profile/password relevance |
|---|---|---|
| `User_ID` | identity integer primary key | Account identity used by session and audit fields. |
| `User_Name` | nullable `varchar(max)` | Login identifier; not editable through a self-service flow because no such flow exists. |
| `Password` | nullable `varchar(max)` | Stores the password directly as plaintext; it is compared directly during login. |
| `Role_ID`, `Role_Name` | nullable role values | Loaded into session; administrator-managed. |
| `Status` | nullable text | Only `Active` accounts authenticate successfully. |
| `Emp_ID` | nullable employee link | Links the account to `Add_Employee` when created through User Access Management. |
| `Display_Name` | nullable text | Shown in the shared welcome menu and home page. |
| `Email_ID` | nullable text | Stored as account email; no legacy reset workflow consumes it. |
| `Last_Login_Time` | nullable datetime | Updated after successful login. |
| `Last_Logout_Time` | nullable datetime | Present in schema but not updated by `Home/Logout` in the reviewed code. |
| `Created_Date`, `Created_By` | nullable audit fields | Set by account creation procedure. |
| `Updated_Date`, `Updated_By` | nullable audit fields | Set by account update procedure. |

There is no password hash, password version, password-changed timestamp, reset-token expiry, reset-attempt counter, or password-history field in the legacy `User_Table` contract.

### 4.2 `Forgot_Password`

The database contains a `dbo.Forgot_Password` table:

| Column | Behavior |
|---|---|
| `Forgot_Password_Id` | identity primary key |
| `Verification_Code` | nullable `nvarchar(50)` |
| `Email_Address` | nullable `nvarchar(100)` |
| `Active_Fl` | nullable bit |
| `Created_By`, `Created_Dt` | nullable audit fields |
| `Updated_By`, `Updated_Dt` | nullable audit fields |

The table is mapped in the EDMX, but no controller, view, model method, stored procedure, or email workflow in the reviewed application reads from or writes to it. Its presence is schema residue, not implemented functionality.

### 4.3 Employee data associated with accounts

User Access Management can link `User_Table.Emp_ID` to `Add_Employee`. The employee record contains first/last name, gender, address, city, state text, pincode, mobile, phone, email, and audit values. The legacy application has no self-service screen for editing these values.

## 5. Authentication workflow related to the module

### 5.1 Full login

1. `Home/Login` renders the login form.
2. The form posts username and password to `Home/PostLogin`.
3. `HomeController.PostLogin` stores the username temporarily in `Session["TempUserName"]`.
4. `ApModel.Model.User.IsCredentialValid` queries one `User_Table` row by trimmed username.
5. Login succeeds only when:
   - a row is found;
   - stored `Password` equals the submitted password after the submitted value is trimmed;
   - `Status` is exactly `"Active"`.
6. On failure, the user session is reset and the login view shows `Username and password does not match. Please Login again.`
7. On success, `SetSessionValues` sets a persistent Forms Authentication cookie, updates `Last_Login_Time`, and calls `AppHelper.SetUserSession`.
8. The user is redirected to `Home/AdminHome` regardless of the role-name branch shown in the controller.

No password hashing or secure password comparison is used. The login form limits input length to 20 characters in the browser, but there is no equivalent server-side password-policy validation.

### 5.2 Session construction

`AppHelper.SetUserSession` loads the user by username and places a `SessionInfo` object in `Session["SessionInfo"]`. It copies:

- `User_ID` to `UserId`;
- username;
- plaintext password;
- role id and role name;
- employee id;
- display name.

It then loads access functions for the role from `Access_Function`, where the role id appears in the stored comma-delimited role list, and stores the resulting comma-delimited names in `AppFunctionList`.

The legacy session therefore contains the plaintext password in server session state. No profile page exposes this value, but it is present in the session object.

### 5.3 Session checks and expiry

The shared layout:

- checks the session every 30 seconds through synchronous `POST /Home/chkSession`;
- opens the login overlay when the response is `False`;
- checks session state before submit buttons through shared JavaScript;
- periodically calls `/ajax/SessionReset` after three minutes.

`SessionExpireFilterAttribute` redirects non-AJAX requests to `Home/Login` when `SessionInfo` is absent or the Forms Authentication request is not authenticated. AJAX requests receive JSON data `_Logon_`.

The layout's re-login code calls `Home/AsyLoginSession` and, when necessary, submits credentials to `Home/ReloadLogin`. These are session-recovery paths, not password-change paths.

### 5.4 Logout

`Home/Logout`:

- calls `FormsAuthentication.SignOut()`;
- expires the Forms Authentication cookie;
- removes `SessionInfo` through `AppHelper.ResetUserSession()`;
- sets no-cache/no-store response headers;
- redirects to `/`;
- assigns `Session["SessionInfo"] = null` after the redirect call.

The reviewed action does not update `User_Table.Last_Logout_Time`.

## 6. Account administration behavior affecting passwords

The only implemented password mutation is account creation through User Access Management.

### 6.1 Account creation

`UserAccess.InsertUpdateUserAccess` derives a username as:

`E` + uppercase first character of first name + uppercase first character of last name + last three characters of mobile + (`User_Table` row count + 1)

It then sets the initial password equal to that generated username. The values are passed to the `Usp_Add_Employee` stored procedure together with employee, role, display-name, email, and audit values.

The procedure inserts the employee and user together when the employee id is new. The new user is marked `Active`.

### 6.2 Account update

The same model recalculates a generated username and password before calling the procedure, but the procedure's update branch does not update the existing `User_Name` or `Password`. Therefore:

- username and password remain unchanged on account edit;
- employee fields, role, display name, email, status, login/logout values, and update audit values may change;
- there is no administrator password-reset button in the User Access screen.

### 6.3 Deactivation

User Access Management's Delete action is a soft delete: it finds the account by employee id and sets `User_Table.Status` to `Inactive`. It does not delete the account or password. The inactive account then fails the login status check.

## 7. UI controls and interaction inventory

| Location | Control | Legacy behavior |
|---|---|---|
| Shared authenticated menu | Welcome label | Displays `SessionInfo.Display_Name`; no edit action. |
| Shared authenticated menu | Change Password | `href="#"`; no request, modal, form, or action. |
| Shared authenticated menu | Logout | Calls `Home/Logout`; signs out the current Forms Authentication session. |
| Session-expiry overlay | Username | Re-login input, max length 20. |
| Session-expiry overlay | Password | Re-login input, max length 20. |
| Session-expiry overlay | Login | Calls `AsyLoginSession`; may use `ReloadLogin` to restore the page session. |
| Session-expiry overlay | Forgot Password | Text anchor without destination or handler; no behavior. |
| User Access Management | First/last name, gender, contact fields, role | Administrator creates/edits employee-backed accounts; not self-service profile settings. |
| User Access Management | Save/Update | Creates or updates account and employee data; initial password only on insert. |
| User Access Management | Edit | Loads existing employee/account values for administrator editing; exposes password in the model but not as an editable form field. |
| User Access Management | Delete | Marks linked account inactive; no password reset. |

There are no profile listings, tables, filters, search, sort, pagination, profile calculations, profile exports, or profile detail screens.

## 8. Validation and error behavior

### 8.1 Legacy client validation

The login page uses the shared `validate()` JavaScript routine to require non-empty username and password fields. The login inputs have a browser `maxlength` of 20.

The shared layout checks session validity before submit actions and opens the login overlay when the session has expired.

There is no client validation for a current password, new password, password confirmation, password strength, or reset code because no such form exists.

### 8.2 Server validation

`IsCredentialValid` rejects:

- null/empty username;
- unknown username;
- password mismatch;
- inactive account.

It does not enforce a password policy, lockout, retry limit, expiry, reuse prevention, or MFA.

User Access Management performs most validation in browser JavaScript. Its server-side account workflow does not provide a self-service password-change contract.

### 8.3 Exceptions and messages

Authentication exceptions are logged through `Exceptioncatch.create`, the user session is reset, and a generic or exception-derived login message is returned depending on the path.

There are no password-change-specific success, failure, mismatch, policy, or expired-reset-token messages in the legacy application.

## 9. Authorization and security findings

- The shared menu is visually gated by authentication/session presence, not by a profile permission.
- No legacy profile/password-change endpoint exists to authorize.
- The `AuthorizeFilter` custom application-function check is commented out; it redirects unauthorized requests but does not demonstrate function-level enforcement in the supplied implementation.
- Passwords are stored and compared in plaintext.
- Plaintext passwords are copied into `SessionInfo`.
- Login recovery sends username/password values through client-side request/query construction in the shared layout's legacy flow.
- No anti-forgery contract or current-password verification exists for a password mutation because no self-service mutation exists.
- No audit event records a password change or password reset.
- No global session invalidation exists after a credential change.

These are legacy findings to preserve in migration analysis, not behaviors to reproduce without an explicit security decision.

## 10. Verification checklist

- Confirmed no `Profile` or `ChangePassword` action exists in the legacy controllers.
- Confirmed `UserController` only exposes `Index()`.
- Confirmed the menu's `Change Password` link is `href="#"` with no handler.
- Confirmed the session-expiry overlay's `Forgot Password` link has no destination or handler.
- Confirmed no legacy profile/password form, listing, filter, sort, pagination, or export exists.
- Confirmed `Forgot_Password` is a mapped database table with no application consumer.
- Confirmed login compares the submitted password directly to `User_Table.Password` and requires status `Active`.
- Confirmed `SessionInfo` includes the plaintext password.
- Confirmed User Access creates initial password equal to generated username and does not update username/password in its update branch.
- Confirmed account deletion is deactivation (`Status = "Inactive"`), not hard deletion.

## 11. Review record

Two review passes were completed against the legacy .NET codebase. The first pass traced the shared navigation/layout, home authentication controller, user model, session helper, user-access model/view, EDMX mappings, and SQL schema/procedures. The second pass searched the full non-generated source tree for profile, change-password, forgot-password, reset-password, and password mutation references, and rechecked all discovered UI anchors and database objects. The conclusion remains that legacy `/profile` functionality is absent and that the only implemented credential workflows are login, session recovery, account creation, and account deactivation.
