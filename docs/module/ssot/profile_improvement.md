# Profile Improvement / Gap Analysis
## Existing .NET vs current Next.js implementation

**Scope:** Profile settings and password behavior only  
**Existing source:** legacy `ExcelCars` ASP.NET MVC application and its verified legacy SSOT  
**Current source:** `ExcelCarsNextJs` implementation and its verified Next.js profile SSOT  
**Status:** Analysis only; no improvements are implemented by this document.

## 1. Executive comparison

The legacy .NET application has no implemented `/profile` page, profile settings form, self-service password change, or password-reset workflow. Its authenticated navigation contains a dead `Change Password` anchor, and its session-expiry overlay contains a dead `Forgot Password` anchor.

The Next.js application adds a functional `/profile` page with:

- account and personal-information display;
- editable first name, last name, gender, mobile, phone, address, city, state, and pincode;
- transactional employee/user updates;
- current-password verification;
- bcrypt password hashing;
- password confirmation and policy validation;
- current-browser sign-out after password change;
- Profile and Change Password navigation from two profile menus.

Therefore, most visible profile functionality is Next.js-only enhancement rather than missing parity. The improvement items below identify verified differences that require a product, security, or implementation decision—not assumed requirements.

## 2. Source evidence reviewed

### Legacy .NET

- `C:\KhizarShaikh\Project\ExcelCarsNextJs\docs\module\existing_ssot\Profile setting and password .md`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Shared\Menu.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Shared\_Layout.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Controllers\HomeController.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Home\User.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Helper\AppHelper.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\SessionInfo.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\UserAccessManagement\UserAccess.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApData\Excel_Cars_Database.edmx`
- `C:\KhizarShaikh\Project\ExcelCars\db\excelCarsFinal.sql`

### Next.js

- `C:\KhizarShaikh\Project\ExcelCarsNextJs\docs\module\ssot\profile.md`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\profile\page.tsx`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\app\(dashboard)\layout.tsx`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\profile\ProfileClient.tsx`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\profile\queries.ts`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\features\profile\actions.ts`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\components\Layout.tsx`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\auth.ts`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\auth.config.ts`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\middleware.ts`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\lib\validation.ts`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\src\lib\access\accessControl.ts`
- `C:\KhizarShaikh\Project\ExcelCarsNextJs\prisma\schema.prisma`

## 3. Capability comparison

| Capability | Existing .NET behavior | Current Next.js behavior | Gap status |
|---|---|---|---|
| Profile route | No `/profile` route or profile controller/view | `/profile` server page exists | Next.js enhancement; no porting gap |
| Profile navigation | No Profile link; dead `Change Password` anchor | Profile menu in sidebar and header links to `/profile` and `/profile#security` | Implemented in Next.js |
| Account display | Only welcome display name in shared menu | Username, email fallback, role, status, last login, account-created date, and identity card | Implemented enhancement |
| Personal display | Employee fields available only through admin User Access | Personal fields displayed on profile | Implemented enhancement |
| Personal self-edit | Not implemented | Selected employee fields can be edited by current authenticated user | Implemented enhancement |
| Password change | Not implemented | Current/new/confirm form with server action | Implemented enhancement |
| Password hashing | Plaintext `User_Table.Password` comparison | bcrypt `passwordHash`, cost 12 for profile change | Credential migration decision remains |
| Password reset | `Forgot_Password` table exists but no consumer/UI/workflow | Prisma model exists but no consumer/UI/workflow | Missing in both systems |
| Session after password change | No password-change flow | Current browser signs out to `/login` | Implemented Next.js behavior; global revocation absent |
| Logout audit | Legacy logout does not update `Last_Logout_Time` | NextAuth sign-out event attempts update | Next.js enhancement |
| Permissions | No profile-specific permission exists | Profile page/actions require authentication, not a profile access function | No verified legacy parity gap |
| Profile search/listing/filter/sort/pagination | None | None | No missing parity functionality |
| Profile export/calculation | None | None | No missing parity functionality |

## 4. Improvement items

### GAP-01 — Legacy plaintext-password credential migration

**Feature / business logic:** Migrate legacy credentials into the Next.js `passwordHash` authentication contract.

**Existing system behavior:** The .NET login reads `User_Table.User_Name`, compares the submitted password directly to `User_Table.Password`, and accepts only `Status == "Active"`. User Access creates a new account with a generated username and sets the initial plaintext password equal to that username.

**Current Next.js status:** `auth.ts` requires a non-null `passwordHash` and uses `bcrypt.compare`. A row with only the legacy plaintext password cannot authenticate through the current Next.js Credentials provider.

