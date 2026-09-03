# SSOT - User Access Module

## Status: Next.js implemented; current-state behavior documented

**Route:** `/config/user-access`  
**Project:** `ExcelCarsNextJs`  
**Source of truth:** `app/(dashboard)/config/user-access/page.tsx`, `src/features/useraccess/{UserAccessClient,actions,permissions,queries}.ts(x)`, `auth.ts`, `auth.config.ts`, `middleware.ts`, and `prisma/schema.prisma`.

> This documents the actual Next.js implementation, not intended parity.

## 1. Purpose and owned data

The page lists employee-backed user accounts, lets an authenticated operator add an employee-backed account, edit an active account, and deactivate an account. It writes `add_employee` and `user_table`; it reads `role_master` and the employee/role relations. It does not manage role definitions or `access_function` / `access_function_role` permissions.

Relevant persisted fields are employee name, gender, mobile, phone, email, address, city, state, pincode, audit values; and user username, bcrypt password hash, role id/name, status, employee link, display name, email, timestamps, and audit values. State now writes both `fkStateId` and the legacy text column `empStateLegacy` from `indian_states_master`.

## 2. Access and navigation

- The dashboard navigation now hides **Configuration → User Access** unless the signed-in user’s role is mapped to the required function through the shared access catalog / permission resolver.
- Middleware redirects unauthenticated non-API requests to `/login`; authenticated requests to `/login` go to `/dashboard`.
- The page requires a current, active `user_table` account with a non-null role that is mapped through `access_function_role` to `User_Access_Management`; other signed-in users are redirected to `/dashboard`.
- Role options are loaded with `roleId > currentRoleId` after that permission check.
- Authentication rejects users whose status is not exactly `Active`, and verifies `passwordHash` using bcrypt.

## 3. UI behavior

The server page reads URL search params and loads employee-backed users only (descending user id) with employee/state and role relations. Listing now uses server-side fetching with search, filters, and pagination. There is still no sorting control or export.

- **Add User** opens a modal with employee fields plus username, password, and role.
- The list toolbar now follows the operation-module pattern: a debounced search box plus Status, Role, and State filters that update the URL and refetch on the server.
- Search is case-insensitive and currently matches username, user-table email, employee first/last name, employee email, mobile, phone, city, and role name.
- Table columns are Name, Username, Contact (mobile and user email), Address, Role, Status, and Actions. The address column formats employee address, city, state, and pincode when present.
- Only employee-backed rows are listed. Inactive employee-backed accounts remain visible.
- Pagination is server-driven at 25 rows per page with Prev/Next controls and page summary text, consistent with the configuration/operations-style modules.
- **Edit** is visible only for active rows the current actor is allowed to manage. It opens the modal with current employee data, disables username, allows an optional replacement password, allows role/status changes, and saves.
- **Deactivate** is visible only for active rows the current actor is allowed to manage and opens a confirmation dialog. On success, the local row status changes to `Inactive` without a full reload.
- Closing/cancelling a modal discards unsaved form state. Successful add/edit closes the modal and refreshes the route after server-side revalidation.

## 4. Form contract and validation

| Field | Add | Edit | Actual server behavior |
| --- | --- | --- | --- |
| First/last name, mobile, email | required | required | first/last are trimmed and required; mobile must be exactly 10 digits; email must match a basic email pattern. |
| Gender | optional UI select, defaults `M` | editable | only `M` or `F` are accepted by client and server validation. |
| Phone, address, city, pincode | optional | editable | phone is a single field and must be 6 to 10 digits when supplied; pincode must be exactly 6 digits when supplied; address/city are trimmed text fields. |
| State | optional select from `indian_states_master` | editable | stores both `fkStateId` and matching `empStateLegacy`; invalid/unknown ids collapse to null. |
| Username | required | read-only | must be 4-50 characters using letters, numbers, `.`, `_`, or `-`; create checks exact trimmed username uniqueness; login lookup is case-sensitive/exact; update never changes it. |
| Password | required | optional replacement | create and replacement passwords must be 8-100 characters with at least one letter and one number; stored only as bcrypt hash; blank edit retains current hash. |
| Role | required | required | must be numerically greater than the signed-in user role when that role is non-null. |
| Status | forced active on create | selectable Active/Inactive | update uses supplied status or defaults to `Active`. |

