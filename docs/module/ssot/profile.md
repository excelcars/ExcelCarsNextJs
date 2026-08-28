# SSOT - User Profile
## Status: Next.js implemented; current-state behavior documented

This document describes the authenticated self-service profile page implemented in the Next.js application.

## 1. Purpose And Scope

The User Profile page allows an authenticated Excel Cars user to view account and personal information and change their own password.

The current page supports:

- viewing account information
- viewing linked employee/personal information
- changing the authenticated user's password
- current-password verification
- new-password policy validation
- new-password confirmation validation
- success and failure messages
- signing out the current session after a successful password change

Profile details are currently read-only. Role, username, status, permissions, and other account-administration fields remain managed through User Access by authorized administrators.

## 2. Source Evidence

- `app/(dashboard)/profile/page.tsx`
- `src/features/profile/ProfileClient.tsx`
- `src/features/profile/queries.ts`
- `src/features/profile/actions.ts`
- `src/components/Layout.tsx`
- `prisma/schema.prisma`
- `auth.ts`
- `auth.config.ts`

## 3. Navigation And Route

| Path | Behavior |
|---|---|
| `/profile` | Authenticated dashboard profile page. |
| `/profile#security` | Opens the profile page at the security section when supported by the browser. |

The profile menu is available from both the bottom sidebar user block and the top-right header avatar/name. Both menus expose `Profile`, `Change Password`, and `Sign Out`. The hamburger/logo area remains navigation-only.

The profile route is protected by the shared dashboard layout and independently redirects to `/login` when the authenticated user cannot be resolved.

## 4. Profile Data Sources

The page reads the current user from Prisma model `UserTable`, mapped to `user_table`, using the authenticated session's numeric user ID.

Account fields:

- `userName`
- `displayName`
- `emailId`
- `roleName`
- `status`
- `lastLoginTime`
- `createdDate`

Personal fields are read from the related Prisma model `AddEmployee`, mapped to `add_employee`, through `UserTable.empId`:

- `empFirstName`
- `empLastName`
- `empGender`
- `empMobileNo`
- `empPhoneNo`
- `empEmailId`
- `empAddress`
- `empCity`
- `empStateLegacy`
- `empPincode`

If no employee record is linked, missing personal values display as `—`. The password hash is never selected for the profile display query.

## 5. Page Layout

The page uses the application's existing custom Tailwind/Lucide visual system:

- page heading: `My Profile`
- account-information card
- personal-information card
- security card with the `Change password` form
- Excel Cars navy/red accents and bordered white cards

The password fields have independent eye controls to show or hide the current password, new password, and confirmation value. The controls include accessible labels.

## 6. Change Password Behavior

The password action is `changeMyPassword` in `src/features/profile/actions.ts` and runs as a server action.

The action:

1. Reads the authenticated session using `auth()`.
2. Resolves the current user's `userId`.
3. Requires all three password fields.
4. Requires the new password and confirmation to match.
5. Rejects a new password equal to the current password.
6. Validates the new password policy.
7. Loads only the current user's `passwordHash`.
8. Verifies the current password using bcrypt.
9. Hashes the new password using bcrypt with cost factor 12.
10. Updates `passwordHash`, `updatedDate`, and `updatedBy` for that user only.
11. Revalidates `/profile`.

The current password is never logged, returned, or stored in plaintext.

## 7. Password Policy And Messages

The currently implemented policy requires the new password to:

- contain at least 8 characters
- contain an uppercase letter
- contain a lowercase letter
- contain a number
- contain a special character

The server returns user-safe messages for missing fields, mismatched confirmation, reuse of the current password, policy failures, incorrect current password, expired sessions, unavailable password changes, and unexpected update failures.

The client displays the result in an accessible alert region. While the action is pending, password inputs are disabled and the submit button shows `Updating...`.

## 8. Session Handling

The application currently uses NextAuth JWT sessions. After a successful password update, the client calls `signOut({ callbackUrl: '/login' })`, requiring the user to authenticate again with the new password.

This implementation signs out the current browser session. It does not yet invalidate JWTs issued to other devices or browsers. Global session invalidation would require a password-version or password-changed timestamp check in the JWT/session authentication flow.

## 9. Deliberate Non-Scope

The current profile page does not allow users to:

- change username
- change role or permissions
- change account status
- edit personal information
- upload an avatar
- manage active sessions on other devices
- view or edit the password hash

These features require separate authorization, validation, or session-design decisions.