**Missing functionality or logic:** No verified bridge exists for existing legacy accounts whose credentials are stored in the old `Password` column. No first-login conversion, forced reset, migration script, or explicit “legacy credential unavailable” handling was found in the profile/auth code.

**Required improvement:** Define and implement one approved migration path. The safe options are a controlled forced-password-reset flow or a one-time server-side conversion process that never exposes or persists legacy plaintext credentials in the new hash field. Include handling for active, inactive, null-password, and duplicate/invalid legacy accounts.

**Relevant locations:** Legacy `ApModel/Model/Home/User.cs`, legacy `User_Table` schema in `db/excelCarsFinal.sql`; Next `auth.ts`, `prisma/schema.prisma` `UserTable.passwordHash`.

**Priority / impact:** P0 / authentication cutover blocker and high security impact.

### GAP-02 — Forgot-password/reset workflow

**Feature / business logic:** Complete password recovery for users who cannot provide their current password.

**Existing system behavior:** The .NET session-expiry overlay renders `Forgot Password` as an anchor without a destination or handler. The legacy database has `Forgot_Password` with verification code, email address, active flag, and audit fields, but no application code consumes it.

**Current Next.js status:** The Prisma schema maps `ForgotPassword`, but no profile action, route, email sender invocation, token validation, reset page, expiry rule, or one-time-use rule uses it.

**Missing functionality or logic:** There is no request-reset screen, identity/email verification, reset-token generation, token expiry, token invalidation, password update from a reset token, rate limiting, or reset audit behavior.

**Required improvement:** Decide whether password reset is in scope. If approved, implement a dedicated reset-token model/workflow with cryptographically random one-time tokens, expiry, safe account enumeration behavior, rate limiting, email delivery, audit timestamps, and bcrypt hashing. Do not treat the existing legacy table fields as a sufficient security design without verifying their use and constraints.

**Relevant locations:** Legacy `Views/Shared/_Layout.cshtml`, legacy SQL `Forgot_Password`; Next `prisma/schema.prisma`, `src/lib/email/sendMail.ts`.

**Priority / impact:** P1 / user-recovery and operational impact.

### GAP-03 — Active-status enforcement for an already-issued session

**Feature / business logic:** Prevent an inactive account from continuing to use an existing JWT session.

**Existing system behavior:** Legacy login requires `Status == "Active"`; the legacy session is created after successful login. Session-expiry behavior checks session/authentication state.

**Current Next.js status:** Initial login rejects non-`Active` users. However, middleware checks whether a JWT session exists, and `/profile` checks that the user exists but does not check `status`. `updateMyProfile` and `changeMyPassword` validate the session id and account/hash but do not independently reject an inactive user.

**Missing functionality or logic:** No verified per-request status check in the profile page/actions or JWT callback prevents a user whose status changes to inactive after login from viewing or mutating profile data until the JWT/session is otherwise invalid.

**Required improvement:** Decide whether active status must be rechecked for every profile read/write. If yes, add a shared authenticated-user guard that requires an existing active account and use it in the profile page and both profile actions; ensure inactive users are redirected or receive a safe error and that any relevant session is invalidated.

**Relevant locations:** Next `app/(dashboard)/profile/page.tsx`, `src/features/profile/actions.ts`, `auth.ts`, `src/lib/access/accessControl.ts`.

**Priority / impact:** P1 / authorization and account-deactivation impact.

### GAP-04 — Runtime validation of server-action inputs

**Feature / business logic:** Reject malformed or hostile runtime action payloads safely.

**Existing system behavior:** Legacy MVC model binding supplies typed view models, while many legacy business validations are client-side and bypassable. No legacy self-service profile action exists.

**Current Next.js status:** TypeScript interfaces describe `UpdateMyProfileInput` and `ChangePasswordInput`, but server actions do not perform a runtime schema parse. `updateMyProfile` calls `.trim()` on several fields before entering its `try` block; malformed non-string runtime values can throw instead of returning the documented user-safe error.

**Missing functionality or logic:** No runtime type/shape validation, maximum lengths, or controlled handling of malformed server-action arguments exists for all profile fields.

**Required improvement:** Add a server-side runtime schema for both actions. Validate object shape, string types, maximum lengths, allowed gender values, numeric-string formats, and password input sizes before calling string methods or database operations. Preserve safe generic errors for unexpected values.

**Relevant locations:** Next `src/features/profile/actions.ts`, `src/lib/validation.ts`.

**Priority / impact:** P1 / reliability and security hardening.

### GAP-05 — Explicit maximum-length and input constraints for profile fields

**Feature / business logic:** Define safe limits for profile text and password inputs.

**Existing system behavior:** Legacy login inputs have browser maximum length 20; legacy employee fields have various view-level limits/keyboard restrictions in User Access. Those limits are not equivalent to a profile contract.

