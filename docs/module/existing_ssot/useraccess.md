# SSOT - User Access Management Module

## Status: Legacy ASP.NET MVC implemented; extracted from existing codebase

**Module:** `Configuration/UserAccessManagement`  
**Project:** `ExcelCars` legacy ASP.NET MVC  
**Source of truth:** `ExcelCars/Controllers/ConfigurationController.cs`, `ExcelCars/Views/Configuration/UserAccessManagement.cshtml`, `ExcelCars/ViewModel/UserAccessManagement_ViewModel.cs`, `ApModel/Model/UserAccessManagement/UserAccess.cs`, and `db/ExcelCars_merged.sql` (`Usp_Add_Employee`, `Usp_GetUserAccessDetails`).

## 1. Purpose and scope

The module creates, views, edits, and deactivates employee-backed login accounts. A single save operation maintains an employee (`Add_Employee`) and its login (`User_Table`) together. It does not manage role definitions, function permissions, authentication, or password reset.

The configuration menu links to `/Configuration/UserAccessManagement`. The screen is one server-rendered Razor form; it changes its POST target for save, search, edit, delete, and reset operations.

## 2. Access control

- `ConfigurationController` has `SessionExpireFilter`.
- Each module action declares `AuthorizeFilter(DatabaseFunctionname = "User_Access_Management")`; unauthorised requests are redirected to `Home/UnotherisedPage`. The filter's custom `AppFunctionList.Contains(DatabaseFunctionname)` authorization code is commented out, so the supplied code does **not** demonstrate database-function permission enforcement beyond standard `AuthorizeAttribute` behavior.
- Each action additionally checks `Session["SessionInfo"]`; missing session redirects to `Home/Logout`.
- The role dropdown is filtered to roles whose numeric `Role_ID` is greater than the logged-in user’s `Role_ID`. This is the legacy hierarchy rule; the code interprets a greater id as a subordinate/assignable role.

## 3. Data model and ownership

Directly used tables and procedure contracts:

| Entity | Relevant fields / use |
| --- | --- |
| `Add_Employee` | `Emp_ID`, first/last name, gender, address, city, text state, pincode, mobile, phone, email, create/update audit fields. |
| `User_Table` | `User_ID`, username, password, role id/name, status, employee id, display name, email, login/logout timestamps, audit fields. |
| `Role_Master` | Supplies assignable role id/name pairs. |
| state master | Supplies the State dropdown through `Statemaster.GetState()`. |

Relationships and save boundary:

- One user account belongs to one employee through `User_Table.Emp_ID`.
- The legacy stored procedure creates or updates both records in one SQL transaction. The model also wraps its call in a .NET `TransactionScope`.
- “Delete” only updates `User_Table.Status` to `Inactive`; neither account nor employee row is deleted.

## 4. Screen contract

### Form fields

| Field | UI behavior | Persisted behavior |
| --- | --- | --- |
| Employee ID | hidden; zero/new or selected row id | selects insert versus update. |
| First name, last name | mandatory | employee values; used in generated username/display name. |
| Gender | mandatory; `M` / `F` | employee gender. |
| STD number | optional, numeric keyboard restriction, max 5 | combined with phone as `STD-Phone`. |
| Phone | optional, numeric keyboard restriction, max 10, HTML `minlength=6` | combined with STD as `STD-Phone`. |
| Mobile | mandatory, numeric keyboard restriction, max 10 | employee mobile; last three characters are part of generated username. |
| Email | mandatory; client regex validation | employee email and user email. |
| Address, city | optional | employee fields. |
| State | optional select from state master | employee text state. |
| Pin code | optional, numeric keyboard restriction, max 6 | employee pincode. |
| Role | mandatory; only higher numeric roles shown | user role id and selected display name. |

The page has no form fields for username, password, user status, audit metadata, or login times. These are system-derived or loaded only during edit.

### Buttons, links, and listing

