# SSOT - User Profile
## Status: Next.js implemented; code-verified

**Module:** `/profile`  
**Project:** ExcelCarsNextJs  
**Implementation:** Next.js App Router, React client component, NextAuth, Prisma, PostgreSQL target schema

This document describes only behavior verified in the current Next.js source code. The module provides authenticated profile viewing, editing of selected employee fields, and self-service password change.

Shared validation and limits are defined in `src/lib/profileValidation.ts` and reused by the profile and User Access workflows. The Admin User Access create/edit server action independently enforces the same approved field limits, so the UI counters are not the only protection.

Related module: [User Access SSOT](useraccess.md). User Access is the administrative account-management surface for the same `UserTable` and `AddEmployee` records; this profile SSOT covers only the self-service `/profile` surface.

## 1. Source of truth

Primary files:

- `app/(dashboard)/profile/page.tsx`
- `app/(dashboard)/layout.tsx`
- `src/features/profile/ProfileClient.tsx`
- `src/features/profile/queries.ts`
- `src/features/profile/actions.ts`
- `src/components/Layout.tsx`
- `auth.ts`
- `auth.config.ts`
- `middleware.ts`
- `src/lib/validation.ts`
- `src/lib/access/accessControl.ts`
- `prisma/schema.prisma` (`UserTable`, `AddEmployee`, `ForgotPassword`)

## 2. Scope

The page allows a logged-in user to view account information, view linked employee information, edit selected personal fields, change the user's own password, and sign out after a successful password change.

The page does not expose controls for username, email, role, status, permissions, password hash, avatar, password reset by email, or other-device session management.

There are no listings, tables, filters, searches, sorting controls, pagination, exports, or calculated business totals in this module.

## 3. Route, access, and navigation

`app/(dashboard)/profile/page.tsx` calls `auth()`, converts `session.user.id` to a number, redirects to `/login` for a missing/invalid/non-positive integer id, loads `getCurrentUserProfile(userId)`, redirects when no user row is returned, and renders `ProfileClient` with the result.

The parent dashboard layout also redirects to `/login` when there is no session. Middleware protects non-public routes, including `/profile`, and redirects unauthenticated requests to `/login`.

`src/components/Layout.tsx` renders `ProfileMenu` in the sidebar user block and top-right header. The menu is client-stateful: the user button toggles it, outside mousedown closes it, Escape closes it, and the listeners are cleaned up when closed/unmounted.

Menu entries:

| Entry | Behavior |
|---|---|
| Profile | Link to `/profile`; closes the menu and, in the sidebar, closes the mobile sidebar. |
| Change Password | Link to `/profile#security`; closes the menu and navigates to the security anchor. |
| Sign Out | Calls `signOut({ callbackUrl: '/login' })`. |

The shared layout gets the displayed name from `session.user.name`, falling back to `User`, and role from `session.user.roleName`, falling back to an empty string. Sidebar details are hidden when collapsed. This menu is independent of the access-function filtering used for operations, configuration, and reports navigation.

## 4. Profile data query

`getCurrentUserProfile(userId)` calls Prisma `userTable.findUnique({ where: { userId } })` and selects:

Account fields: `userId`, `userName`, `roleName`, `status`, `displayName`, `emailId`, `lastLoginTime`, and `createdDate`.

Related employee fields through `UserTable.employee`: `empFirstName`, `empLastName`, `empGender`, `empAddress`, `empCity`, `empStateLegacy`, `empPincode`, `empMobileNo`, `empPhoneNo`, and `empEmailId`.

The query does not select `passwordHash`. A null employee relation is allowed and is represented in the client as missing personal data.

## 5. Profile display

The page header is `My Profile` with subtitle `View your account details and manage security settings.` It renders an account-information card, a personal-information card, and a security card.

The identity card displays a red circular initial. The source priority is `displayName`, then `userName`, then `U`; the selected first character is uppercased. The visible full name uses `displayName`, falling back to the joined employee first and last names. Blank/whitespace text renders as `—`.

Account fields displayed:

- Username: `userName`;
- Email: `emailId`, falling back to `employee.empEmailId`;
- Role: `roleName`;
- Status: `status`;
- Last login: `lastLoginTime` formatted with `new Date(value).toLocaleString('en-IN')`;
- Account created: `createdDate` formatted the same way.

Null/blank text renders as `—`; null dates render as `—`. No custom timezone or date format is defined beyond the `en-IN` locale conversion.

Read-only personal fields are first name, last name, gender, mobile, phone, city, state, pincode, and address. Employee email is not shown in this list; it participates in the account email fallback.

## 6. Personal information edit workflow

### 6.1 Entering edit mode

The `Edit` button is shown only outside edit mode. It copies employee values into local `personalForm`, replacing null/missing values with empty strings, clears the personal message, and sets edit mode active.

The edit form contains:

| Field | UI behavior | Server field |
|---|---|---|
| First name | Text; required by server | `empFirstName` |
| Last name | Text; required by server | `empLastName` |
| Gender | Select: blank `Not specified`, `M`, `F` | `empGender` |
| Mobile | Text with `inputMode="numeric"`; optional | `empMobileNo` |
| Phone | Text with `inputMode="numeric"`; optional | `empPhoneNo` |
| City | Text; optional | `empCity` |
| State | Text; optional | `empStateLegacy` |
| Pincode | Text with `inputMode="numeric"`; optional | `empPincode` |
| Address | Textarea; optional | `empAddress` |

The form note states that email, username, role, status, and permissions can only be changed by an administrator. No controls for those values are rendered.

### 6.2 Editing, cancel, and save

Each field update merges the changed value into `personalForm` state.

`Cancel` resets the form from current `profileData`, clears the personal message, and exits edit mode. It is disabled while the shared pending transition is active.

`Save Changes` prevents default submission, clears the prior message, and calls `updateMyProfile(personalForm)` inside `startTransition`.

On failure, edit mode remains open, local saved profile state is unchanged, and the returned error or fallback error is displayed in a red alert.

On success, local `profileData.displayName` becomes trimmed first name + space + trimmed last name. Employee state is merged from the submitted form; if no employee existed, a local employee object is created with `empEmailId: null` before merging. A success message is displayed and edit mode closes. The server revalidates `/profile` after its transaction succeeds.

## 7. Server-side personal update

`updateMyProfile` is a server action. It derives the target user exclusively from `auth()` and `session.user.id`; it accepts no target-user id from the client.

It returns `Your session has expired. Please sign in again.` if the session id is missing, non-numeric, non-integer, or not positive. First name, last name, mobile, phone, and pincode are trimmed. The `nullable` helper trims optional values and converts blank values to `null`.

Validation enforced by the action:

- first name nonblank;
- last name nonblank;
- mobile blank or exactly 10 digits;
- phone blank or exactly 10 digits;
- pincode blank or exactly 6 digits;
- gender blank, `M`, or `F`.

The enforced maximum lengths are: first/last name 50, gender 1, mobile 10, phone 10, address 200, city 50, state 50, pincode 6, and passwords 20 characters. The UI mirrors these limits with `maxLength` and displays live `current/max` character counters for editable text and password fields; the server enforces the limits independently.

The same server-side limit contract is applied when a System Admin creates or edits a user through User Access. Admin-side limits are first/last name 50, mobile 10, phone 10, email 100, address 200, city 50, pincode 6, username 50, and password 20 characters. The Admin User Access form displays counters for these fields, while the server rejects values over the limit even when the UI is bypassed. Gender is checked against the allowed `M`/`F` values, and state is submitted as a selected state id rather than free text.

`isValidPhone` implements the optional blank behavior and `/^\d{10}$/`. There is no server-side character-set, email, city, state, or address content validation in this action. Client `inputMode` is only a keyboard hint. Malformed runtime payload shapes return a safe invalid-input error before string operations.

The action first loads the account selecting only `empId`. If absent, it returns `Account not found.` It builds employee data with names, nullable personal fields, `updatedDate = now`, and `updatedBy = userId`.

Within one Prisma transaction:

- an existing `empId` causes the linked `AddEmployee` row to be updated;
- a null `empId` causes a new `AddEmployee` row to be created with `createdDate = now` and `createdBy = userId`, followed by updating `UserTable.empId`;
- `UserTable.displayName` becomes the submitted trimmed first/last names;
- `UserTable.updatedDate` and `updatedBy` are updated.

When updating an existing employee, the transaction checks whether another `UserTable` row references the same employee id. If so, the update is rejected with `This employee record is linked to another user account.` The Prisma schema also marks `UserTable.empId` unique, providing database-level one-account-per-employee enforcement when the schema constraint is applied.

Any transaction/database exception returns `Could not update your profile. Please try again.`

## 8. Change-password UI

The security section has HTML id `security`, which is the target of `/profile#security`.

It displays the policy text requiring at least 8 characters with uppercase, lowercase, a number, and a special character.

Controls:

- Current password, `autocomplete="current-password"`;
- New password, `autocomplete="new-password"`;
- Confirm new password, `autocomplete="new-password"`;
- one type-button eye control per field;
- `Update Password` submit button.

Each eye control toggles only its own field between password and text type and exposes an accessible `aria-label`. The controls are `type="button"` and do not submit the form.

Submission prevents default behavior, clears the previous security message, and calls `changeMyPassword` in `startTransition`. While pending, all password fields and the submit button are disabled and the button reads `Updating...`.

On failure, the form remains visible and shows a red alert. On success, it shows `Password updated. Redirecting you to sign in again...` and then calls `signOut({ callbackUrl: '/login' })`.

## 9. Server-side password change

`changeMyPassword` resolves the target account exclusively from the authenticated session id. Processing order:

1. Validate the positive integer session user id.
2. Require all three password values.
3. Require exact equality between new password and confirmation.
4. Reject a new password exactly equal to the submitted current-password text.
5. Apply the password policy.
6. Load only the current user's `passwordHash`.
7. Return an unavailable message if the account/hash is missing.
8. Verify the current password with `bcrypt.compare`.
9. Hash the new password with `bcrypt.hash(..., 12)`.
10. Update only that user's `passwordHash`, `updatedDate`, and `updatedBy`.
11. Revalidate `/profile` and return success.

Failures return, respectively: `Your session has expired. Please sign in again.`, `All password fields are required.`, `New password and confirmation do not match.`, `New password must be different from your current password.`, the first policy error, `Password change is unavailable for this account.`, `Current password is incorrect.`, or `Could not update your password. Please try again.`

The action does not modify username, role, status, email, employee data, login time, or logout time. It does not write password history or a password-changed timestamp.

## 10. Password policy

The new password must pass these checks in order:

1. at least 8 characters;
2. one uppercase ASCII letter `[A-Z]`;
3. one lowercase ASCII letter `[a-z]`;
4. one digit `\d`;
5. one character matching `[^A-Za-z0-9]`.

The shared policy enforces a maximum length of 20 for the new password; the current and confirmation values are also capped at 20 by the server and UI. There is no username-similarity check or password-history check. Reuse prevention only compares the new value with the submitted current-password text before database verification.

## 11. Authentication and session integration

NextAuth uses the Credentials provider and JWT sessions. Login requires nonempty string username/password, finds the user by `userName`, requires a non-null `passwordHash`, requires status exactly `Active`, compares with bcrypt, and updates `lastLoginTime` on success.

The JWT callback stores username and role name. The session callback exposes token subject as `session.user.id` and copies username and role name. The profile page/actions use the numeric form of that id.

After a successful profile password update, the client signs out. The NextAuth sign-out event updates `lastLogoutTime` when the token subject is a valid positive numeric id; database errors in this audit update are caught and ignored so sign-out still completes.

Because the configured session strategy is JWT and no password-version/password-changed-time check exists in the auth callbacks, the verified behavior signs out the current browser only. The code does not revoke JWTs already issued to other devices.

## 12. Authorization boundaries

The profile page and profile actions require an authenticated session but no profile-specific access-function permission. The actions use the session identity and cannot be redirected to another user through form input.

The dashboard layout separately loads the current user's active status, role, and access functions to filter other navigation routes. That filtering does not gate the profile menu or profile page.

## 13. Database ownership

Prisma maps `UserTable` to `user_table`, `AddEmployee` to `add_employee`, and `ForgotPassword` to `forgot_password`. `UserTable.employee` relates `empId` to `AddEmployee.empId`.

`UserTable.passwordHash` maps to `password_hash` and is nullable. The profile display query excludes it; the password action selects it only for the authenticated user.

`ForgotPassword` contains verification code, email address, active flag, and audit fields in the schema, but no profile query/action or reset UI uses it. No forgot-password workflow is implemented here.

## 14. Profile loading errors

`app/(dashboard)/profile/error.tsx` provides the route-level error UI for profile rendering/query failures. It displays `Unable to load your profile`, asks the user to try again or sign in again, and exposes a `Try again` button that calls the Next.js route error reset function. The profile page still redirects to `/login` when the session/user cannot be resolved; the boundary covers unexpected rendering or data-loading exceptions.

## 15. Edge-case matrix

| Condition | Result |
|---|---|
| No dashboard session | Redirect to `/login`. |
| Invalid session user id on page | Redirect to `/login`. |
| No user row on page | Redirect to `/login`. |
| No user row during update | Return `Account not found.` |
| No linked employee | Display dashes; save creates and links employee. |
| Blank optional personal values | Store as null. |
| Invalid personal input | Return the corresponding validation message; remain in edit mode. |
| Personal transaction exception | Generic profile error; remain in edit mode. |
| Missing password | All-fields-required error. |
| Confirmation mismatch | Mismatch error. |
| New equals submitted current value | Different-password error before hash lookup. |
| Invalid password policy | First failed policy message. |
| Missing password hash | Password-change-unavailable error. |
| Wrong current password | Incorrect-current-password error. |
| Password update exception | Generic password update error. |
| Successful password update | Revalidate profile, show message, sign out to `/login`. |
| Outside click/Escape on menu | Close menu. |

## 16. Verified non-scope

The current code does not implement forgot-password request/reset, email delivery, reset-token expiry or rate limiting, email/username/role/status/permission editing from `/profile`, avatar upload, profile notifications, password history, global session revocation, profile-specific permissions, or profile search/filter/sort/pagination/listing/export.

## 17. Review record

Two code-review passes were completed for the Next.js implementation. The first pass inventoried and traced the route, client component, server actions, query, layout/menu, middleware, authentication, validation helper, Prisma schema, and login integration. The second pass re-read the implementation from the route outward and verified each visible control, state transition, selected field, validation branch, transaction branch, error message, navigation target, and session side effect. Statements in this SSOT are limited to behavior found in those files; rationale not expressed by code is not treated as an implemented rule.