**Current Next.js status:** The profile inputs do not define visible maximum lengths in `ProfileClient`. The server action has no maximum lengths for names, address, city, state, mobile, phone, pincode, or passwords.

**Missing functionality or logic:** The database/application contract does not document or enforce maximum input lengths for profile submissions. The password action has no maximum length.

**Required improvement:** Obtain approved field limits from the target schema/product requirements, enforce them server-side, and mirror them in the UI. Avoid introducing limits by inference from legacy database types alone.

**Relevant locations:** Next `ProfileClient.tsx`, `actions.ts`, `prisma/schema.prisma`.

**Priority / impact:** P1 / data quality and abuse-resistance impact.

### GAP-06 — Password policy parity and product rule decision

**Feature / business logic:** Define the supported password rules consistently across account provisioning, profile change, and recovery.

**Existing system behavior:** Legacy login has no password-strength, reuse, expiry, retry, or MFA rule. New legacy accounts receive a generated username as their initial password.

**Current Next.js status:** Profile password change requires minimum 8 characters, uppercase, lowercase, number, and special character. Next User Access uses a different rule in its own code: 8–100 characters with at least one letter and one number.

**Missing functionality or logic:** Password rules are not uniform across Next.js account creation/admin update and self-service profile change. The code does not define password expiry, history, retry lockout, or MFA.

**Required improvement:** Approve one password policy and apply it consistently to admin provisioning, self-service change, and reset. Decide explicitly whether password history, expiry, lockout, or MFA are required; do not infer them from the legacy system because they are absent there.

**Relevant locations:** Next `src/features/profile/actions.ts`, `src/features/useraccess/actions.ts`, `src/features/useraccess/UserAccessClient.tsx`.

**Priority / impact:** P1 / security and user-experience impact.

### GAP-07 — Global session invalidation after password change

**Feature / business logic:** Revoke sessions on other devices after a password change.

**Existing system behavior:** The legacy system has no self-service password change, so no verified invalidation behavior exists.

**Current Next.js status:** The profile client signs out the current browser. NextAuth uses JWT sessions, and the reviewed callbacks do not compare a password-version or password-changed timestamp against the token.

**Missing functionality or logic:** Existing JWTs on other browsers/devices remain valid according to the reviewed code.

**Required improvement:** Decide whether a password change should invalidate all sessions. If approved, add a persisted password-change version/timestamp and enforce it in JWT/session validation, or use a server-side session strategy with revocation.

**Relevant locations:** Next `src/features/profile/ProfileClient.tsx`, `src/features/profile/actions.ts`, `auth.ts`, `auth.config.ts`, `prisma/schema.prisma`.

**Priority / impact:** P1 / account security impact.

### GAP-08 — Profile-specific authorization decision

**Feature / business logic:** Define whether profile access/change requires a dedicated permission.

**Existing system behavior:** No profile permission or profile endpoint exists. Legacy shared navigation visibility is based on authentication/session presence.

**Current Next.js status:** Profile route and actions require authentication but do not require an access-function name. The dashboard access profile is used to filter other navigation only.

**Missing functionality or logic:** There is no separate permission to disable profile access or password change for a role. This may be intentional, but the decision is not represented as a profile permission contract.

**Required improvement:** Confirm that every authenticated active user may view/edit their own profile and change their own password. If not, add separate function names and enforce them server-side, not only by hiding navigation.

**Relevant locations:** Next `app/(dashboard)/profile/page.tsx`, `src/features/profile/actions.ts`, `src/lib/access/accessControl.ts`, `src/lib/access/accessCatalog.ts`.

**Priority / impact:** P1 / authorization clarity.

### GAP-09 — Shared employee-record ownership guard

**Feature / business logic:** Ensure a profile update cannot unintentionally modify an employee record shared by multiple accounts.

**Existing system behavior:** Legacy `User_Table.Emp_ID` links accounts to `Add_Employee`; User Access updates the linked employee record. The reviewed legacy profile scope has no self-service update.

**Current Next.js status:** `updateMyProfile` updates the `AddEmployee` row referenced by the current user's `empId`. The schema exposes `AddEmployee.userAccounts` as a collection, and no action-level check verifies that the employee is linked only to the current account.

**Missing functionality or logic:** No verified ownership/cardinality guard exists before changing shared employee data.

**Required improvement:** Confirm the intended relationship cardinality. If employee data is user-specific, enforce one-to-one ownership or reject/update only fields approved for shared records. If sharing is intentional, document the cross-account side effect and audit it.

**Relevant locations:** Next `src/features/profile/actions.ts`, `prisma/schema.prisma` relations `UserTable.employee` and `AddEmployee.userAccounts`.

**Priority / impact:** P1 / data-integrity and privacy impact.

