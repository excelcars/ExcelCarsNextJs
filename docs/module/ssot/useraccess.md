# SSOT - User Access Management

## Status: Next.js implemented; current-state behavior documented

**Route:** `/config/user-access`

## Scope and evidence

User Access manages employee-backed login accounts and assigns each account one role. It does not define the permissions granted by a role; that belongs to Role Access.

Related module: [Profile SSOT](profile.md). The Profile module is the self-service surface for the same authenticated user's account and linked employee record. Shared field limits and password validation are defined in `src/lib/profileValidation.ts`; User Access applies them to administrator-created and administrator-edited accounts.

Evidence: `app/(dashboard)/config/user-access/page.tsx`, `src/features/useraccess/UserAccessClient.tsx`, `actions.ts`, `queries.ts`, `permissions.ts`, `src/lib/access/accessControl.ts`, and `prisma/schema.prisma`.

## Authorization and hierarchy

Opening the route and every mutation require an active user with `User_Access_Management`. Role IDs are hierarchical: smaller IDs are more privileged. An operator can assign only a role ID greater than their own and can only edit or deactivate another user with a greater role ID. Self-management through this screen is rejected.

## Data and listing

An account is `UserTable`; its employee profile is `AddEmployee`, joined by `empId`. Roles come from `RoleMaster`; optional state comes from `IndianStatesMaster`.

The listing is paginated at 25 rows and filters by free-text search, status, role, and state. Search checks account username/email/display name, employee name/contact/city, and role name. It includes active and inactive accounts.

## Create and update

Create is transactional: it creates the employee then the account. Required fields are first name, last name, gender (`M`/`F`), ten-digit mobile, valid email, role, username, and a password of 8-20 characters containing uppercase, lowercase, a number, and a special character. Server-side maximum lengths are first/last name 50, mobile 10, phone 10, email 100, address 200, city 50, pincode 6, username 50, and password 20. Username must use letters, digits, dot, underscore, or hyphen and must be unique. Passwords are bcrypt-hashed.

Update validates the same contact, field-length, password, and role rules. Username is retained; a blank password preserves the password, while a supplied valid password is re-hashed. The operator may set the account status. Both account and employee edits are audited with the acting user and timestamp.

## Deactivation and errors

Deactivation is a soft delete: it sets account status to `Inactive`; it does not delete the account or employee. Server-side failures log a unique reference id and return that reference to the operator. Successful changes revalidate `/config/user-access`.

## SSOT rule

Update this file for changes to account fields, password policy, role hierarchy, authorization, search filters, or lifecycle behavior.