The client now mirrors the server’s core validation before submit: required names/mobile/email, role presence, `M/F` gender, 10-digit mobile, optional 6-10 digit phone, valid email pattern, and optional 6-digit pincode. Numeric fields strip non-digits on entry and highlight invalid inputs. Error text still appears inside the open modal. State is sourced from `indian_states_master`; standard dialling code and phone are intentionally still one field rather than legacy STD/phone parts.

## 5. Server actions and database effects

### `createUserAccount(input)`

1. Validates required identity/contact fields, username/password, and role presence.
2. Requires a current, active user account with `User_Access_Management` permission through `access_function_role`.
3. Rejects a role id less than or equal to the creator’s role id.
4. Rejects an existing exact `userName` match.
5. Fetches the selected role and rejects the request if that role no longer exists.
6. Creates `add_employee` and linked `user_table` inside one Prisma transaction using the same timestamps and creator audit id.
7. The user row stores a bcrypt cost 10 password hash, `Active` status regardless of input, the validated selected role/name, display name, email, timestamps, and audit id.
8. Revalidates `/config/user-access`.

### `updateUserAccount(userId, input)`

1. Validates the required identity/contact fields and role; requires a current, active user account with `User_Access_Management` permission and applies the same role-order check.
2. Rejects the request unless the target is not the actor and has a numerically greater (lower-privilege) role id. A missing or ineligible target returns the same authorization failure.
3. Fetches the proposed role and rejects the request if that role no longer exists, then loads the target user record for the actual update path. If that second lookup fails, it returns `Account not found.`
4. If the target has `empId`, updates that employee’s editable fields and update audit values. A user lacking an employee is still allowed through; its displayed form values are blank and no employee is created.
5. Updates target role id/name, supplied/default status, display name, user-table email, audit values, and password hash only when a nonblank replacement password was supplied.
6. Revalidates the route.

The action does not permit self-management, equal-role management, or higher-privilege target management. Numeric role ordering follows the legacy convention: lower numbers are more privileged.

### `deactivateUserAccount(userId)`

This action requires the same active, module-authorized actor as create/update. It rejects self-deactivation and targets with equal or higher privilege before setting the selected `user_table.status` to `Inactive`, writing `updatedDate`/`updatedBy`, and revalidating. It still does not verify that the target is currently active. The client confirmation is a UX safeguard rather than the authorization boundary.

## 6. Current security and error handling behavior

- Login is case-sensitive/exact on `userName` as queried; only active users with a bcrypt hash can sign in. Successful login updates `lastLoginTime`, and the sign-out auth event attempts to update `lastLogoutTime`.
- Passwords are not exposed to the client and are bcrypt-hashed for newly created/replaced passwords.
- The implemented onboarding policy is administrator-issued credentials: an authorized operator supplies the username and a temporary password that meets the module rules, shares it out-of-band, and can later rotate it through Edit. There is no self-service first-login reset flow in this module.
- Create/update/deactivate catch persistence exceptions, write a structured server `console.error` entry with a generated reference id and safe action context, and return a generic user-facing message that includes only that reference id.
- Read/render failures and page-level database errors are not caught locally.
- Function-level role permissions are enforced by the User Access page and all User Access server actions. Sidebar visibility also now follows the shared access catalog and current role mappings. Middleware is still auth-only rather than module-permission-aware.

## 7. Verification checklist

- Signed-out navigation redirects to login; inactive accounts cannot authenticate; a signed-in account without `User_Access_Management` permission is redirected from this page.
- List ordering is newest user id first; only employee-backed accounts are loaded; server-side search/filter/pagination are URL-driven and persist across refresh/navigation.
- Create adds linked employee and active user, hashes password, persists audit fields, and rejects duplicate exact usernames.
- Edit keeps username unchanged; blank password preserves the prior hash; supplied password replaces it with a hash.
- Active rows provide Edit/Deactivate only when the current actor is allowed to manage that target. Inactive rows and self/equal/higher-privilege targets show no row actions. Server actions enforce the same rule.
- Deactivation updates status plus deactivation audit fields in the implemented action after server-side authorization.