### GAP-10 — Database/query failure UX for profile page

**Feature / business logic:** Provide controlled behavior when the profile read fails due to a database or infrastructure error.

**Existing system behavior:** Legacy controller/model paths generally catch and log exceptions, returning redirects or generic messages depending on the action. No legacy profile page exists.

**Current Next.js status:** `getCurrentUserProfile` performs the Prisma query without a local catch or explicit error result. The page redirects only when the result is null; a thrown query error follows framework error handling rather than a profile-specific user-safe state.

**Missing functionality or logic:** No verified profile loading error boundary, retry state, or user-facing failure contract exists in the profile module.

**Required improvement:** Add an appropriate route error boundary or controlled query error handling with logging and a safe retry/sign-in path. Keep database details out of the user-facing message.

**Relevant locations:** Next `app/(dashboard)/profile/page.tsx`, `src/features/profile/queries.ts`, route error boundary conventions.

**Priority / impact:** P2 / operational usability.

### GAP-11 — Audit event completeness for profile changes

**Feature / business logic:** Record auditable profile and password-change events.

**Existing system behavior:** Legacy login updates last login; account administration updates created/updated audit fields. No password-change or reset audit event exists.

**Current Next.js status:** Profile updates set `updatedDate`/`updatedBy` on user and employee rows. Password change sets user update audit fields. No dedicated password-change event, actor, source, or outcome record is written.

**Missing functionality or logic:** There is no event history for successful/failed password changes, profile edits, reset requests, or security-sensitive outcomes.

**Required improvement:** Decide required audit detail. If approved, add security-event persistence for successful changes and carefully designed failure/rate-limit events without storing passwords or sensitive payloads.

**Relevant locations:** Next `src/features/profile/actions.ts`, `auth.ts`, existing audit/event models and exception logging infrastructure.

**Priority / impact:** P2 / compliance and incident-response impact.

### GAP-12 — Stale client state after concurrent/profile updates

**Feature / business logic:** Keep the displayed profile consistent with database state after updates from another session or process.

**Existing system behavior:** Legacy pages are server-rendered after requests and generally reload data on the next action.

**Current Next.js status:** After a successful personal update, `ProfileClient` updates local state from submitted form values and closes edit mode. It does not refetch the saved row in the client. The server calls `revalidatePath('/profile')` for subsequent server rendering.

**Missing functionality or logic:** No concurrency check or post-save refetch is present. A database-side normalization/change or concurrent update may not be reflected until a refresh/navigation.

**Required improvement:** Decide whether optimistic local update is sufficient. If not, return/refetch the canonical saved profile, add optimistic concurrency fields, or document last-write-wins behavior.

**Relevant locations:** Next `src/features/profile/ProfileClient.tsx`, `src/features/profile/actions.ts`.

**Priority / impact:** P2 / data consistency.

## 5. Differences that are not missing functionality

These are verified differences but should not be copied as gaps without an explicit requirement:

- Next.js uses bcrypt hashes while legacy .NET uses plaintext passwords; the target should retain the secure Next.js direction.
- Next.js does not place a password in the session object; legacy .NET did. This is a security improvement.
- Next.js adds account/personal display and self-editing that the legacy application never implemented.
- Next.js updates `lastLogoutTime` through the NextAuth sign-out event; legacy logout did not reliably update it.
- Next.js supports an employee record with null `empId` by creating and linking one during profile save; no equivalent legacy self-service behavior exists.
- Next.js uses a browser locale `en-IN` for dates; the legacy profile module had no date display contract.
- Neither system implements profile search, filters, sorting, pagination, listings, exports, or profile calculations.

## 6. Implementation order recommendation

1. Resolve legacy credential migration and password reset decisions (GAP-01, GAP-02).
2. Add active-status and runtime input guards (GAP-03, GAP-04).
3. Approve and unify password policy and session revocation requirements (GAP-06, GAP-07).
4. Confirm profile authorization and employee-record ownership rules (GAP-08, GAP-09).
5. Add controlled read failures and required audit events (GAP-10, GAP-11).
6. Decide on field limits and canonical post-save/concurrency behavior (GAP-05, GAP-12).

## 7. Review record

Two comparison passes were completed. The first pass compared the legacy .NET profile/password SSOT and source evidence with the Next.js profile SSOT and all profile-related route, UI, action, query, authentication, access-control, validation, and Prisma files. The second pass rechecked each legacy and Next.js page/link/button/action, database field, validation branch, permission boundary, authentication/session transition, error path, and non-scope item. No legacy profile search, listing, filter, sort, pagination, export, calculation, or self-service password workflow was invented; where both systems lack a behavior, it is recorded as parity rather than a missing legacy feature.