- **Save / Update:** client copies selected role label into hidden `RoleNm`, runs shared `validate()`, then posts to `SaveUserAccess`. Button text depends on whether employee id is zero.
- **Search:** posts the whole form to `SearchUserAccess`. The model search method ignores submitted criteria and returns every employee-backed user; despite the screen legend, no field is used as a server-side filter.
- **Reset:** posts to `UserAccessManagement`, recreating a new view model and blank form.
- **Edit:** available only on active rows. It posts the selected employee id to `EditUserAccess`, which reloads employee/user values into the form.
- **Delete:** available only on active rows. It posts the selected employee id to `DeleteUserAccess`, which deactivates the matching user.
- The results table appears only after a search and shows serial number, full name, formatted address/city/state/pincode, mobile, role, status, and edit/delete icons. It has no explicit paging, sort controls, export, confirmation dialog, or client-side search.

## 5. Server workflows

### Page load and reset

`UserAccessManagement()` constructs `UserAccessManagement_ViewModel`, which initializes a blank `UserAccess`, an empty result list, role options filtered by the current session role, and state options. It does not preload users.

### Create and update

`SaveUserAccess()` calls `InsertUpdateUserAccess()` and displays a TempData success, generic error, or contact-system message. The operation is delegated to `Usp_Add_Employee`.

Before calling the procedure, the model creates:

`E` + first initial (uppercase) + last initial (uppercase) + final three mobile characters + (`count(User_Table)` + 1).

It sets password equal to that generated username. This calculation runs for both inserts and updates, but the stored procedure deliberately does **not** update `User_Name` or `Password` in its update branch.

Procedure behavior:

- If no `Add_Employee` exists with the posted employee id, it inserts the employee, obtains the new employee id using `IDENT_CURRENT('Add_Employee')`, then inserts a user with status `Active`, supplied role, generated credentials, concatenated display name, email, and provided login/logout timestamps.
- Otherwise it updates employee data and updates the linked user’s role, role name, status, employee id, display name, email, last login/logout time, and update audit fields. Username, password, and create audit values stay unchanged.
- All values use current server time; `Created_By` and `Updated_By` come from `SessionInfo.UserId`.

No duplicate username/mobile/email check is performed by this module. Username generation assumes non-empty first name, last name, and at least three mobile characters; malformed direct requests can therefore fail before/within persistence.

### Search, edit, and deactivate

- `SearchUserAccess()` calls `Usp_GetUserAccessDetails`, an inner join of `Add_Employee` and `User_Table`. Thus user records without an employee are omitted. It includes both active and inactive rows. A zero-row result sets a warning TempData message.
- `EditUserAccess()` inner-joins employee and user by employee id, splits `Emp_Phone_No` on `-` into STD and phone, and returns fields including credentials and status to the view model. The view only exposes editable employee and role data.
- `DeleteUserAccess()` finds the first `User_Table` row with that employee id and sets status to exactly `Inactive`. It returns success only when a user was found; the controller only emits a success message on true and otherwise remains silent.

## 6. Validation, failures, and edge cases

- Browser JavaScript requires first name, last name, gender, mobile, email, and role. It validates non-empty values, rejects zero values for required numeric fields, limits keyboard numeric entry for numeric fields, and validates email with the shared regex.
- The validation routine makes a synchronous session check to `/Home/chkSession`; a false response opens login UI and fails validation.
- The server action does not independently revalidate mandatory fields, email format, phone lengths, mobile numeric format, or role eligibility. Client validation can be bypassed.
- Search, edit, save, and delete catch exceptions, log through `Exceptioncatch.create`, and use TempData messages. Save additionally records the model-level exception where available.
- `Emp_Phone_No.Split('-')` assumes two components; malformed stored phone values can throw during edit.
- No confirmation is required before deactivation.

## 7. Legacy behaviors that must be consciously preserved or replaced

- Account and employee creation are coupled and transactional.
- New accounts start active with a generated username and a password equal to that username (legacy, insecure behavior).
- Username/password are immutable through the edit flow.
- Deactivation is a soft delete and inactive rows remain searchable but cannot be edited or deleted through the UI.
- Assignable roles are restricted by numeric role ordering.
- The listing is all employee-backed accounts, not a true field-filtered search.

## 8. Verification checklist

- Unauthenticated and unauthorised requests take the legacy redirect paths.
- An authenticated operator sees only roles with id greater than their own in the form.
- Creating an account inserts one employee and one active user with linked employee id, role name, audit fields, and generated credentials.
- Editing updates employee/contact/role values while retaining username and password.
- Search includes active and inactive employee-backed accounts and does not filter by filled form inputs.
- Deactivation makes a row inactive without deleting its employee or user record, and removes its edit/delete controls after the next search.
